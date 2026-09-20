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

// Arah proyeksi: "time-to-goal" (target tanpa horizon) atau "required-monthly"
// (target + horizon). "none" bila target tidak diisi (tanpa proyeksi).
export type SavingsProjectionDirection = "none" | "time-to-goal" | "required-monthly";

// Hasil Arah A (Time_To_Goal): berapa bulan untuk mencapai target.
export interface MonthsToReachResult {
  reachable: boolean; // false bila monthlySaving<=0 tanpa pertumbuhan
  months: number | null; // null saat reachable === false
}

// Hasil proyeksi lengkap yang dikembalikan API + dirender di UI.
export interface SavingsProjection {
  direction: SavingsProjectionDirection;
  targetAmount: number; // Savings_Target_Amount (Rupiah)
  horizonYears: number | null; // Savings_Horizon (null pada Arah A)
  monthlySavingRate: number; // Monthly_Saving_Rate = savingsBucketAmount(breakdown)
  annualReturn: number; // Growth_Rate dipakai (0 pada terpisah / fallback)
  // Arah A (time-to-goal):
  reachable: boolean; // false → "tidak akan tercapai dengan alokasi saat ini"
  months: number | null; // estimasi bulan (null bila tidak reachable / Arah B)
  years: number | null; // months / 12 (untuk tampilan "~Y tahun")
  // Arah B (required-monthly):
  requiredMonthly: number | null; // Required_Monthly_Saving (null pada Arah A)
  allocationSufficient: boolean | null; // monthlySavingRate >= requiredMonthly
  monthlyGap: number | null; // max(0, requiredMonthly - monthlySavingRate)
}
