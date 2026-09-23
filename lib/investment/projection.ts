import type { ProjectionInput } from "@/types/finance";

/**
 * Menghitung kontribusi bulanan (Monthly_Contribution) yang diperlukan untuk
 * mencapai `futureValue` dari `presentValue` selama `horizonMonths`, dengan
 * estimasi return tahunan `annualReturn` (desimal).
 *
 * Rumus Future Value of Annuity:
 *   i = annualReturn / 12          (tingkat bunga bulanan)
 *   n = horizonMonths              (jumlah periode/bulan)
 *   PMT = (FV - PV*(1+i)^n) * i / ((1+i)^n - 1)
 *
 * - Fallback linear: saat i === 0 (annualReturn === 0), gunakan (FV - PV) / n.
 * - Hasil dibatasi minimum 0 (saat presentValue sudah cukup mencapai target).
 *
 * Fungsi ini murni (pure): tanpa I/O, tanpa dependensi UI/API/DB.
 *
 * Requirements: 5.1, 5.2, 5.3, 5.4
 */
export function calculateMonthlyContribution(input: ProjectionInput): number {
  const { futureValue, presentValue, annualReturn, horizonMonths } = input;

  // Validasi input.
  if (!Number.isFinite(futureValue) || futureValue < 0) {
    throw new Error("futureValue harus berupa angka non-negatif.");
  }
  if (!Number.isFinite(presentValue) || presentValue < 0) {
    throw new Error("presentValue harus berupa angka non-negatif.");
  }
  if (!Number.isFinite(annualReturn) || annualReturn < 0) {
    throw new Error("annualReturn harus berupa angka non-negatif.");
  }
  if (!Number.isFinite(horizonMonths) || horizonMonths <= 0) {
    throw new Error("horizonMonths harus berupa angka positif.");
  }

  const i = annualReturn / 12; // tingkat bunga bulanan (Req 5.2)
  const n = horizonMonths; // jumlah periode dalam bulan (Req 5.2)

  let pmt: number;

  if (i === 0) {
    // Fallback linear saat return nol (Req 5.3).
    pmt = (futureValue - presentValue) / n;
  } else {
    // Future Value of Annuity (Req 5.1).
    const growth = Math.pow(1 + i, n);
    pmt = ((futureValue - presentValue * growth) * i) / (growth - 1);
  }

  // Clamp minimum 0: presentValue sudah cukup mencapai target (Req 5.4).
  return Math.max(0, pmt);
}
