// Planner budget — logika murni (pure functions) tanpa I/O, UI, atau DB.
// Menghitung Budget_Breakdown dari Base_Amount + preset, menjumlahkan alokasi
// Savings_Bucket, dan mengevaluasi Savings_Shortfall untuk mode kombinasi.
// Lihat design.md → "Components → budget.ts" dan "Correctness Properties",
// serta requirements.md Requirement 4 (4.1–4.5), Requirement 6 (6.1–6.4),
// dan Requirement 10 (10.1). Mengikuti pola pure function `lib/investment/*`.

import type {
  BudgetBreakdown,
  BudgetLine,
  PresetId,
  ShortfallResult,
} from "@/types/planner";
import { getPreset } from "@/lib/planner/presets";

/**
 * Menghitung `Budget_Breakdown` dari `baseAmount` dan preset terpilih.
 *
 * Untuk setiap kategori preset, `amount = baseAmount * percentage / 100`
 * (Req 4.2). Karena persentase preset berjumlah 100 (Req 3.5), jumlah seluruh
 * `lines[].amount` sama dengan `baseAmount` secara eksak dalam aritmetika riil;
 * amount SENGAJA tidak dibulatkan di sini agar total tetap presisi — pembulatan
 * Rupiah hanya dilakukan di lapisan tampilan (Req 4.2, 4.3).
 *
 * Guard (Req 4.5): melempar Error bila `baseAmount` bukan angka berhingga yang
 * tidak negatif (negatif, `NaN`, atau tak hingga). Preset id yang tidak dikenal
 * ditolak melalui `getPreset`, yang melempar Error (Req 3.7).
 */
export function computeBudget(
  baseAmount: number,
  presetId: PresetId
): BudgetBreakdown {
  if (!Number.isFinite(baseAmount) || baseAmount < 0) {
    throw new Error(
      `Base_Amount tidak valid: harus angka berhingga yang tidak negatif, diterima ${String(
        baseAmount
      )}.`
    );
  }

  // Melempar Error bila presetId tidak dikenal (Req 3.7).
  const preset = getPreset(presetId);

  const lines: BudgetLine[] = preset.categories.map((category) => ({
    name: category.name,
    percentage: category.percentage,
    amount: (baseAmount * category.percentage) / 100,
    isSavings: category.isSavings,
  }));

  return {
    presetId,
    baseAmount,
    lines,
  };
}

/**
 * Menjumlahkan `amount` seluruh pos yang menandai Savings_Bucket
 * (`isSavings === true`) dari sebuah `Budget_Breakdown`. Setiap preset memiliki
 * minimal satu pos savings, sehingga hasilnya merepresentasikan total alokasi
 * tabungan preset.
 */
export function savingsBucketAmount(breakdown: BudgetBreakdown): number {
  return breakdown.lines
    .filter((line) => line.isSavings)
    .reduce((total, line) => total + line.amount, 0);
}

/**
 * Mengevaluasi `Savings_Shortfall` untuk mode kombinasi (Req 6.1–6.4).
 *
 * - `hasShortfall` bernilai benar jika dan hanya jika alokasi Savings_Bucket
 *   lebih kecil dari kontribusi investasi yang diperlukan.
 * - `gap = max(0, investmentContribution - savingsBucketAmount)`.
 *
 * Kedua input diharapkan tidak negatif dan berhingga; guard tetap dipasang agar
 * robust dan konsisten dengan gaya pure function lain di codebase.
 */
export function evaluateShortfall(
  savingsBucketAmount: number,
  investmentContribution: number
): ShortfallResult {
  if (!Number.isFinite(savingsBucketAmount) || savingsBucketAmount < 0) {
    throw new Error(
      `savingsBucketAmount tidak valid: harus angka berhingga yang tidak negatif, diterima ${String(
        savingsBucketAmount
      )}.`
    );
  }

  if (!Number.isFinite(investmentContribution) || investmentContribution < 0) {
    throw new Error(
      `investmentContribution tidak valid: harus angka berhingga yang tidak negatif, diterima ${String(
        investmentContribution
      )}.`
    );
  }

  const hasShortfall = savingsBucketAmount < investmentContribution;
  const gap = Math.max(0, investmentContribution - savingsBucketAmount);

  return {
    hasShortfall,
    savingsBucketAmount,
    investmentContribution,
    gap,
  };
}
