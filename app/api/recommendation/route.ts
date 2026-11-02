import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { scoreRisk } from "@/lib/investment/riskScoring";
import {
  getAllocation,
  applyInstrumentPreference,
  isInstrumentCategory,
} from "@/lib/investment/allocation";
import {
  aggregateGoals,
  computeMultiGoalContribution,
  type PerGoalContribution,
} from "@/lib/investment/multiGoal";
import type { AllocationSlice, InvestmentProjection, GoalInput } from "@/types/finance";
import { getCurrentUserId } from "@/lib/auth/session";
import { trackEvent } from "@/lib/analytics/track";
import { isPro } from "@/lib/billing/plan";

export const runtime = "nodejs";

interface RecommendationBody {
  goalId?: unknown;
  // Multi-tujuan: daftar tujuan terpilih. Bila ada (non-kosong), menggantikan
  // pasangan tunggal targetAmount/horizonMonths.
  goals?: unknown;
  targetAmount?: unknown;
  horizonMonths?: unknown;
  riskAnswers?: unknown;
  selectedInstruments?: unknown;
  currentSavings?: unknown;
}

/**
 * Menormalkan `body.goals` menjadi GoalInput[] valid, atau null bila tidak
 * dikirim / tidak berbentuk array. Setiap elemen wajib punya targetAmount > 0
 * dan horizonMonths bilangan bulat > 0; elemen tak valid membuat seluruh
 * normalisasi gagal (dikembalikan sebagai pesan error).
 */
function normalizeGoals(
  raw: unknown,
): { goals: GoalInput[] } | { error: string } | null {
  if (raw === undefined || raw === null) return null;
  if (!Array.isArray(raw)) {
    return { error: "Daftar tujuan harus berupa array." };
  }
  if (raw.length === 0) return null;

  const goals: GoalInput[] = [];
  for (const item of raw) {
    if (typeof item !== "object" || item === null) {
      return { error: "Setiap tujuan harus berupa objek." };
    }
    const g = item as Record<string, unknown>;
    const targetAmount = g.targetAmount;
    const horizonMonths = g.horizonMonths;
    if (typeof targetAmount !== "number" || !Number.isFinite(targetAmount) || targetAmount <= 0) {
      return { error: "Target dana tiap tujuan harus angka lebih besar dari 0." };
    }
    if (
      typeof horizonMonths !== "number" ||
      !Number.isFinite(horizonMonths) ||
      horizonMonths <= 0 ||
      !Number.isInteger(horizonMonths)
    ) {
      return { error: "Jangka waktu tiap tujuan harus bilangan bulat lebih besar dari 0." };
    }
    goals.push({
      id: typeof g.id === "string" ? g.id : undefined,
      name: typeof g.name === "string" ? g.name : null,
      targetAmount,
      horizonMonths,
    });
  }
  return { goals };
}

/**
 * POST /api/recommendation — gabungkan mesin investasi lalu simpan hasil.
 *
 * Alur:
 *   1. Validasi input (targetAmount > 0, horizonMonths > 0 integer,
 *      currentSavings >= 0, riskAnswers array angka non-kosong). Invalid → 400.
 *   2. scoreRisk(riskAnswers) → { score, profile }
 *   3. getAllocation(horizonMonths, profile) → { composition, annualReturn }
 *   4. calculateMonthlyContribution({ futureValue, presentValue, annualReturn, horizonMonths })
 *   5. Persist RiskAssessment + InvestmentRecommendation.
 *   6. Sukses → 200 { riskProfile, composition, annualReturn, monthlyContribution }.
 *
 * Error mesin alokasi (input tidak valid) → 400; error DB → 500 (pesan ramah).
 *
 * Requirements: 3.4, 4.1, 5.1, 5.5, 7.1, 7.3
 */
