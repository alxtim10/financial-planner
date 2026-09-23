export type TradeOffType = "EXTEND_HORIZON" | "REDUCE_TARGET" | "REDUCE_WANTS";

export interface TradeOffOption {
  type: TradeOffType;
  title: string;
  description: string;
  currentValue: number;
  suggestedValue: number;
  unit: string;
  impactSummary: string;
  actionPayload: {
    targetAmount?: number;
    horizonMonths?: number;
    monthlyExpense?: number;
  };
}

export interface TradeOffInput {
  monthlyIncome: number;
  monthlyExpense: number;
  currentSavings: number;
  targetAmount: number;
  horizonMonths: number;
  ditabung: number;
  kebutuhan: number;
  keinginan: number;
}

export type EmergencyFundTier = "VULNERABLE" | "ADEQUATE" | "STRONG";

export interface EmergencyFundAnalysis {
  /** Rasio tabungan likuid terhadap pengeluaran bulanan (dibulatkan 1 desimal). */
  coverageMonths: number;
  tier: EmergencyFundTier;
  /** Target bulan pengeluaran ideal (standar 6 bulan). */
  targetMonths: number;
  /** Kekurangan nominal untuk mencapai target dana darurat (0 bila sudah cukup). */
  shortfallAmount: number;
  advisoryMessage: string;
}

export interface FinancialTwinSnapshot {
  hasProfile: boolean;
  income?: number;
  expense?: number;
  currentSavings?: number;
  emergencyFundCoverageMonths?: number;
  emergencyTier?: EmergencyFundTier;
  activeGoal?: {
    name?: string | null;
    targetAmount: number;
    horizonMonths: number;
  };
  riskProfile?: string;
  latestBudget?: {
    feasibility: "ok" | "tight" | "impossible";
    ditabung: number;
    kebutuhan: number;
    keinginan: number;
  };
}
