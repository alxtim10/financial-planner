import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getLatestProfile } from "@/lib/profileGate";
import { getActiveGoal } from "@/lib/goal";
import { computeGoalBudget } from "@/lib/planner/goalBudget";
import { computeTradeOffs } from "@/lib/planner/tradeoffs";
import type { GoalBudgetResult } from "@/types/planner";

export const runtime = "nodejs";

interface BudgetBody {
  monthlyIncome?: unknown;
  monthlyExpense?: unknown;
  targetAmount?: unknown;
  horizonMonths?: unknown;
  userId?: string | null;
}

/**
 * GET /api/budget — muat konteks awal Planner goal-driven.
 *
 * Alur server:
 *   1. getLatestProfile() → suplai default form:
 *      - defaultMonthlyIncome = income (atau null bila belum ada profil).
 *      - currentSavings = currentSavings (atau null).
 *      - monthlyExpense = expense (atau null).
 *   2. Ambil BudgetPlan terbaru (orderBy createdAt desc) → latestPlan (atau null).
 *   3. getActiveGoal() → prefill tujuan Planner:
 *      - goalTargetAmount = active.targetAmount (atau null bila belum ada tujuan).
 *      - goalHorizonMonths = active.horizonMonths (atau null).
 *      - goalName = active.name (atau null).
 *   4. Sukses → 200 { defaultMonthlyIncome, currentSavings, monthlyExpense,
 *      latestPlan, goalTargetAmount, goalHorizonMonths, goalName }.
 *
 * Error DB → 500 (pesan ramah Bahasa Indonesia, tanpa detail internal).
 *
 * Requirements: 8.1, 8.2, 9.2, 9.4, 21.2, 21.8
 */
