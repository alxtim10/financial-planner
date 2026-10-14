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
  calculateMonthlyContribution,
  projectInvestment,
} from "@/lib/investment/projection";
import type { AllocationSlice, InvestmentProjection } from "@/types/finance";
import { getCurrentUserId } from "@/lib/auth/session";
import { trackEvent } from "@/lib/analytics/track";

export const runtime = "nodejs";

interface RecommendationBody {
  goalId?: unknown;
  targetAmount?: unknown;
  horizonMonths?: unknown;
  riskAnswers?: unknown;
  selectedInstruments?: unknown;
  currentSavings?: unknown;
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
    targetAmount,
    horizonMonths,
    riskAnswers,
    selectedInstruments,
    currentSavings,
  } = body ?? {};

  // 1. Validasi input.
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
  let profile: string;
  let score: number;
  let composition: AllocationSlice[];
  let annualReturn: number;
  let monthlyContribution: number;
  let projection: InvestmentProjection;
  try {
    const risk = scoreRisk(answers);
    score = risk.score;
    profile = risk.profile;

    const baseAllocation = getAllocation(horizonMonths, risk.profile);
    // Terapkan preferensi instrumen pengguna (opsional). Kosong → sistem yang
    // menentukan (passthrough); ada pilihan → filter + normalisasi deterministik.
    const allocation = applyInstrumentPreference(baseAllocation, chosenInstruments);
    composition = allocation.composition;
    annualReturn = allocation.annualReturn;

    monthlyContribution = calculateMonthlyContribution({
      futureValue: targetAmount,
      presentValue: currentSavings,
      annualReturn: allocation.annualReturn,
      horizonMonths,
    });

    // Proyeksi detail (deterministik): FV, total modal disetor, pertumbuhan,
    // dan breakdown setoran + return per instrumen.
    projection = projectInvestment({
      presentValue: currentSavings,
      monthlyContribution,
      annualReturn: allocation.annualReturn,
      horizonMonths,
      composition: allocation.composition,
    });
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

    await prisma.investmentRecommendation.create({
      data: {
        userId,
        goalId: goalIdValue,
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

  // 6. Sukses. Field lama tetap ada (backward-compatible) + `projection` detail.
  return NextResponse.json(
    { riskProfile: profile, composition, annualReturn, monthlyContribution, projection },
    { status: 200 },
  );
}
