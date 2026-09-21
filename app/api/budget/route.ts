import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getLatestProfile } from "@/lib/profileGate";
import {
  computeBudget,
  computeBudgetFromPreset,
  savingsBucketAmount,
  evaluateShortfall,
} from "@/lib/planner/budget";
import { buildCustomPreset } from "@/lib/planner/presets";
import {
  monthsToReachTarget,
  requiredMonthlySaving,
} from "@/lib/planner/savingsProjection";
import type {
  CustomAllocation,
  PresetId,
  SavingsMode,
  SavingsProjection,
} from "@/types/planner";

export const runtime = "nodejs";

// Req 16.6: "custom" kini nilai presetId yang sah di samping tiga preset tetap.
const PRESET_IDS: readonly PresetId[] = ["50/30/20", "70/20/10", "80/20", "custom"];
const SAVINGS_MODES: readonly SavingsMode[] = ["terpisah", "kombinasi"];

interface BudgetBody {
  presetId?: unknown;
  baseAmount?: unknown;
  mode?: unknown;
  customAllocation?: unknown;
  savingsTargetAmount?: unknown;
  savingsHorizonYears?: unknown;
  includeSavings?: unknown;
  userId?: string | null;
}

/**
 * GET /api/budget — muat konteks awal Planner.
 *
 * Alur server:
 *   1. getLatestProfile() → defaultBaseAmount = income (atau null bila belum
 *      ada profil).
 *   2. Ambil BudgetPlan terbaru (orderBy createdAt desc) → latestPlan (atau null).
 *   3. Sukses → 200 { defaultBaseAmount, latestPlan }.
 *
 * Error DB → 500 (pesan ramah Bahasa Indonesia, tanpa detail internal).
 *
 * Requirements: 2.1, 7.3, 7.4
 */
