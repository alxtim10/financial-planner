import type { TradeOffInput, TradeOffOption } from "@/types/usp";

/**
 * Menghitung opsi penyesuaian (Trade-Off) saat rencana anggaran goal-driven
 * berstatus "tight" atau "impossible".
 *
 * Logika murni (pure function):
 * 1. EXTEND_HORIZON: Menghitung jangka waktu baru agar setoran bulanan muat dalam surplus pemasukan.
 * 2. REDUCE_TARGET: Menghitung target dana baru yang realistis dalam jangka waktu saat ini.
 * 3. REDUCE_WANTS: Memberikan saran target pengeluaran/pemangkasan biaya jika pengeluaran terlalu tinggi.
 */
export function computeTradeOffs(input: TradeOffInput): TradeOffOption[] {
  const {
    monthlyIncome,
    monthlyExpense,
    currentSavings,
    targetAmount,
    horizonMonths,
    kebutuhan,
  } = input;

  if (
    !Number.isFinite(monthlyIncome) ||
    monthlyIncome <= 0 ||
    !Number.isFinite(targetAmount) ||
    targetAmount <= 0 ||
    !Number.isInteger(horizonMonths) ||
    horizonMonths <= 0
  ) {
    return [];
  }

  const netNeeded = Math.max(0, targetAmount - currentSavings);
  if (netNeeded <= 0) {
    return [];
  }

  const effectiveKebutuhan =
    Number.isFinite(kebutuhan) && kebutuhan > 0
      ? kebutuhan
      : Number.isFinite(monthlyExpense) && monthlyExpense > 0
        ? monthlyExpense
        : 0.65 * monthlyIncome;

  // Sisakan minimal 5% pemasukan untuk alokasi keinginan/buffer
  const buffer = 0.05 * monthlyIncome;
  const maxSafeMonthlySavings = Math.max(0, monthlyIncome - effectiveKebutuhan - buffer);

  const options: TradeOffOption[] = [];

  // 1. EXTEND_HORIZON
  if (maxSafeMonthlySavings > 0) {
    const suggestedHorizon = Math.ceil(netNeeded / maxSafeMonthlySavings);
    if (suggestedHorizon > horizonMonths) {
      const newMonthlySaving = Math.round(netNeeded / suggestedHorizon);
      const deltaMonths = suggestedHorizon - horizonMonths;
      options.push({
        type: "EXTEND_HORIZON",
        title: "Perpanjang Jangka Waktu",
        description: `Perpanjang jangka waktu menjadi ${suggestedHorizon} bulan agar setoran bulanan turun menjadi Rp ${newMonthlySaving.toLocaleString("id-ID")}/bln (sesuai kapasitas aman Anda).`,
        currentValue: horizonMonths,
        suggestedValue: suggestedHorizon,
        unit: "bulan",
        impactSummary: `+${deltaMonths} bulan lebih lama`,
        actionPayload: {
          horizonMonths: suggestedHorizon,
        },
      });
    }
  }

  // 2. REDUCE_TARGET
  if (maxSafeMonthlySavings > 0) {
    const rawSuggestedTarget = Math.floor(maxSafeMonthlySavings * horizonMonths) + currentSavings;
    // Bulatkan ke kelipatan 500.000 atau 1.000.000 terdekat untuk kemudahan pengguna
    const suggestedTarget = Math.max(
      1000000,
      Math.floor(rawSuggestedTarget / 500000) * 500000,
    );

    if (suggestedTarget < targetAmount && suggestedTarget > currentSavings) {
      const deltaAmount = targetAmount - suggestedTarget;
      options.push({
        type: "REDUCE_TARGET",
        title: "Sesuaikan Nominal Target",
        description: `Rasionalisasikan target dana menjadi Rp ${suggestedTarget.toLocaleString("id-ID")} agar dapat tercapai dalam ${horizonMonths} bulan tanpa membebani arus kas.`,
        currentValue: targetAmount,
        suggestedValue: suggestedTarget,
        unit: "Rupiah",
        impactSummary: `Penyesuaian -Rp ${deltaAmount.toLocaleString("id-ID")}`,
        actionPayload: {
          targetAmount: suggestedTarget,
        },
      });
    }
  }

  // 3. REDUCE_WANTS / TRIM EXPENSE (jika pengeluaran memakan porsi besar)
  if (effectiveKebutuhan > 0.5 * monthlyIncome) {
    const currentDitabung = netNeeded / horizonMonths;
    const requiredExpenseCap = Math.max(
      0.35 * monthlyIncome,
      Math.floor((monthlyIncome - currentDitabung - buffer) / 100000) * 100000,
    );

    if (requiredExpenseCap < effectiveKebutuhan && requiredExpenseCap > 0) {
      const savingsPerMonth = Math.round(effectiveKebutuhan - requiredExpenseCap);
      options.push({
        type: "REDUCE_WANTS",
        title: "Efisiensikan Pengeluaran",
        description: `Pangkas pos pengeluaran menjadi Rp ${requiredExpenseCap.toLocaleString("id-ID")}/bln untuk mencukupi setoran target Anda.`,
        currentValue: effectiveKebutuhan,
        suggestedValue: requiredExpenseCap,
        unit: "Rupiah/bln",
        impactSummary: `Hemat Rp ${savingsPerMonth.toLocaleString("id-ID")}/bln`,
        actionPayload: {
          monthlyExpense: requiredExpenseCap,
        },
      });
    }
  }

  return options;
}
