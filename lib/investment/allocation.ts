// Allocation_Engine — logika murni (pure functions) tanpa I/O, UI, atau DB.
// Memetakan (Horizon, Risk_Profile) ke komposisi alokasi dan estimasi return
// tahunan berdasarkan Allocation_Matrix. Lihat design.md → "Allocation Matrix"
// dan requirements.md Requirement 4 (Acceptance Criteria 4.1–4.10).

import type {
  RiskProfile,
  HorizonBucket,
  AllocationSlice,
  Allocation,
} from "@/types/finance";

const VALID_RISK_PROFILES: readonly RiskProfile[] = [
  "Konservatif",
  "Moderat",
  "Agresif",
];

/**
 * Allocation_Matrix sebagai konstanta terstruktur.
 *
 * Bucket "<2" mengabaikan Risk_Profile (Req 4.2) sehingga direpresentasikan
 * sebagai satu Allocation. Bucket "2-5" dan ">5" dipetakan per Risk_Profile.
 * annualReturn dalam bentuk desimal (mis. 0.055 untuk 5,5%).
 * Setiap composition memiliki total percentage tepat 100 (Req 4.10).
 */
const ALLOCATION_MATRIX: {
  "<2": Allocation;
  "2-5": Record<RiskProfile, Allocation>;
  ">5": Record<RiskProfile, Allocation>;
} = {
  "<2": {
    composition: [{ instrument: "RDPU", percentage: 100 }],
    annualReturn: 0.0475,
  },
  "2-5": {
    Konservatif: {
      composition: [
        { instrument: "RDPU", percentage: 70 },
        { instrument: "SBN/Deposito", percentage: 30 },
      ],
      annualReturn: 0.055,
    },
    Moderat: {
      composition: [
        { instrument: "RDPU", percentage: 50 },
        { instrument: "Emas/SBN Ritel", percentage: 50 },
      ],
      annualReturn: 0.065,
    },
    Agresif: {
      composition: [
        { instrument: "RDPU", percentage: 30 },
        { instrument: "SBN/RDPT", percentage: 40 },
        { instrument: "Emas", percentage: 30 },
      ],
      annualReturn: 0.075,
    },
  },
  ">5": {
    Konservatif: {
      composition: [
        { instrument: "SBN/RDPT", percentage: 50 },
        { instrument: "Emas", percentage: 30 },
        { instrument: "Saham", percentage: 20 },
      ],
      annualReturn: 0.07,
    },
    Moderat: {
      composition: [
        { instrument: "Saham/Indeks", percentage: 40 },
        { instrument: "SBN", percentage: 40 },
        { instrument: "Emas", percentage: 20 },
      ],
      annualReturn: 0.095,
    },
    Agresif: {
      composition: [
        { instrument: "Saham/Indeks", percentage: 70 },
        { instrument: "SBN", percentage: 20 },
        { instrument: "Emas", percentage: 10 },
      ],
      annualReturn: 0.11,
    },
  },
};

/**
 * Mengelompokkan horizon (dalam tahun) ke bucket:
 * - horizonYears < 2        → "<2"
 * - 2 <= horizonYears <= 5  → "2-5" (batas 2 dan 5 inklusif)
 * - horizonYears > 5        → ">5"
 *
 * Melempar Error untuk horizon non-positif (Req 4.9).
 */
export function bucketHorizon(horizonYears: number): HorizonBucket {
  if (!Number.isFinite(horizonYears) || horizonYears <= 0) {
    throw new Error(
      `Horizon tidak valid: harus bernilai positif, diterima ${horizonYears}.`
    );
  }

  if (horizonYears < 2) return "<2";
  if (horizonYears <= 5) return "2-5";
  return ">5";
}

function isValidRiskProfile(value: unknown): value is RiskProfile {
  return (
    typeof value === "string" &&
    (VALID_RISK_PROFILES as readonly string[]).includes(value)
  );
}

function cloneAllocation(allocation: Allocation): Allocation {
  return {
    composition: allocation.composition.map(
      (slice): AllocationSlice => ({ ...slice })
    ),
    annualReturn: allocation.annualReturn,
  };
}

/**
 * Memetakan (horizonYears, riskProfile) ke Allocation sesuai Allocation_Matrix.
 *
 * - Untuk bucket "<2", riskProfile diabaikan (Req 4.2).
 * - Melempar Error untuk input tidak valid: horizon non-positif atau
 *   riskProfile di luar {Konservatif, Moderat, Agresif} (Req 4.9).
 *
 * Mengembalikan salinan baru agar konstanta matriks tidak termutasi pemanggil.
 */
export function getAllocation(
  horizonYears: number,
  riskProfile: RiskProfile
): Allocation {
  // bucketHorizon memvalidasi horizon non-positif dan melempar error.
  const bucket = bucketHorizon(horizonYears);

  if (bucket === "<2") {
    // Risk_Profile diabaikan untuk horizon pendek (Req 4.2).
    return cloneAllocation(ALLOCATION_MATRIX["<2"]);
  }

  if (!isValidRiskProfile(riskProfile)) {
    throw new Error(
      `Risk_Profile tidak valid: harus salah satu dari ${VALID_RISK_PROFILES.join(
        ", "
      )}, diterima ${String(riskProfile)}.`
    );
  }

  return cloneAllocation(ALLOCATION_MATRIX[bucket][riskProfile]);
}