export async function GET() {
  try {
    const profile = await getLatestProfile();
    const defaultBaseAmount = profile?.income ?? null;
    const currentSavings = profile?.currentSavings ?? null;

    const latestPlan = await prisma.budgetPlan.findFirst({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(
      { defaultBaseAmount, currentSavings, latestPlan },
      { status: 200 },
    );
  } catch (err) {
    console.error("[budget] gagal memuat konteks awal Planner:", err);
    return NextResponse.json(
      { error: "Maaf, gagal memuat data anggaran. Coba lagi sebentar." },
      { status: 500 },
    );
  }
}

/**
 * POST /api/budget — hitung + simpan rencana anggaran.
 *
 * Body: { presetId, baseAmount, mode, savingsTargetAmount?, savingsHorizonYears?, userId? }
 *
 * Validasi (→ 400):
 *   - presetId ∈ { "50/30/20", "70/20/10", "80/20" }.
 *   - baseAmount angka berhingga ≥ 0.
 *   - mode ∈ { "terpisah", "kombinasi" }.
 *
 * Alur server:
 *   1. computeBudget(baseAmount, presetId) → breakdown (error input → 400).
 *   2. savingsBucketAmount(breakdown) → jumlah Savings_Bucket.
 *   3. Mode kombinasi: tarik monthlyContribution dari InvestmentRecommendation
 *      terbaru (0 bila tak ada → Req 5.5, sertakan flag recommendationMissing);
 *      mode terpisah: investmentContribution = 0.
 *   4. evaluateShortfall(savings, investmentContribution) → shortfall.
 *   5. Persist BudgetPlan (snapshot investmentContribution di kombinasi).
 *   6. Proyeksi target tabungan opsional (bila savingsTargetAmount diberikan):
 *      Growth_Rate = annualReturn rekomendasi (kombinasi) / 0 (terpisah).
 *      Tanpa horizon → Arah A (monthsToReachTarget); dengan horizon → Arah B
 *      (requiredMonthlySaving + banding savingsBucketAmount). Susun
 *      savingsProjection (null bila target tak diisi). Req 11.2–11.8, 12.2–12.8.
 *   7. Persist BudgetPlan (snapshot investmentContribution di kombinasi;
 *      savingsTargetAmount/savingsHorizonYears bila ada).
 *   8. Sukses → 200 { breakdown, savingsBucketAmount, investmentContribution,
 *      shortfall, savingsProjection, recommendationMissing? }.
 *
 * Error mesin (input tidak valid) → 400; error DB → 500 (pesan ramah, Req 7.5).
 *
 * Requirements: 2.2, 2.3, 3.7, 4.1, 5.2, 5.3, 5.4, 5.5, 6.1, 7.1, 7.2, 7.5,
 *   11.2, 11.3, 11.4, 11.5, 11.7, 11.8, 12.2, 12.3, 12.4, 12.6, 12.7, 12.8
 */
export async function POST(req: Request) {
  let body: BudgetBody;
  try {
    body = (await req.json()) as BudgetBody;
  } catch {
    return NextResponse.json({ error: "Permintaan tidak valid." }, { status: 400 });
  }

  const {
    presetId,
    baseAmount,
    mode,
    customAllocation = null,
    savingsTargetAmount = null,
    savingsHorizonYears = null,
    includeSavings = false,
    userId = null,
  } = body ?? {};

  // Lenient: hanya `true` (boolean) yang dianggap aktif; selain itu → false. Req 14.
  const includeSavingsValue = includeSavings === true;

  // 1. Validasi input.
  if (typeof presetId !== "string" || !PRESET_IDS.includes(presetId as PresetId)) {
    return NextResponse.json(
      { error: "Metode preset harus salah satu dari 50/30/20, 70/20/10, 80/20, atau custom." },
      { status: 400 },
    );
  }

  if (typeof baseAmount !== "number" || !Number.isFinite(baseAmount) || baseAmount < 0) {
    return NextResponse.json(
      { error: "Jumlah dasar (Base Amount) harus berupa angka yang tidak negatif." },
      { status: 400 },
    );
  }

  if (typeof mode !== "string" || !SAVINGS_MODES.includes(mode as SavingsMode)) {
    return NextResponse.json(
      { error: "Mode tabungan harus 'terpisah' atau 'kombinasi'." },
      { status: 400 },
    );
  }

  // Validasi field proyeksi opsional (hanya bila diberikan/non-null). Req 11.7, 11.8.
  if (
    savingsTargetAmount !== null &&
    savingsTargetAmount !== undefined &&
    (typeof savingsTargetAmount !== "number" ||
      !Number.isFinite(savingsTargetAmount) ||
      savingsTargetAmount <= 0)
  ) {
    return NextResponse.json(
      { error: "Target tabungan harus berupa angka lebih besar dari nol." },
      { status: 400 },
    );
  }

  if (
    savingsHorizonYears !== null &&
    savingsHorizonYears !== undefined &&
    (typeof savingsHorizonYears !== "number" ||
      !Number.isInteger(savingsHorizonYears) ||
      savingsHorizonYears <= 0)
  ) {
    return NextResponse.json(
      { error: "Jangka waktu tabungan harus berupa bilangan bulat tahun yang lebih besar dari nol." },
      { status: 400 },
    );
  }

  const presetIdValue = presetId as PresetId;
  const modeValue = mode as SavingsMode;
  const savingsTargetAmountValue =
    typeof savingsTargetAmount === "number" ? savingsTargetAmount : null;
  const savingsHorizonYearsValue =
    typeof savingsHorizonYears === "number" ? savingsHorizonYears : null;

  // 2. Mesin penganggaran (pure functions). Error input → 400.
  //
  // Jalur Custom (Req 16.1–16.3): saat presetId === "custom", wajibkan
  // customAllocation berupa objek dengan tiga persentase berhingga >= 0 dan
  // jumlah tepat 100, lalu bangun preset kustom dan hitung breakdown darinya.
  // Jalur preset tetap: pertahankan computeBudget (abaikan customAllocation).
  let breakdown;
  let savings: number;

  if (presetIdValue === "custom") {
    // Req 16.2: customAllocation wajib & berbentuk objek dengan tiga angka
    // berhingga >= 0 untuk kebutuhan/keinginan/ditabung.
    const alloc = customAllocation as
      | { kebutuhan?: unknown; keinginan?: unknown; ditabung?: unknown }
      | null;
    const isValidAllocation =
      typeof alloc === "object" &&
      alloc !== null &&
      typeof alloc.kebutuhan === "number" &&
      Number.isFinite(alloc.kebutuhan) &&
      alloc.kebutuhan >= 0 &&
      typeof alloc.keinginan === "number" &&
      Number.isFinite(alloc.keinginan) &&
      alloc.keinginan >= 0 &&
      typeof alloc.ditabung === "number" &&
      Number.isFinite(alloc.ditabung) &&
      alloc.ditabung >= 0;

    if (!isValidAllocation) {
      return NextResponse.json(
        {
          error:
            "Alokasi kustom harus berisi persentase Kebutuhan, Keinginan, dan Ditabung berupa angka yang tidak negatif.",
        },
        { status: 400 },
      );
    }

    const customAllocationValue: CustomAllocation = {
      kebutuhan: alloc.kebutuhan as number,
      keinginan: alloc.keinginan as number,
      ditabung: alloc.ditabung as number,
    };

    // Req 16.3: jumlah tiga persentase harus tepat 100.
    const sum =
      customAllocationValue.kebutuhan +
      customAllocationValue.keinginan +
      customAllocationValue.ditabung;
    if (Math.abs(sum - 100) >= 1e-9) {
      return NextResponse.json(
        { error: "Total persentase harus tepat 100." },
        { status: 400 },
      );
    }

    try {
      const preset = buildCustomPreset(customAllocationValue);
      breakdown = computeBudgetFromPreset(baseAmount, preset);
      savings = savingsBucketAmount(breakdown);
    } catch (err) {
      console.error("[budget] input mesin penganggaran kustom tidak valid:", err);
      return NextResponse.json(
        { error: "Data untuk menghitung anggaran tidak valid." },
        { status: 400 },
      );
    }
  } else {
    try {
      breakdown = computeBudget(baseAmount, presetIdValue);
      savings = savingsBucketAmount(breakdown);
    } catch (err) {
      console.error("[budget] input mesin penganggaran tidak valid:", err);
      return NextResponse.json(
        { error: "Data untuk menghitung anggaran tidak valid." },
        { status: 400 },
      );
    }
  }

  // 3. Tentukan Investment_Contribution + Growth_Rate berdasarkan mode.
  let investmentContribution = 0;
  let growthRate = 0; // annualReturn dipakai proyeksi (0 di terpisah / tanpa rekomendasi).
  let recommendationMissing = false;

  try {
    if (modeValue === "kombinasi") {
      const rec = await prisma.investmentRecommendation.findFirst({
        orderBy: { createdAt: "desc" },
      });
      investmentContribution = rec?.monthlyContribution ?? 0;
      growthRate = rec?.annualReturn ?? 0;
      recommendationMissing = rec === null;
    }
  } catch (err) {
    console.error("[budget] gagal mengambil InvestmentRecommendation:", err);
    return NextResponse.json(
      { error: "Maaf, gagal memuat data rekomendasi investasi. Coba lagi sebentar." },
      { status: 500 },
    );
  }

  // 4. Evaluasi Savings_Shortfall.
  const shortfall = evaluateShortfall(savings, investmentContribution);

  // 5. Proyeksi target tabungan opsional. Monthly_Saving_Rate = savingsBucketAmount.
  const monthlySavingRate = savings;
  let savingsProjection: SavingsProjection | null = null;
  try {
    if (savingsTargetAmountValue !== null) {
      // Present_Value: hanya relevan saat ada target tabungan. Bila
      // includeSavings aktif → currentSavings profil terbaru (?? 0), else 0.
      // Ambil profil sekali di cabang ini untuk hindari panggilan berulang. Req 14.
      let presentValue = 0;
      if (includeSavingsValue) {
        const profile = await getLatestProfile();
        presentValue = profile?.currentSavings ?? 0;
      }

      if (savingsHorizonYearsValue === null) {
        // Arah A (Time_To_Goal): target tanpa horizon.
        const result = monthsToReachTarget({
          targetAmount: savingsTargetAmountValue,
          monthlySaving: monthlySavingRate,
          annualReturn: growthRate,
          presentValue,
        });
        savingsProjection = {
          direction: "time-to-goal",
          targetAmount: savingsTargetAmountValue,
          horizonYears: null,
          monthlySavingRate,
          annualReturn: growthRate,
          includeSavings: includeSavingsValue,
          presentValue,
          alreadyReached: result.alreadyReached,
          reachable: result.reachable,
          months: result.months,
          years: result.months === null ? null : result.months / 12,
          requiredMonthly: null,
          allocationSufficient: null,
          monthlyGap: null,
        };
      } else {
        // Arah B (Required_Monthly_Saving): target + horizon.
        const requiredMonthly = requiredMonthlySaving({
          targetAmount: savingsTargetAmountValue,
          horizonYears: savingsHorizonYearsValue,
          annualReturn: growthRate,
          presentValue,
        });
        const alreadyReached = presentValue >= savingsTargetAmountValue;
        savingsProjection = {
          direction: "required-monthly",
          targetAmount: savingsTargetAmountValue,
          horizonYears: savingsHorizonYearsValue,
          monthlySavingRate,
          annualReturn: growthRate,
          includeSavings: includeSavingsValue,
          presentValue,
          alreadyReached,
          reachable: true,
          months: null,
          years: null,
          requiredMonthly,
          allocationSufficient: monthlySavingRate >= requiredMonthly,
          monthlyGap: Math.max(0, requiredMonthly - monthlySavingRate),
        };
      }
    }
  } catch (err) {
    // Sudah divalidasi di atas; guard sebagai jaring pengaman → 400.
    console.error("[budget] input proyeksi tabungan tidak valid:", err);
    return NextResponse.json(
      { error: "Data untuk menghitung proyeksi tabungan tidak valid." },
      { status: 400 },
    );
  }

  // 6. Persist BudgetPlan (snapshot investmentContribution di kombinasi). Error DB → 500.
  try {
    await prisma.budgetPlan.create({
      data: {
        userId: userId ?? null,
        presetId: presetIdValue,
        baseAmount,
        mode: modeValue,
        // manualSavingsTarget sengaja diomit → kolom default NULL (deprecated).
        investmentContribution: modeValue === "kombinasi" ? investmentContribution : null,
        savingsTargetAmount: savingsTargetAmountValue ?? null,
        savingsHorizonYears: savingsHorizonYearsValue ?? null,
        includeSavings: includeSavingsValue,
        breakdown: breakdown.lines as unknown as Prisma.InputJsonValue,
      },
    });
  } catch (err) {
    console.error("[budget] gagal menyimpan BudgetPlan:", err);
    return NextResponse.json(
      { error: "Maaf, gagal menyimpan rencana anggaran. Coba lagi sebentar." },
      { status: 500 },
    );
  }

  // 7. Sukses.
  return NextResponse.json(
    {
      breakdown,
      savingsBucketAmount: savings,
      investmentContribution,
      shortfall,
      savingsProjection,
      ...(modeValue === "kombinasi" ? { recommendationMissing } : {}),
    },
    { status: 200 },
  );
}