export async function POST(req: Request) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Silakan login terlebih dahulu." }, { status: 401 });
  }

  let body: RecommendationBody;
  try {
    body = (await req.json()) as RecommendationBody;
  } catch {
    return NextResponse.json({ error: "Permintaan tidak valid." }, { status: 400 });
  }

  const {
    goalId,
    goals: rawGoals,
    targetAmount,
    horizonMonths,
    riskAnswers,
    selectedInstruments,
    currentSavings,
  } = body ?? {};

  // 1. Tentukan daftar tujuan. Prioritaskan `goals` (multi-tujuan); bila tidak
  //    dikirim, pakai pasangan tunggal targetAmount/horizonMonths (legacy).
  const normalized = normalizeGoals(rawGoals);
  if (normalized && "error" in normalized) {
    return NextResponse.json({ error: normalized.error }, { status: 400 });
  }

  let goalList: GoalInput[];
  if (normalized) {
    goalList = normalized.goals;
  } else {
    // Mode tunggal (legacy): validasi targetAmount & horizonMonths.
    if (typeof targetAmount !== "number" || !Number.isFinite(targetAmount) || targetAmount <= 0) {
      return NextResponse.json(
        { error: "Target dana harus berupa angka lebih besar dari 0." },
        { status: 400 },
      );
    }
    if (
      typeof horizonMonths !== "number" ||
      !Number.isFinite(horizonMonths) ||
      horizonMonths <= 0 ||
      !Number.isInteger(horizonMonths)
    ) {
      return NextResponse.json(
        { error: "Jangka waktu (bulan) harus berupa bilangan bulat lebih besar dari 0." },
        { status: 400 },
      );
    }
    goalList = [
      {
        id: typeof goalId === "string" ? goalId : undefined,
        targetAmount,
        horizonMonths,
      },
    ];
  }

  if (typeof currentSavings !== "number" || !Number.isFinite(currentSavings) || currentSavings < 0) {
    return NextResponse.json(
      { error: "Tabungan saat ini harus berupa angka yang tidak negatif." },
      { status: 400 },
    );
  }

  if (
    !Array.isArray(riskAnswers) ||
    riskAnswers.length === 0 ||
    !riskAnswers.every((a) => typeof a === "number" && Number.isFinite(a) && a >= 0)
  ) {
    return NextResponse.json(
      { error: "Jawaban survei risiko harus berupa daftar angka yang tidak kosong." },
      { status: 400 },
    );
  }

  // selectedInstruments opsional: bila dikirim wajib array string kategori valid.
  // Nilai tak dikenal diabaikan di engine; di sini kita hanya menolak tipe yang
  // jelas salah (bukan array) agar kontrak klien tegas.
  if (
    selectedInstruments !== undefined &&
    selectedInstruments !== null &&
    !Array.isArray(selectedInstruments)
  ) {
    return NextResponse.json(
      { error: "Pilihan instrumen harus berupa daftar." },
      { status: 400 },
    );
  }

  const answers = riskAnswers as number[];
  const chosenInstruments = Array.isArray(selectedInstruments)
    ? (selectedInstruments.filter(isInstrumentCategory) as string[])
    : [];
  const goalIdValue = typeof goalId === "string" ? goalId : null;

  // 2–4. Mesin investasi (pure functions). Error input → 400.
  //
  // SATU ALOKASI untuk semua tujuan: bucket alokasi ditentukan dari horizon
  // rata-rata tertimbang (opsi A). Setoran bulanan dihitung PER-TUJUAN lalu
  // dijumlahkan (menghormati jangka waktu masing-masing).
  let profile: string;
  let score: number;
  let composition: AllocationSlice[];
  let annualReturn: number;
  let monthlyContribution: number;
  let projection: InvestmentProjection;
  let perGoal: PerGoalContribution[];
  let aggregatedTarget: number;
  let aggregatedHorizon: number;
  try {
    const risk = scoreRisk(answers);
    score = risk.score;
    profile = risk.profile;

    // Horizon tertimbang menentukan bucket alokasi tunggal.
    const aggregated = aggregateGoals(goalList);
    aggregatedTarget = aggregated.totalTargetAmount;
    aggregatedHorizon = aggregated.weightedHorizonMonths;

    const baseAllocation = getAllocation(aggregated.weightedHorizonMonths, risk.profile);
    // Terapkan preferensi instrumen pengguna (opsional). Kosong → sistem yang
    // menentukan (passthrough); ada pilihan → filter + normalisasi deterministik.
    const allocation = applyInstrumentPreference(baseAllocation, chosenInstruments);
    composition = allocation.composition;
    annualReturn = allocation.annualReturn;

    // Setoran per-tujuan + proyeksi agregat (opsi A).
    const multi = computeMultiGoalContribution({
      goals: goalList,
      presentValue: currentSavings,
      annualReturn: allocation.annualReturn,
      composition: allocation.composition,
    });
    monthlyContribution = multi.totalMonthlyContribution;
    projection = multi.projection;
    perGoal = multi.perGoal;
  } catch (err) {
    console.error("[recommendation] input mesin investasi tidak valid:", err);
    return NextResponse.json(
      { error: "Data untuk menghitung rekomendasi tidak valid." },
      { status: 400 },
    );
  }

  // 5. Persist RiskAssessment + InvestmentRecommendation. Error DB → 500.
  try {
    await prisma.riskAssessment.create({
      data: {
        userId,
        answers,
        score,
        profile,
      },
    });

    // goalId tersimpan hanya saat tepat satu tujuan direncanakan (agar tautan
    // per-tujuan tetap bermakna). Pada mode "pilih semua"/multi, goalId null.
    const persistedGoalId =
      goalList.length === 1 ? goalList[0].id ?? goalIdValue : null;

    await prisma.investmentRecommendation.create({
      data: {
        userId,
        goalId: persistedGoalId,
        riskProfile: profile,
        composition: composition as unknown as Prisma.InputJsonValue,
        annualReturn,
        monthlyContribution,
      },
    });
  } catch (err) {
    console.error("[recommendation] gagal menyimpan rekomendasi:", err);
    return NextResponse.json(
      { error: "Maaf, gagal menyimpan rekomendasi. Coba lagi sebentar." },
      { status: 500 },
    );
  }

  await trackEvent(userId, "recommendation_generated", {
    riskProfile: profile,
    annualReturn,
    monthlyContribution,
  });

  // Gating entitlement: proyeksi detail per-instrumen hanya untuk Pro. Free
  // tetap mendapat ringkasan proyeksi (FV, total disetor, pertumbuhan).
  const user = await prisma.user.findUnique({ where: { id: userId } });
  const pro = isPro(user?.plan);
  const gatedProjection: InvestmentProjection & { perInstrumentLocked?: boolean } = pro
    ? projection
    : { ...projection, perInstrument: [], perInstrumentLocked: true };

  // Breakdown per-tujuan (setoran bulanan masing-masing). Pembulatan Rupiah
  // di sini agar UI bisa langsung menampilkannya.
  const perGoalBreakdown = perGoal.map((p) => ({
    id: p.id ?? null,
    name: p.name ?? null,
    targetAmount: p.targetAmount,
    horizonMonths: p.horizonMonths,
    monthlyContribution: Math.round(p.monthlyContribution),
  }));

  // 6. Sukses. Field lama tetap ada (backward-compatible) + `projection` detail
  //    + info multi-tujuan (perGoal, totalTargetAmount, weightedHorizonMonths).
  return NextResponse.json(
    {
      riskProfile: profile,
      composition,
      annualReturn,
      monthlyContribution,
      projection: gatedProjection,
      plan: pro ? "pro" : "free",
      // Multi-tujuan:
      goalCount: goalList.length,
      totalTargetAmount: aggregatedTarget,
      weightedHorizonMonths: aggregatedHorizon,
      perGoal: perGoalBreakdown,
    },
    { status: 200 },
  );
}
