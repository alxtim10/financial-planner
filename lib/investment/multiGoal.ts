// Agregasi multi-tujuan (multi-goal) — logika murni (pure functions) tanpa
// I/O, UI, atau DB. Menggabungkan beberapa tujuan menjadi parameter perhitungan
// tunggal sesuai "opsi A":
//
//   - Target gabungan  = Σ targetAmount (jumlah semua target).
//   - Horizon gabungan = rata-rata tertimbang oleh target:
//                        Σ(targetAmount × horizonMonths) / Σ targetAmount,
//                        dibulatkan ke bilangan bulat (minimum 1 bulan).
//     Horizon tertimbang ini HANYA dipakai untuk menentukan bucket alokasi
//     tunggal (getAllocation) agar komposisi/return konsisten "satu alokasi".
//
//   - Setoran bulanan (monthlyContribution) dihitung PER-TUJUAN dengan horizon
//     & target masing-masing memakai annualReturn alokasi tunggal, lalu
//     DIJUMLAHKAN. Ini menghormati jangka waktu tiap tujuan (opsi A) alih-alih
//     meratakan semuanya ke satu horizon.
//
// Catatan present value (tabungan saat ini): karena satu saldo awal dipakai
// bersama banyak tujuan, PV dialokasikan proporsional terhadap target tiap
// tujuan agar tidak dihitung ganda. Saat hanya satu tujuan, perilaku identik
// dengan perhitungan lama (PV penuh pada tujuan itu).

import type { GoalInput, AggregatedGoals, AllocationSlice } from "@/types/finance";
import { calculateMonthlyContribution, projectInvestment } from "./projection";
import type { InvestmentProjection } from "@/types/finance";

/**
 * Memvalidasi & menormalkan daftar tujuan untuk agregasi. Melempar Error
 * (pesan Bahasa Indonesia) bila daftar kosong atau ada tujuan tidak valid.
 */
function assertGoals(goals: readonly GoalInput[]): void {
  if (!Array.isArray(goals) || goals.length === 0) {
    throw new Error("Minimal satu tujuan diperlukan untuk perhitungan.");
  }
  for (const g of goals) {
    if (!Number.isFinite(g.targetAmount) || g.targetAmount <= 0) {
      throw new Error("Target dana tiap tujuan harus angka lebih besar dari 0.");
    }
    if (!Number.isInteger(g.horizonMonths) || g.horizonMonths <= 0) {
      throw new Error("Jangka waktu tiap tujuan harus bilangan bulat lebih besar dari 0.");
    }
  }
}

/**
 * Mengagregasi beberapa tujuan menjadi total target + horizon rata-rata
 * tertimbang (opsi A). Pure function.
 *
 * @throws {Error} bila daftar kosong atau ada tujuan tidak valid.
 */
export function aggregateGoals(goals: readonly GoalInput[]): AggregatedGoals {
  assertGoals(goals);

  const totalTargetAmount = goals.reduce((sum, g) => sum + g.targetAmount, 0);

  // Horizon rata-rata tertimbang oleh target. totalTargetAmount > 0 dijamin
  // oleh assertGoals (tiap target > 0).
  const weightedSum = goals.reduce((sum, g) => sum + g.targetAmount * g.horizonMonths, 0);
  const weightedHorizonMonths = Math.max(1, Math.round(weightedSum / totalTargetAmount));

  return {
    totalTargetAmount,
    weightedHorizonMonths,
    goalCount: goals.length,
  };
}

// Rincian setoran bulanan per tujuan (dipakai UI untuk menampilkan breakdown).
export interface PerGoalContribution {
  id?: string;
  name?: string | null;
  targetAmount: number;
  horizonMonths: number;
  presentValueShare: number; // porsi PV yang dialokasikan ke tujuan ini
  monthlyContribution: number; // setoran bulanan untuk tujuan ini (FV annuity)
}

// Hasil perhitungan multi-tujuan dengan satu alokasi.
export interface MultiGoalResult {
  aggregated: AggregatedGoals;
  annualReturn: number; // echo return alokasi tunggal yang dipakai
  totalMonthlyContribution: number; // Σ setoran per-tujuan (dibulatkan)
  perGoal: PerGoalContribution[]; // rincian setoran per tujuan
  projection: InvestmentProjection; // proyeksi agregat (PV penuh + total setoran)
}

/**
 * Menghitung setoran bulanan untuk sekumpulan tujuan memakai SATU alokasi
 * (annualReturn + composition tunggal), mengikuti opsi A:
 *   1. Tabungan saat ini (`presentValue`) dibagi proporsional ke tiap tujuan
 *      berdasarkan bobot target (menghindari hitung ganda PV).
 *   2. Tiap tujuan menghitung setoran bulanannya sendiri via FV-of-annuity
 *      dengan horizon & target tujuan itu, lalu dijumlahkan.
 *   3. Proyeksi agregat disusun dari PV penuh + total setoran memakai horizon
 *      rata-rata tertimbang (untuk gambaran pertumbuhan gabungan).
 *
 * Saat `goals` berisi satu tujuan, hasil identik dengan perhitungan tunggal
 * (PV penuh, horizon & target tujuan itu).
 *
 * Pure function. @throws {Error} bila input tidak valid.
 */
export function computeMultiGoalContribution(params: {
  goals: readonly GoalInput[];
  presentValue: number;
  annualReturn: number;
  composition: AllocationSlice[];
}): MultiGoalResult {
  const { goals, presentValue, annualReturn, composition } = params;

  assertGoals(goals);
  if (!Number.isFinite(presentValue) || presentValue < 0) {
    throw new Error("Tabungan saat ini harus berupa angka yang tidak negatif.");
  }
  if (!Number.isFinite(annualReturn) || annualReturn < 0) {
    throw new Error("Estimasi return harus berupa angka yang tidak negatif.");
  }

  const aggregated = aggregateGoals(goals);
  const totalTarget = aggregated.totalTargetAmount;

  const perGoal: PerGoalContribution[] = goals.map((g) => {
    // PV dialokasikan proporsional terhadap bobot target tujuan ini.
    const pvShare = presentValue * (g.targetAmount / totalTarget);
    const monthlyContribution = calculateMonthlyContribution({
      futureValue: g.targetAmount,
      presentValue: pvShare,
      annualReturn,
      horizonMonths: g.horizonMonths,
    });
    return {
      id: g.id,
      name: g.name ?? null,
      targetAmount: g.targetAmount,
      horizonMonths: g.horizonMonths,
      presentValueShare: pvShare,
      monthlyContribution,
    };
  });

  const totalMonthlyContribution = perGoal.reduce(
    (sum, p) => sum + p.monthlyContribution,
    0,
  );

  // Proyeksi agregat: PV penuh + total setoran, horizon rata-rata tertimbang.
  const projection = projectInvestment({
    presentValue,
    monthlyContribution: totalMonthlyContribution,
    annualReturn,
    horizonMonths: aggregated.weightedHorizonMonths,
    composition,
  });

  return {
    aggregated,
    annualReturn,
    totalMonthlyContribution: Math.round(totalMonthlyContribution),
    perGoal,
    projection,
  };
}
