import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getLatestProfile } from "@/lib/profileGate";
import {
  computeBudget,
  savingsBucketAmount,
  evaluateShortfall,
} from "@/lib/planner/budget";
import type { PresetId, SavingsMode } from "@/types/planner";

export const runtime = "nodejs";

const PRESET_IDS: readonly PresetId[] = ["50/30/20", "70/20/10", "80/20"];
const SAVINGS_MODES: readonly SavingsMode[] = ["terpisah", "kombinasi"];

interface BudgetBody {
  presetId?: unknown;
  baseAmount?: unknown;
  mode?: unknown;
  manualSavingsTarget?: unknown;
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

    const latestPlan = await prisma.budgetPlan.findFirst({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ defaultBaseAmount, latestPlan }, { status: 200 });
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
 * Body: { presetId, baseAmount, mode, manualSavingsTarget?, userId? }
 *
 * Validasi (→ 400):
 *   - presetId ∈ { "50/30/20", "70/20/10", "80/20" }.
 *   - baseAmount angka berhingga ≥ 0.
 *   - mode ∈ { "terpisah", "kombinasi" }.
 *   - manualSavingsTarget (bila diberikan) angka berhingga ≥ 0.
 *
 * Alur server:
 *   1. computeBudget(baseAmount, presetId) → breakdown (error input → 400).
 *   2. savingsBucketAmount(breakdown) → jumlah Savings_Bucket.
 *   3. Mode kombinasi: tarik monthlyContribution dari InvestmentRecommendation
 *      terbaru (0 bila tak ada → Req 5.5, sertakan flag recommendationMissing);
 *      mode terpisah: investmentContribution = 0.
 *   4. evaluateShortfall(savings, investmentContribution) → shortfall.
 *   5. Persist BudgetPlan (snapshot investmentContribution di kombinasi).
 *   6. Sukses → 200 { breakdown, savingsBucketAmount, investmentContribution,
 *      manualSavingsTarget, shortfall, recommendationMissing? }.
 *
 * Error mesin (input tidak valid) → 400; error DB → 500 (pesan ramah, Req 7.5).
 *
 * Requirements: 2.2, 2.3, 3.7, 4.1, 5.2, 5.3, 5.4, 5.5, 6.1, 7.1, 7.2, 7.5
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
    manualSavingsTarget = null,
    userId = null,
  } = body ?? {};

  // 1. Validasi input.
  if (typeof presetId !== "string" || !PRESET_IDS.includes(presetId as PresetId)) {
    return NextResponse.json(
      { error: "Metode preset harus salah satu dari 50/30/20, 70/20/10, atau 80/20." },
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

  if (
    manualSavingsTarget !== null &&
    manualSavingsTarget !== undefined &&
    (typeof manualSavingsTarget !== "number" ||
      !Number.isFinite(manualSavingsTarget) ||
      manualSavingsTarget < 0)
  ) {
    return NextResponse.json(
      { error: "Target tabungan manual harus berupa angka yang tidak negatif." },
      { status: 400 },
    );
  }

  const presetIdValue = presetId as PresetId;
  const modeValue = mode as SavingsMode;
  const manualSavingsTargetValue =
    typeof manualSavingsTarget === "number" ? manualSavingsTarget : null;

  // 2. Mesin penganggaran (pure functions). Error input → 400.
  let breakdown;
  let savings: number;
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

  // 3. Tentukan Investment_Contribution berdasarkan mode.
  let investmentContribution = 0;
  let recommendationMissing = false;

  try {
    if (modeValue === "kombinasi") {
      const rec = await prisma.investmentRecommendation.findFirst({
        orderBy: { createdAt: "desc" },
      });
      investmentContribution = rec?.monthlyContribution ?? 0;
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

  // 5. Persist BudgetPlan (snapshot investmentContribution di kombinasi). Error DB → 500.
  try {
    await prisma.budgetPlan.create({
      data: {
        userId: userId ?? null,
        presetId: presetIdValue,
        baseAmount,
        mode: modeValue,
        manualSavingsTarget: manualSavingsTargetValue,
        investmentContribution: modeValue === "kombinasi" ? investmentContribution : null,
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

  // 6. Sukses.
  return NextResponse.json(
    {
      breakdown,
      savingsBucketAmount: savings,
      investmentContribution,
      manualSavingsTarget: manualSavingsTargetValue,
      shortfall,
      ...(modeValue === "kombinasi" ? { recommendationMissing } : {}),
    },
    { status: 200 },
  );
}
