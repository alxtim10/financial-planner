// Planner savings projection — logika murni (pure functions) tanpa I/O, UI,
// atau DB. Mengestimasi proyeksi target tabungan opsional di atas alokasi
// anggaran: Arah A (Time_To_Goal) dan Arah B (Required_Monthly_Saving).
// Lihat design.md → "TAMBAHAN — savingsProjection.ts" dan requirements.md
// Requirement 11 (11.6, 11.7, 11.8), Requirement 12 (12.1, 12.3–12.6), serta
// Requirement 13 (13.2, 13.4–13.9) untuk parameter Present_Value opsional.
// Memakai ulang pola Future Value of Annuity dari `lib/investment/projection.ts`
// (tanpa mengimpornya — menjaga isolasi tipe Planner). Mengimpor TIPE SAJA dari
// `@/types/planner`, konsisten dengan pola pure function `lib/planner/*`.

import type { MonthsToReachResult } from "@/types/planner";

/**
 * Arah A (Time_To_Goal): mengestimasi berapa BULAN untuk mencapai
 * `targetAmount` dengan menabung `monthlySaving` per bulan, pada `annualReturn`
 * (desimal), dengan saldo awal opsional `presentValue` (PV, default 0). Tingkat
 * bunga bulanan `i = annualReturn / 12`.
 *
 * - Sudah tercapai (Req 13.6): bila `PV >= targetAmount` → target terpenuhi
 *   tanpa perlu menabung lagi → `{ reachable: true, months: 0,
 *   alreadyReached: true }`.
 * - Tanpa pertumbuhan (`i === 0`, mencakup fallback saat `annualReturn <= 0`):
 *   - `monthlySaving <= 0` → sisa target (`targetAmount − PV > 0`) tak pernah
 *     terpenuhi → `{ reachable: false, months: null, alreadyReached: false }`
 *     (Req 12.6, 13.7). Ini satu-satunya penanganan agar tidak merender nilai
 *     tak hingga; nilai berhingga besar tetap ditampilkan apa adanya (Req 12.5).
 *   - Selain itu → `months = ceil(max(0, targetAmount − PV) / monthlySaving)`
 *     (Req 12.1, 13.4).
 * - Dengan pertumbuhan (`i > 0`, mode kombinasi):
 *   - `monthlySaving <= 0` (dan `PV < targetAmount`) → dana tidak bertambah →
 *     `{ reachable: false, months: null, alreadyReached: false }` (Req 12.6).
 *   - Selain itu, selesaikan anuitas dengan saldo awal `PV` untuk `n`
 *     (Req 12.3, 13.4):
 *     `n = ln((targetAmount × i + monthlySaving) / (PV × i + monthlySaving)) /
 *     ln(1 + i)`, lalu `months = ceil(n)`.
 *
 * Ekuivalensi (Req 13.2): dengan `PV = 0` rumus di atas menyederhana menjadi
 * perilaku from-zero yang lama.
 *
 * Guard (Req 11.6, 13.9): melempar Error bila `targetAmount` bukan angka
 * berhingga `> 0`, `annualReturn` bukan angka berhingga `>= 0`, `monthlySaving`
 * bukan angka berhingga `>= 0`, atau `presentValue` (default 0) bukan angka
 * berhingga `>= 0`.
 */
export function monthsToReachTarget(args: {
  targetAmount: number; // > 0
  monthlySaving: number; // Monthly_Saving_Rate (>= 0)
  annualReturn: number; // desimal >= 0 (0 → tanpa bunga)
  presentValue?: number; // Present_Value (>= 0, default 0)
}): MonthsToReachResult {
  const { targetAmount, monthlySaving, annualReturn, presentValue = 0 } = args;

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
  if (!Number.isFinite(presentValue) || presentValue < 0) {
    throw new Error(
      `presentValue tidak valid: harus angka berhingga yang tidak negatif, diterima ${String(
        presentValue
      )}.`
    );
  }

  const PV = presentValue;

  // Sudah tercapai (Req 13.6): cek PALING AWAL sebelum perhitungan lain.
  if (PV >= targetAmount) {
    return { reachable: true, months: 0, alreadyReached: true };
  }

  // Tingkat bunga bulanan; fallback ke cabang tanpa pertumbuhan bila <= 0.
  const i = annualReturn / 12;

  // Tanpa pertumbuhan (Req 12.1, 12.4, 13.4).
  if (i === 0 || annualReturn <= 0) {
    if (monthlySaving <= 0) {
      return { reachable: false, months: null, alreadyReached: false }; // Req 12.6, 13.7
    }
    return {
      reachable: true,
      months: Math.ceil(Math.max(0, targetAmount - PV) / monthlySaving),
      alreadyReached: false,
    };
  }

  // Dengan pertumbuhan (Req 12.3, 13.4).
  if (monthlySaving <= 0) {
    return { reachable: false, months: null, alreadyReached: false }; // Req 12.6
  }

  const n =
    Math.log((targetAmount * i + monthlySaving) / (PV * i + monthlySaving)) /
    Math.log(1 + i);
  return { reachable: true, months: Math.ceil(n), alreadyReached: false };
}

