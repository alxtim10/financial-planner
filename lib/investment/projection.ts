import type {
  ProjectionInput,
  AllocationSlice,
  InvestmentProjection,
  InstrumentProjection,
} from "@/types/finance";
import { categoryReturn } from "./allocation";

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

/**
 * Menghitung nilai masa depan (FV) dari saldo awal `presentValue` yang tumbuh
 * selama `horizonMonths` ditambah anuitas setoran bulanan `monthlyContribution`.
 *
 *   i = annualReturn / 12, n = horizonMonths
 *   FV = PV*(1+i)^n + PMT * ((1+i)^n - 1) / i      (i > 0)
 *   FV = PV + PMT*n                                 (i === 0, fallback linear)
 *
 * Pure function. Tidak melempar — pemanggil (`projectInvestment`) memvalidasi.
 */
function futureValueOf(
  presentValue: number,
  monthlyContribution: number,
  annualReturn: number,
  horizonMonths: number,
): number {
  const i = annualReturn / 12;
  const n = horizonMonths;
  if (i === 0) {
    return presentValue + monthlyContribution * n;
  }
  const growth = Math.pow(1 + i, n);
  return presentValue * growth + monthlyContribution * ((growth - 1) / i);
}

/**
 * Menyusun proyeksi investasi DETAIL dari setoran bulanan yang sudah dihitung.
 *
 * Semua angka deterministik dan diturunkan dari FV-of-annuity yang sama dengan
 * `calculateMonthlyContribution` (bukan LLM):
 *   - `futureValue`: nilai akhir terproyeksi (PV tumbuh + anuitas PMT).
 *   - `totalContributed`: modal yang disetor sendiri = PV + PMT*n.
 *   - `totalGrowth`: hasil pertumbuhan = futureValue - totalContributed (≥ 0).
 *   - `perInstrument`: tiap slice komposisi diberi porsi setoran bulanan
 *     (PMT × persentase), estimasi return per instrumen (via `categoryReturn`,
 *     fallback ke `annualReturn` portofolio bila label tak dikenal), serta
 *     proyeksi akhir per slice (futureValue/totalContributed/totalGrowth) yang
 *     diturunkan dari porsi PV + setoran slice memakai return instrumen itu.
 *     Karena tiap slice memakai return sendiri, jumlah FV antar-slice bisa
 *     sedikit berbeda dari FV agregat portofolio (perkiraan per instrumen).
 *
 * Pembulatan: nominal Rupiah dibulatkan ke rupiah terdekat; persentase &
 * annualReturn dibiarkan apa adanya (desimal). Porsi bulanan dibulatkan dengan
 * largest-remainder agar totalnya tepat = round(monthlyContribution).
 *
 * @throws {Error} bila input numerik tidak valid.
 */
export function projectInvestment(params: {
  presentValue: number;
  monthlyContribution: number;
  annualReturn: number;
  horizonMonths: number;
  composition: AllocationSlice[];
}): InvestmentProjection {
  const { presentValue, monthlyContribution, annualReturn, horizonMonths, composition } =
    params;

  if (!Number.isFinite(presentValue) || presentValue < 0) {
    throw new Error("presentValue harus berupa angka non-negatif.");
  }
  if (!Number.isFinite(monthlyContribution) || monthlyContribution < 0) {
    throw new Error("monthlyContribution harus berupa angka non-negatif.");
  }
  if (!Number.isFinite(annualReturn) || annualReturn < 0) {
    throw new Error("annualReturn harus berupa angka non-negatif.");
  }
  if (!Number.isFinite(horizonMonths) || horizonMonths <= 0) {
    throw new Error("horizonMonths harus berupa angka positif.");
  }
  if (!Array.isArray(composition)) {
    throw new Error("composition harus berupa array.");
  }

  const n = horizonMonths;
  const pmt = Math.round(monthlyContribution);

  const futureValue = Math.round(
    futureValueOf(presentValue, monthlyContribution, annualReturn, n),
  );
  const totalContributed = Math.round(presentValue + monthlyContribution * n);
  const totalGrowth = Math.max(0, futureValue - totalContributed);

  // Porsi setoran bulanan per instrumen (largest-remainder → total = pmt).
  const rawMonthly = composition.map((s) => (monthlyContribution * s.percentage) / 100);
  const floors = rawMonthly.map((v) => Math.floor(v));
  let remainder = pmt - floors.reduce((a, b) => a + b, 0);
  const order = rawMonthly
    .map((v, idx) => ({ idx, frac: v - Math.floor(v) }))
    .sort((a, b) => b.frac - a.frac);
  const monthlyPerSlice = [...floors];
  for (let k = 0; k < order.length && remainder > 0; k++) {
    monthlyPerSlice[order[k].idx] += 1;
    remainder--;
  }

  const perInstrument: InstrumentProjection[] = composition.map((slice, idx) => {
    const sliceMonthly = monthlyPerSlice[idx] ?? 0;
    // Porsi tabungan awal (PV) dialokasikan ke slice ini sesuai persentase
    // komposisi. Dipakai agar FV per instrumen juga menumbuhkan bagian PV-nya.
    const pvShare = (presentValue * slice.percentage) / 100;
    // Return per instrumen via kategori; fallback ke return portofolio gabungan.
    const sliceReturn = categoryReturn(slice.instrument, annualReturn);
    // FV per instrumen memakai return instrumen itu sendiri (bukan blended),
    // agar rincian mencerminkan karakter tiap instrumen. Konsekuensinya jumlah
    // FV antar-slice bisa sedikit berbeda dari FV agregat (return berbeda per
    // slice) — UI menandai ini sebagai perkiraan per instrumen.
    const sliceFutureValue = Math.round(
      futureValueOf(pvShare, sliceMonthly, sliceReturn, n),
    );
    const sliceContributed = Math.round(pvShare + sliceMonthly * n);
    const sliceGrowth = Math.max(0, sliceFutureValue - sliceContributed);
    return {
      instrument: slice.instrument,
      percentage: slice.percentage,
      monthlyAmount: sliceMonthly,
      annualReturn: sliceReturn,
      futureValue: sliceFutureValue,
      totalContributed: sliceContributed,
      totalGrowth: sliceGrowth,
    };
  });

  return {
    monthlyContribution: pmt,
    horizonMonths: n,
    annualReturn,
    presentValue: Math.round(presentValue),
    futureValue,
    totalContributed,
    totalGrowth,
    perInstrument,
  };
}
