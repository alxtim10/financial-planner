// Planner savings projection — logika murni (pure functions) tanpa I/O, UI,
// atau DB. Mengestimasi proyeksi target tabungan opsional di atas alokasi
// anggaran: Arah A (Time_To_Goal) dan Arah B (Required_Monthly_Saving).
// Lihat design.md → "TAMBAHAN — savingsProjection.ts" dan requirements.md
// Requirement 11 (11.6, 11.7, 11.8) serta Requirement 12 (12.1, 12.3–12.6).
// Memakai ulang pola Future Value of Annuity dari `lib/investment/projection.ts`
// (tanpa mengimpornya — menjaga isolasi tipe Planner). Mengimpor TIPE SAJA dari
// `@/types/planner`, konsisten dengan pola pure function `lib/planner/*`.

import type { MonthsToReachResult } from "@/types/planner";

/**
 * Arah A (Time_To_Goal): mengestimasi berapa BULAN untuk mencapai
 * `targetAmount` dengan menabung `monthlySaving` per bulan, pada `annualReturn`
 * (desimal). Tingkat bunga bulanan `i = annualReturn / 12`.
 *
 * - Tanpa pertumbuhan (`i === 0`, mencakup fallback saat `annualReturn <= 0`):
 *   - `monthlySaving <= 0` → target tak pernah tercapai → `{ reachable: false,
 *     months: null }` (Req 12.6). Ini satu-satunya penanganan agar tidak
 *     merender nilai tak hingga.
 *   - Selain itu → `months = ceil(targetAmount / monthlySaving)` (Req 12.1).
 * - Dengan pertumbuhan (`i > 0`, mode kombinasi):
 *   - `monthlySaving <= 0` → dana tidak bertambah (kontribusi nol, tanpa saldo
 *     awal) → `{ reachable: false, months: null }` (Req 12.6).
 *   - Selain itu, selesaikan anuitas untuk `n` (Req 12.3):
 *     `n = ln(1 + (targetAmount * i) / monthlySaving) / ln(1 + i)`, lalu
 *     `months = ceil(n)`.
 *
 * Nilai berhingga besar dikembalikan apa adanya, tanpa dibatasi (Req 12.5).
 *
 * Guard (Req 11.6): melempar Error bila `targetAmount` bukan angka berhingga
 * `> 0`, `annualReturn` bukan angka berhingga `>= 0`, atau `monthlySaving`
 * bukan angka berhingga `>= 0`.
 */
export function monthsToReachTarget(args: {
  targetAmount: number; // > 0
  monthlySaving: number; // Monthly_Saving_Rate (>= 0)
  annualReturn: number; // desimal >= 0 (0 → tanpa bunga)
}): MonthsToReachResult {
  const { targetAmount, monthlySaving, annualReturn } = args;

  if (!Number.isFinite(targetAmount) || targetAmount <= 0) {
    throw new Error(
      `targetAmount tidak valid: harus angka berhingga yang positif, diterima ${String(
        targetAmount
      )}.`
    );
  }
  if (!Number.isFinite(annualReturn) || annualReturn < 0) {
    throw new Error(
      `annualReturn tidak valid: harus angka berhingga yang tidak negatif, diterima ${String(
        annualReturn
      )}.`
    );
  }
  if (!Number.isFinite(monthlySaving) || monthlySaving < 0) {
    throw new Error(
      `monthlySaving tidak valid: harus angka berhingga yang tidak negatif, diterima ${String(
        monthlySaving
      )}.`
    );
  }

  // Tingkat bunga bulanan; fallback ke cabang tanpa pertumbuhan bila <= 0.
  const i = annualReturn / 12;

  // Tanpa pertumbuhan (Req 12.1, 12.4).
  if (i === 0 || annualReturn <= 0) {
    if (monthlySaving <= 0) {
      return { reachable: false, months: null }; // Req 12.6
    }
    return { reachable: true, months: Math.ceil(targetAmount / monthlySaving) };
  }

  // Dengan pertumbuhan (Req 12.3).
  if (monthlySaving <= 0) {
    return { reachable: false, months: null }; // Req 12.6
  }

  const n = Math.log(1 + (targetAmount * i) / monthlySaving) / Math.log(1 + i);
  return { reachable: true, months: Math.ceil(n) };
}

/**
 * Arah B (Required_Monthly_Saving): tabungan bulanan yang diperlukan untuk
 * mencapai `targetAmount` dalam `horizonYears`, pada `annualReturn` (desimal).
 * Tingkat bunga bulanan `i = annualReturn / 12`; jumlah periode `n =
 * horizonYears * 12`.
 *
 * - Tanpa pertumbuhan (`i === 0`, mencakup fallback saat `annualReturn <= 0`):
 *   `requiredMonthly = targetAmount / n` (Req 12.1).
 * - Dengan pertumbuhan (`i > 0`, mode kombinasi): Future Value of Annuity
 *   diselesaikan untuk PMT (Req 12.3):
 *   `PMT = targetAmount * i / ((1 + i)^n - 1)`.
 *
 * Hasil di-clamp minimum 0.
 *
 * Guard (Req 11.6, 11.8): melempar Error bila `targetAmount` bukan angka
 * berhingga `> 0`, `horizonYears` bukan bilangan bulat positif berhingga
 * (`Number.isInteger` dan `> 0`), atau `annualReturn` bukan angka berhingga
 * `>= 0`.
 */
export function requiredMonthlySaving(args: {
  targetAmount: number; // > 0
  horizonYears: number; // bilangan bulat positif
  annualReturn: number; // desimal >= 0 (0 → tanpa bunga)
}): number {
  const { targetAmount, horizonYears, annualReturn } = args;

  if (!Number.isFinite(targetAmount) || targetAmount <= 0) {
    throw new Error(
      `targetAmount tidak valid: harus angka berhingga yang positif, diterima ${String(
        targetAmount
      )}.`
    );
  }
  if (!Number.isInteger(horizonYears) || horizonYears <= 0) {
    throw new Error(
      `horizonYears tidak valid: harus bilangan bulat positif, diterima ${String(
        horizonYears
      )}.`
    );
  }
  if (!Number.isFinite(annualReturn) || annualReturn < 0) {
    throw new Error(
      `annualReturn tidak valid: harus angka berhingga yang tidak negatif, diterima ${String(
        annualReturn
      )}.`
    );
  }

  const i = annualReturn / 12; // tingkat bunga bulanan
  const n = horizonYears * 12; // jumlah periode dalam bulan

  let pmt: number;

  if (i === 0 || annualReturn <= 0) {
    // Tanpa pertumbuhan (Req 12.1, 12.4).
    pmt = targetAmount / n;
  } else {
    // Future Value of Annuity diselesaikan untuk PMT (Req 12.3).
    const growth = Math.pow(1 + i, n);
    pmt = (targetAmount * i) / (growth - 1);
  }

  // Clamp minimum 0.
  return Math.max(0, pmt);
}