/**
 * Arah B (Required_Monthly_Saving): tabungan bulanan yang diperlukan untuk
 * mencapai `targetAmount` dalam `horizonMonths`, pada `annualReturn` (desimal),
 * dengan saldo awal opsional `presentValue` (PV, default 0). Tingkat bunga
 * bulanan `i = annualReturn / 12`; jumlah periode `n = horizonMonths`.
 *
 * - Sudah tercapai (Req 13.6): bila `PV >= targetAmount` → return `0`.
 * - Tanpa pertumbuhan (`i === 0`, mencakup fallback saat `annualReturn <= 0`):
 *   `requiredMonthly = (targetAmount − PV) / n` (Req 12.1, 13.5).
 * - Dengan pertumbuhan (`i > 0`, mode kombinasi): Future Value of Annuity dengan
 *   saldo awal diselesaikan untuk PMT (Req 12.3, 13.5):
 *   `PMT = (targetAmount − PV × (1 + i)^n) × i / ((1 + i)^n − 1)`.
 *
 * Hasil di-clamp minimum 0. Ekuivalensi (Req 13.2): dengan `PV = 0` rumus di
 * atas menyederhana menjadi perilaku from-zero yang lama.
 *
 * Guard (Req 11.6, 11.8, 13.9): melempar Error bila `targetAmount` bukan angka
 * berhingga `> 0`, `horizonMonths` bukan bilangan bulat positif berhingga
 * (`Number.isInteger` dan `> 0`), `annualReturn` bukan angka berhingga `>= 0`,
 * atau `presentValue` (default 0) bukan angka berhingga `>= 0`.
 */
export function requiredMonthlySaving(args: {
  targetAmount: number; // > 0
  horizonMonths: number; // bilangan bulat positif (bulan)
  annualReturn: number; // desimal >= 0 (0 → tanpa bunga)
  presentValue?: number; // Present_Value (>= 0, default 0)
}): number {
  const { targetAmount, horizonMonths, annualReturn, presentValue = 0 } = args;

  if (!Number.isFinite(targetAmount) || targetAmount <= 0) {
    throw new Error(
      `targetAmount tidak valid: harus angka berhingga yang positif, diterima ${String(
        targetAmount
      )}.`
    );
  }
  if (!Number.isInteger(horizonMonths) || horizonMonths <= 0) {
    throw new Error(
      `horizonMonths tidak valid: harus bilangan bulat positif, diterima ${String(
        horizonMonths
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
  if (!Number.isFinite(presentValue) || presentValue < 0) {
    throw new Error(
      `presentValue tidak valid: harus angka berhingga yang tidak negatif, diterima ${String(
        presentValue
      )}.`
    );
  }

  const PV = presentValue;

  // Sudah tercapai (Req 13.6): tidak perlu menabung lagi.
  if (PV >= targetAmount) {
    return 0;
  }

  const i = annualReturn / 12; // tingkat bunga bulanan
  const n = horizonMonths; // jumlah periode dalam bulan

  let pmt: number;

  if (i === 0 || annualReturn <= 0) {
    // Tanpa pertumbuhan (Req 12.1, 12.4, 13.5).
    pmt = (targetAmount - PV) / n;
  } else {
    // Future Value of Annuity dengan saldo awal diselesaikan untuk PMT
    // (Req 12.3, 13.5).
    const growth = Math.pow(1 + i, n);
    pmt = ((targetAmount - PV * growth) * i) / (growth - 1);
  }

  // Clamp minimum 0 (bila PV besar membuat PMT negatif → 0).
  return Math.max(0, pmt);
}
