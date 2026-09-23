// Emergency Fund Waterfall — logika murni (pure function) tanpa I/O, UI, DB.
// Menilai kesiapan dana darurat dari rasio likuiditas
// `coverage = currentSavings / expense` dan mengklasifikasikannya menjadi
// tier VULNERABLE / ADEQUATE / STRONG.
//
// Requirement 3.1 (usp-enhancements):
// - coverage < 3.0 bulan             → VULNERABLE
// - 3.0 ≤ coverage ≤ 6.0 bulan       → ADEQUATE
// - coverage > 6.0 bulan             → STRONG

import type { EmergencyFundAnalysis, EmergencyFundTier } from "@/types/usp";

/** Target ideal dana darurat: 6 bulan pengeluaran. */
const TARGET_MONTHS = 6;

const ADVISORY: Record<EmergencyFundTier, string> = {
  VULNERABLE:
    "Dana darurat Anda masih di bawah 3 bulan pengeluaran. Prioritaskan akumulasi instrumen likuid (RDPU/tabungan) sebelum aset berisiko tinggi.",
  ADEQUATE:
    "Dana darurat Anda memadai (3–6 bulan). Seimbangkan antara menambah tabungan likuid dan investasi.",
  STRONG:
    "Dana darurat Anda sangat kuat (> 6 bulan). Anda siap berinvestasi secara terukur.",
};

/**
 * Menilai kesiapan dana darurat dari tabungan likuid dan pengeluaran bulanan.
 *
 * Bila `expense` tidak valid (≤ 0 / bukan angka berhingga), belum ada dasar
 * hitung — kembalikan tier netral `ADEQUATE` dengan pesan edukatif.
 * Pembulatan hanya pada `coverageMonths` (1 desimal) dan `shortfallAmount`
 * (Rupiah); klasifikasi tier memakai rasio mentah.
 */
export function evaluateEmergencyFund(
  currentSavings: number,
  expense: number,
): EmergencyFundAnalysis {
  if (!Number.isFinite(expense) || expense <= 0) {
    return {
      coverageMonths: 0,
      tier: "ADEQUATE",
      targetMonths: TARGET_MONTHS,
      shortfallAmount: 0,
      advisoryMessage: "Belum ada data pengeluaran bulanan yang tercatat.",
    };
  }

  // Tabungan tidak valid/negatif diperlakukan sebagai 0 (tidak ada likuiditas).
  const savings = Number.isFinite(currentSavings) && currentSavings > 0 ? currentSavings : 0;

  const coverage = savings / expense;
  const targetAmount = expense * TARGET_MONTHS;
  const shortfall = Math.max(0, targetAmount - savings);

  let tier: EmergencyFundTier;
  if (coverage < 3) {
    tier = "VULNERABLE";
  } else if (coverage <= TARGET_MONTHS) {
    tier = "ADEQUATE";
  } else {
    tier = "STRONG";
  }

  return {
    coverageMonths: Number(coverage.toFixed(1)),
    tier,
    targetMonths: TARGET_MONTHS,
    shortfallAmount: Math.round(shortfall),
    advisoryMessage: ADVISORY[tier],
  };
}
