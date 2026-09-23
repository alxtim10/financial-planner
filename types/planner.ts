// DIUBAH (Req 15.1): union preset diperluas dengan "custom".
export type PresetId = "50/30/20" | "70/20/10" | "80/20" | "custom";

// Alias untuk preset TETAP (tanpa "custom"). Dipakai presets.ts agar
// BUDGET_PRESETS bertipe Record<FixedPresetId, BudgetPreset> (tetap 3 preset).
export type FixedPresetId = Exclude<PresetId, "custom">;

// TAMBAHAN (Req 15): persentase kustom untuk tiga kategori tetap (0..100).
export interface CustomAllocation {
  kebutuhan: number; // >= 0, berhingga
  keinginan: number; // >= 0, berhingga
  ditabung: number; // >= 0, berhingga (Savings_Bucket)
}

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
  reachable: boolean; // false bila monthlySaving<=0 tanpa pertumbuhan (dan PV<target)
  months: number | null; // null saat reachable === false; 0 bila alreadyReached
  alreadyReached: boolean; // TAMBAHAN (Req 13.6): presentValue >= targetAmount → target sudah tercapai
}

// Hasil proyeksi lengkap yang dikembalikan API + dirender di UI.
export interface SavingsProjection {
  direction: SavingsProjectionDirection;
  targetAmount: number; // Savings_Target_Amount (Rupiah)
  horizonMonths: number | null; // Savings_Horizon dalam bulan (null pada Arah A)
  monthlySavingRate: number; // Monthly_Saving_Rate = savingsBucketAmount(breakdown)
  annualReturn: number; // Growth_Rate dipakai (0 pada terpisah / fallback)
  // TAMBAHAN (Req 13, 14) — konteks present value:
  includeSavings: boolean; // Include_Savings: apakah currentSavings dipakai sebagai saldo awal
  presentValue: number; // Present_Value dipakai (currentSavings bila includeSavings, else 0)
  alreadyReached: boolean; // Already_Reached: presentValue >= targetAmount
  // Arah A (time-to-goal):
  reachable: boolean; // false → "tidak akan tercapai dengan alokasi saat ini"
  months: number | null; // estimasi bulan (null bila tidak reachable / Arah B)
  years: number | null; // months / 12 (untuk tampilan "~Y tahun")
  // Arah B (required-monthly):
  requiredMonthly: number | null; // Required_Monthly_Saving (null pada Arah A)
  allocationSufficient: boolean | null; // monthlySavingRate >= requiredMonthly
  monthlyGap: number | null; // max(0, requiredMonthly - monthlySavingRate)
}

// ============================================================================
// Tipe Domain Goal-Driven (Req 17–21) — TAMBAHAN.
// Tipe preset/persentase di atas TETAP ADA tetapi disuperseksi untuk alur ini.
// `BudgetLine` (di atas) dipakai ulang untuk ketiga pos; `percentage` = Derived_Percentage.
// ============================================================================

// Input goal-driven yang diterima computeGoalBudget (nilai presisi, Rupiah).
export interface GoalBudgetInput {
  monthlyIncome: number; // > 0, berhingga
  currentSavings: number; // >= 0, berhingga (saldo awal, selalu dihitung)
  targetAmount: number; // > 0, berhingga
  horizonMonths: number; // bilangan bulat positif (jangka waktu dalam bulan)
  monthlyExpense: number; // >= 0, berhingga (0 → fallback rasio)
}

export type FeasibilitySeverity = "ok" | "tight" | "impossible";

export interface GoalFeasibility {
  feasible: boolean; // false bila ditabung+kebutuhan > income
  severity: FeasibilitySeverity; // "ok" | "tight" | "impossible"
  reason: string; // pesan + saran (Bahasa Indonesia) untuk UI
}

export interface GoalBudgetResult {
  monthlyIncome: number; // echo input (dasar Derived_Percentage)
  monthsN: number; // = horizonMonths (jumlah bulan)
  ditabung: number; // akumulasi murni per bulan (tak pernah negatif)
  kebutuhan: number; // dari monthlyExpense atau fallback rasio
  keinginan: number; // monthlyIncome - ditabung - kebutuhan
  ditabungPct: number; // Derived_Percentage
  kebutuhanPct: number; // Derived_Percentage
  keinginanPct: number; // Derived_Percentage
  lines: BudgetLine[]; // tiga pos (Kebutuhan/Keinginan/Ditabung); percentage = Derived_Percentage; isSavings true hanya untuk Ditabung
  alreadyReached: boolean; // currentSavings >= targetAmount → ditabung 0
  feasibility: GoalFeasibility;
}
