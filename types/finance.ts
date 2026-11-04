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

// ============================================================================
// Multi-tujuan (multi-goal) — satu rencana bisa punya beberapa tujuan/kategori.
// Alokasi investasi tetap TUNGGAL (satu profil risiko → satu komposisi), yang
// bercabang adalah target & jangka waktu per tujuan.
// ============================================================================

// Satu tujuan sebagai input agregasi (nama opsional untuk label tampilan).
export interface GoalInput {
  id?: string; // id Goal (opsional; dipakai UI/penandaan per-tujuan)
  name?: string | null; // label opsional, mis. "Beli Rumah"
  targetAmount: number; // > 0, berhingga (FV tujuan ini)
  horizonMonths: number; // bilangan bulat positif (jangka waktu tujuan ini)
}

// Hasil agregasi beberapa tujuan menjadi satu parameter perhitungan tunggal
// (opsi A): target = total, horizon = rata-rata tertimbang oleh target.
export interface AggregatedGoals {
  totalTargetAmount: number; // Σ targetAmount
  weightedHorizonMonths: number; // Σ(target × horizon) / Σ target, dibulatkan ke bilangan bulat
  goalCount: number; // jumlah tujuan yang diagregasi
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
  // Proyeksi akhir per instrumen (deterministik, diturunkan dari porsi PV +
  // setoran bulanan slice ini memakai return instrumen tsb). Penjumlahan
  // lintas slice konsisten dengan angka agregat portofolio.
  futureValue: number; // nilai akhir terproyeksi slice ini (Rupiah)
  totalContributed: number; // modal disetor slice ini = porsi PV + monthlyAmount*n
  totalGrowth: number; // hasil pertumbuhan slice ini = futureValue - totalContributed
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
