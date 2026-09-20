export type RiskProfile = "Konservatif" | "Moderat" | "Agresif";

// Bucket horizon hasil klasifikasi tahun.
export type HorizonBucket = "<2" | "2-5" | ">5";

export interface AllocationSlice {
  instrument: string; // mis. "RDPU", "SBN/Deposito", "Saham/Indeks"
  percentage: number; // 0..100
}

export interface Allocation {
  composition: AllocationSlice[]; // total percentage = 100
  annualReturn: number; // desimal, mis. 0.055 untuk 5.5%
}

export interface Goal {
  targetAmount: number; // FV
  horizonYears: number;
}

export interface ProjectionInput {
  futureValue: number; // FV = target
  presentValue: number; // PV = tabungan saat ini
  annualReturn: number; // desimal
  horizonYears: number;
}
