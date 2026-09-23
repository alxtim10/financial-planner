import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { scoreRisk } from "@/lib/investment/riskScoring";
import { getAllocation } from "@/lib/investment/allocation";
import { calculateMonthlyContribution } from "@/lib/investment/projection";

export const runtime = "nodejs";

interface RecommendationBody {
  goalId?: unknown;
  targetAmount?: unknown;
  horizonMonths?: unknown;
  riskAnswers?: unknown;
  currentSavings?: unknown;
  userId?: string | null;
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
  let body: RecommendationBody;
  try {
    body = (await req.json()) as RecommendationBody;
  } catch {
    return NextResponse.json({ error: "Permintaan tidak valid." }, { status: 400 });
  }

  const { goalId, targetAmount, horizonMonths, riskAnswers, currentSavings, userId = null } =
    body ?? {};

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

  const answers = riskAnswers as number[];
  const goalIdValue = typeof goalId === "string" ? goalId : null;

  // 2–4. Mesin investasi (pure functions). Error input → 400.
  let profile: string;
  let score: number;
  let composition: unknown;
  let annualReturn: number;
  let monthlyContribution: number;
  try {
    const risk = scoreRisk(answers);
    score = risk.score;
    profile = risk.profile;

    const allocation = getAllocation(horizonMonths, risk.profile);
    composition = allocation.composition;
    annualReturn = allocation.annualReturn;

    monthlyContribution = calculateMonthlyContribution({
      futureValue: targetAmount,
      presentValue: currentSavings,
      annualReturn: allocation.annualReturn,
      horizonMonths,
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
        composition: composition as Prisma.InputJsonValue,
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

  // 6. Sukses.
  return NextResponse.json(
    { riskProfile: profile, composition, annualReturn, monthlyContribution },
    { status: 200 },
  );
}