export async function GET() {
  try {
    const profile = await getLatestProfile();
    const active = await getActiveGoal();

    const latestPlan = await prisma.budgetPlan.findFirst({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(
      {
        defaultMonthlyIncome: profile?.income ?? null,
        currentSavings: profile?.currentSavings ?? null,
        monthlyExpense: profile?.expense ?? null,
        latestPlan,
        goalTargetAmount: active?.targetAmount ?? null,
        goalHorizonMonths: active?.horizonMonths ?? null,
        goalName: active?.name ?? null,
      },
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
 * POST /api/budget — hitung + simpan rencana anggaran goal-driven.
 *
 * Body: { monthlyIncome, targetAmount, horizonMonths, userId? }
 *
 * Validasi (→ 400, pesan ramah Bahasa Indonesia):
 *   - monthlyIncome angka berhingga > 0.
 *   - targetAmount angka berhingga > 0.
 *   - horizonMonths bilangan bulat > 0.
 *   - JSON tidak valid → 400.
 *
 * Alur server:
 *   1. getLatestProfile() → currentSavings = profile?.currentSavings ?? 0,
 *      monthlyExpense = profile?.expense ?? 0.
 *   2. computeGoalBudget({ monthlyIncome, currentSavings, targetAmount,
 *      horizonMonths, monthlyExpense }) di dalam try/catch (guard error → 400
 *      sebagai jaring pengaman).
 *   3. Persist BudgetPlan memakai ulang kolom yang ada:
 *      presetId "goal", baseAmount = monthlyIncome, savingsTargetAmount =
 *      targetAmount, savingsHorizonMonths = horizonMonths, breakdown =
 *      result.lines (Json). Kolom mode/includeSavings/investmentContribution
 *      dibiarkan null/diomit.
 *   4. Sukses → 200 GoalBudgetResult penuh.
 *
 * Error mesin (input tidak valid) → 400; error DB → 500 (pesan ramah).
 *
 * Requirements: 21.3, 21.4, 21.5, 21.6, 21.7, 21.8
 */
export async function POST(req: Request) {
  let body: BudgetBody;
  try {
    body = (await req.json()) as BudgetBody;
  } catch {
    return NextResponse.json({ error: "Permintaan tidak valid." }, { status: 400 });
  }

  const {
    monthlyIncome,
    monthlyExpense,
    targetAmount,
    horizonMonths,
    userId = null,
  } = body ?? {};

  // Validasi input (→ 400).
  if (typeof monthlyIncome !== "number" || !Number.isFinite(monthlyIncome) || monthlyIncome <= 0) {
    return NextResponse.json(
      { error: "Pemasukan bulanan harus berupa angka yang lebih besar dari nol." },
      { status: 400 },
    );
  }

  // monthlyExpense opsional: jika dikirim, wajib angka berhingga >= 0.
  if (
    monthlyExpense !== undefined &&
    monthlyExpense !== null &&
    (typeof monthlyExpense !== "number" ||
      !Number.isFinite(monthlyExpense) ||
      monthlyExpense < 0)
  ) {
    return NextResponse.json(
      { error: "Pengeluaran bulanan harus berupa angka yang tidak negatif." },
      { status: 400 },
    );
  }

  if (typeof targetAmount !== "number" || !Number.isFinite(targetAmount) || targetAmount <= 0) {
    return NextResponse.json(
      { error: "Target dana harus berupa angka yang lebih besar dari nol." },
      { status: 400 },
    );
  }

  if (typeof horizonMonths !== "number" || !Number.isInteger(horizonMonths) || horizonMonths <= 0) {
    return NextResponse.json(
      { error: "Jangka waktu harus berupa bilangan bulat bulan yang lebih besar dari nol." },
      { status: 400 },
    );
  }

  // 1. currentSavings dari profil; monthlyExpense diutamakan dari input pengguna
  //    (free input), fallback ke profil bila tidak dikirim.
  const profile = await getLatestProfile();
  const currentSavings = profile?.currentSavings ?? 0;
  const resolvedMonthlyExpense =
    typeof monthlyExpense === "number" ? monthlyExpense : profile?.expense ?? 0;

  // 2. Mesin goal-driven (pure function). Guard error → 400 (jaring pengaman).
  let result: GoalBudgetResult;
  try {
    result = computeGoalBudget({
      monthlyIncome,
      currentSavings,
      targetAmount,
      horizonMonths,
      monthlyExpense: resolvedMonthlyExpense,
    });

    if (result.feasibility.severity !== "ok") {
      result.tradeOffs = computeTradeOffs({
        monthlyIncome,
        monthlyExpense: resolvedMonthlyExpense,
        currentSavings,
        targetAmount,
        horizonMonths,
        ditabung: result.ditabung,
        kebutuhan: result.kebutuhan,
        keinginan: result.keinginan,
      });
    }
  } catch (err) {
    console.error("[budget] input mesin goal-driven tidak valid:", err);
    return NextResponse.json(
      { error: "Data untuk menghitung anggaran tidak valid." },
      { status: 400 },
    );
  }

  // 3. Persist BudgetPlan — reuse kolom yang ada, tanpa migrasi. Error DB → 500.
  try {
    await prisma.budgetPlan.create({
      data: {
        userId: userId ?? null,
        presetId: "goal",
        baseAmount: monthlyIncome,
        // Kolom `mode` non-null di skema (tanpa migrasi) → tandai "goal".
        // Kolom includeSavings/investmentContribution dibiarkan null/diomit.
        mode: "goal",
        savingsTargetAmount: targetAmount,
        savingsHorizonMonths: horizonMonths,
        breakdown: result.lines as unknown as Prisma.InputJsonValue,
      },
    });
  } catch (err) {
    console.error("[budget] gagal menyimpan BudgetPlan:", err);
    return NextResponse.json(
      { error: "Maaf, gagal menyimpan rencana anggaran. Coba lagi sebentar." },
      { status: 500 },
    );
  }

  // 4. Sukses → GoalBudgetResult penuh.
  return NextResponse.json(result, { status: 200 });
}
