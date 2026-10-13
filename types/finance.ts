export type RiskProfile = "Konservatif" | "Moderat" | "Agresif";

// Bucket horizon hasil klasifikasi jangka waktu (dinyatakan dalam bulan):
// "<2" = < 24 bulan, "2-5" = 24..60 bulan, ">5" = > 60 bulan.
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
  horizonMonths: number; // jangka waktu dalam bulan
}

export interface ProjectionInput {
  futureValue: number; // FV = target
  presentValue: number; // PV = tabungan saat ini
  annualReturn: number; // desimal
  horizonMonths: number; // jangka waktu dalam bulan
}

// Rincian proyeksi per instrumen (slice komposisi).
export interface InstrumentProjection {
  instrument: string; // nama/label instrumen (slice)
  percentage: number; // 0..100, porsi dari komposisi
  monthlyAmount: number; // Rupiah = monthlyContribution * percentage / 100
  annualReturn: number; // desimal, estimasi return instrumen tsb
}

// Hasil proyeksi detail dari setoran bulanan yang sudah dihitung.
export interface InvestmentProjection {
  monthlyContribution: number; // echo PMT (Rupiah/bln)
  horizonMonths: number; // jangka waktu (bulan)
  annualReturn: number; // desimal, return gabungan portofolio
  presentValue: number; // tabungan awal (PV)
  futureValue: number; // nilai akhir terproyeksi (FV dari PV + anuitas PMT)
  totalContributed: number; // PV + PMT*n (total modal yang disetor sendiri)
  totalGrowth: number; // futureValue - totalContributed (hasil pertumbuhan)
  perInstrument: InstrumentProjection[]; // breakdown per slice (porsi + return)
}
