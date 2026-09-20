export type PresetId = "50/30/20" | "70/20/10" | "80/20";

export type SavingsMode = "terpisah" | "kombinasi";

export interface BudgetCategory {
  name: string; // mis. "Kebutuhan", "Keinginan", "Tabungan & Investasi"
  percentage: number; // 0..100
  isSavings: boolean; // menandai Savings_Bucket preset
}

export interface BudgetPreset {
  id: PresetId;
  label: string; // mis. "50/30/20"
  categories: BudgetCategory[]; // total percentage = 100
}

export interface BudgetLine {
  name: string;
  percentage: number;
  amount: number; // Rupiah = baseAmount * percentage / 100
  isSavings: boolean;
}

export interface BudgetBreakdown {
  presetId: PresetId;
  baseAmount: number;
  lines: BudgetLine[]; // total amount ~= baseAmount (toleransi pembulatan)
}

export interface ShortfallResult {
  hasShortfall: boolean;
  savingsBucketAmount: number; // total alokasi Savings_Bucket preset (Rupiah)
  investmentContribution: number; // monthlyContribution dari rekomendasi (0 bila tak ada)
  gap: number; // max(0, investmentContribution - savingsBucketAmount)
}
