import type { RiskProfile } from "@/types/finance";

/**
 * Skoring profil risiko (pure function — tanpa I/O, UI, atau DB).
 *
 * Menjumlahkan bobot jawaban survei menjadi `score`, lalu mengklasifikasikan
 * ke `RiskProfile` melalui ambang batas TETAP, deterministik, dan MONOTON
 * (skor lebih tinggi tidak pernah menghasilkan profil yang lebih konservatif).
 *
 * Requirements: 3.1 (hitung skor total), 3.2 (klasifikasi ke salah satu dari
 * Konservatif/Moderat/Agresif), 3.3 (pemetaan deterministik via ambang tetap).
 *
 * === Skema Survei & Ambang Batas TETAP (kontrak untuk UI Survei — Task 7) ===
 *
 * Survei terdiri dari 5 pertanyaan. Setiap jawaban adalah bobot bilangan bulat
 * pada rentang 1..3 (1 = paling konservatif, 3 = paling agresif). Dengan
 * demikian rentang skor total adalah 5..15.
 *
 * Ambang batas (berlaku pada skor total, inklusif):
 *   - score <= 8   -> "Konservatif"   (rentang 5..8)
 *   - 9 <= score <= 12  -> "Moderat"  (rentang 9..12)
 *   - score >= 13  -> "Agresif"       (rentang 13..15)
 *
 * Ambang batas ini adalah konstanta yang diekspor (CONSERVATIVE_MAX,
 * MODERATE_MAX) sehingga UI Survei dapat menyelaraskan jumlah pertanyaan dan
 * rentang bobot jawaban. Klasifikasi hanya bergantung pada nilai `score`,
 * bukan pada jumlah jawaban, sehingga fungsi tetap kokoh untuk survei dengan
 * jumlah pertanyaan berbeda (skor lebih tinggi selalu >= profil sebelumnya).
 */

/** Skor maksimum (inklusif) yang masih diklasifikasikan sebagai "Konservatif". */
export const CONSERVATIVE_MAX = 8;

/** Skor maksimum (inklusif) yang masih diklasifikasikan sebagai "Moderat". */
export const MODERATE_MAX = 12;

/**
 * Menghitung skor risiko total dan profil risiko dari jawaban survei.
 *
 * @param answers - Daftar bobot jawaban survei (mis. tiap elemen 1..3).
 * @returns `{ score, profile }` dengan `score` = jumlah bobot dan `profile`
 *          hasil klasifikasi ambang batas tetap.
 * @throws {Error} jika `answers` kosong atau memuat nilai non-finite/negatif.
 */
export function scoreRisk(answers: number[]): { score: number; profile: RiskProfile } {
  if (!Array.isArray(answers) || answers.length === 0) {
    throw new Error("scoreRisk: answers tidak boleh kosong.");
  }

  for (const answer of answers) {
    if (typeof answer !== "number" || !Number.isFinite(answer) || answer < 0) {
      throw new Error(
        `scoreRisk: setiap jawaban harus berupa angka finite non-negatif, diterima: ${answer}.`,
      );
    }
  }

  const score = answers.reduce((total, answer) => total + answer, 0);
  const profile = classify(score);

  return { score, profile };
}

/**
 * Klasifikasi skor total ke RiskProfile via ambang batas tetap.
 * Monoton: skor lebih tinggi tidak pernah menghasilkan profil lebih konservatif.
 */
function classify(score: number): RiskProfile {
  if (score <= CONSERVATIVE_MAX) return "Konservatif";
  if (score <= MODERATE_MAX) return "Moderat";
  return "Agresif";
}
