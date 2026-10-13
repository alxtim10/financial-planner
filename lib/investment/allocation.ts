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
 * Mengelompokkan horizon (dalam bulan) ke bucket. Ambang setara aturan lama
 * berbasis tahun (× 12): < 2 tahun = < 24 bulan, 2..5 tahun = 24..60 bulan,
 * > 5 tahun = > 60 bulan.
 * - horizonMonths < 24         → "<2"
 * - 24 <= horizonMonths <= 60  → "2-5" (batas 24 dan 60 inklusif)
 * - horizonMonths > 60         → ">5"
 *
 * Melempar Error untuk horizon non-positif (Req 4.9).
 */
export function bucketHorizon(horizonMonths: number): HorizonBucket {
  if (!Number.isFinite(horizonMonths) || horizonMonths <= 0) {
    throw new Error(
      `Horizon tidak valid: harus bernilai positif, diterima ${horizonMonths}.`
    );
  }

  if (horizonMonths < 24) return "<2";
  if (horizonMonths <= 60) return "2-5";
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
 * Memetakan (horizonMonths, riskProfile) ke Allocation sesuai Allocation_Matrix.
 *
 * - Untuk bucket "<2", riskProfile diabaikan (Req 4.2).
 * - Melempar Error untuk input tidak valid: horizon non-positif atau
 *   riskProfile di luar {Konservatif, Moderat, Agresif} (Req 4.9).
 *
 * Mengembalikan salinan baru agar konstanta matriks tidak termutasi pemanggil.
 */
export function getAllocation(
  horizonMonths: number,
  riskProfile: RiskProfile
): Allocation {
  // bucketHorizon memvalidasi horizon non-positif dan melempar error.
  const bucket = bucketHorizon(horizonMonths);

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

// ============================================================================
// Preferensi Instrumen (opsional) — Req pilihan instrumen di survei.
//
// Pengguna boleh memilih instrumen yang diminati pada pertanyaan opsional
// survei. Bila ada pilihan, komposisi hasil difilter ke instrumen terpilih lalu
// dinormalisasi ulang menjadi total 100% (deterministik, bukan LLM). Bila tidak
// ada pilihan, sistem menentukan alokasi penuh via Allocation_Matrix seperti
// biasa.
// ============================================================================

/**
 * Kategori instrumen kanonik yang ditawarkan ke pengguna. Dipakai sebagai
 * kontrak nilai untuk UI survei (opsi) sekaligus kunci pencocokan terhadap
 * label slice matriks yang kerap gabungan (mis. "SBN/Deposito", "Saham/Indeks").
 */
export const INSTRUMENT_CATEGORIES = [
  "RDPU",
  "Deposito/SBN",
  "Emas",
  "Saham/Indeks",
  "RDPT",
] as const;

export type InstrumentCategory = (typeof INSTRUMENT_CATEGORIES)[number];

/**
 * Return tahunan default per kategori (desimal). Dipakai hanya sebagai fallback
 * untuk kategori yang dipilih pengguna TETAPI tidak muncul di komposisi matriks
 * kombinasi (horizon × profil) saat ini. Nilai konservatif, selaras rentang
 * return pada ALLOCATION_MATRIX.
 */
const CATEGORY_DEFAULT_RETURN: Record<InstrumentCategory, number> = {
  RDPU: 0.0475,
  "Deposito/SBN": 0.06,
  Emas: 0.07,
  "Saham/Indeks": 0.11,
  RDPT: 0.075,
};

/**
 * Memetakan label instrumen (dari slice matriks) ke kategori kanonik via kata
 * kunci. Pencocokan berurutan: label spesifik (RDPT, Saham/Indeks) didahulukan
 * sebelum yang lebih umum (SBN) agar "SBN/RDPT" → RDPT dan bukan Deposito/SBN.
 * Mengembalikan null bila tak ada kategori yang cocok.
 */
export function instrumentToCategory(instrument: string): InstrumentCategory | null {
  const s = instrument.toLowerCase();
  if (s.includes("rdpu")) return "RDPU";
  if (s.includes("rdpt")) return "RDPT";
  if (s.includes("saham") || s.includes("indeks")) return "Saham/Indeks";
  if (s.includes("emas")) return "Emas";
  if (s.includes("deposito") || s.includes("sbn")) return "Deposito/SBN";
  return null;
}

/** Validasi apakah sebuah nilai adalah InstrumentCategory kanonik. */
export function isInstrumentCategory(value: unknown): value is InstrumentCategory {
  return (
    typeof value === "string" &&
    (INSTRUMENT_CATEGORIES as readonly string[]).includes(value)
  );
}

/**
 * Membulatkan persentase slice menjadi bilangan bulat yang totalnya tepat 100
 * (metode largest-remainder) agar bar komposisi konsisten dengan input lain.
 */
function roundTo100(values: number[]): number[] {
  if (values.length === 0) return [];
  const floors = values.map((v) => Math.floor(v));
  let remainder = 100 - floors.reduce((a, b) => a + b, 0);
  // Urutkan indeks berdasar bagian pecahan terbesar, lalu +1 sampai habis.
  const order = values
    .map((v, i) => ({ i, frac: v - Math.floor(v) }))
    .sort((a, b) => b.frac - a.frac);
  const result = [...floors];
  for (let k = 0; k < order.length && remainder > 0; k++) {
    result[order[k].i] += 1;
    remainder--;
  }
  return result;
}

/**
 * Menerapkan preferensi instrumen pengguna pada sebuah Allocation.
 *
 * Perilaku:
 * - `selected` kosong / null / undefined → kembalikan salinan `allocation` apa
 *   adanya (sistem yang menentukan).
 * - Ada pilihan → ambil slice matriks yang kategorinya termasuk pilihan,
 *   normalisasi ulang persentasenya ke total 100 (proporsional terhadap bobot
 *   asli), dan recompute `annualReturn` sebagai rata-rata tertimbang slice yang
 *   tersisa.
 * - Kategori yang dipilih tetapi tidak ada di komposisi matriks ditambahkan
 *   dengan bobot sama rata (menghormati pilihan pengguna), memakai
 *   CATEGORY_DEFAULT_RETURN untuk komponen return-nya.
 * - Bila tak satu pun pilihan dapat direalisasikan (mis. input tak dikenal),
 *   fallback ke `allocation` asli agar hasil selalu valid (total 100).
 *
 * Pure function: tidak memutasi argumen.
 */
export function applyInstrumentPreference(
  allocation: Allocation,
  selected: readonly string[] | null | undefined,
): Allocation {
  if (!Array.isArray(selected) || selected.length === 0) {
    return cloneAllocation(allocation);
  }

  // Dedupe + hanya kategori kanonik yang valid.
  const chosen: InstrumentCategory[] = [];
  for (const s of selected) {
    if (isInstrumentCategory(s) && !chosen.includes(s)) chosen.push(s);
  }
  if (chosen.length === 0) {
    return cloneAllocation(allocation);
  }

  // Agregasi bobot matriks per kategori terpilih (gabung slice sekategori).
  const weightByCategory = new Map<InstrumentCategory, number>();
  for (const slice of allocation.composition) {
    const cat = instrumentToCategory(slice.instrument);
    if (cat && chosen.includes(cat)) {
      weightByCategory.set(cat, (weightByCategory.get(cat) ?? 0) + slice.percentage);
    }
  }

  // Kategori terpilih yang tak ada di matriks → bobot sama rata (porsi default).
  const missing = chosen.filter((c) => !weightByCategory.has(c));
  if (weightByCategory.size === 0) {
    // Tak ada irisan dengan matriks: bagi rata seluruh pilihan.
    const even = 100 / chosen.length;
    for (const c of chosen) weightByCategory.set(c, even);
  } else if (missing.length > 0) {
    // Beri kategori yang hilang porsi rata-rata dari bobot yang ada, agar
    // pilihan pengguna tetap terwakili tanpa mendominasi.
    const existingTotal = [...weightByCategory.values()].reduce((a, b) => a + b, 0);
    const avg = existingTotal / weightByCategory.size;
    for (const c of missing) weightByCategory.set(c, avg);
  }

  // Normalisasi ke total 100 + bulatkan ke bilangan bulat (largest-remainder).
  const cats = [...weightByCategory.keys()];
  const rawWeights = cats.map((c) => weightByCategory.get(c)!);
  const sum = rawWeights.reduce((a, b) => a + b, 0);
  const scaled = rawWeights.map((w) => (w / sum) * 100);
  const rounded = roundTo100(scaled);

  const composition: AllocationSlice[] = cats.map((c, i) => ({
    instrument: c,
    percentage: rounded[i],
  }));

  // Return tertimbang: pakai bobot ternormalisasi (rounded) × return kategori.
  // Return per kategori diambil dari rata-rata slice matriks sekategori bila
  // ada; selain itu dari CATEGORY_DEFAULT_RETURN.
  const matrixReturnByCategory = new Map<InstrumentCategory, number>();
  const matrixCountByCategory = new Map<InstrumentCategory, number>();
  for (const slice of allocation.composition) {
    const cat = instrumentToCategory(slice.instrument);
    if (cat && chosen.includes(cat)) {
      matrixReturnByCategory.set(
        cat,
        (matrixReturnByCategory.get(cat) ?? 0) + allocation.annualReturn,
      );
      matrixCountByCategory.set(cat, (matrixCountByCategory.get(cat) ?? 0) + 1);
    }
  }

  let annualReturn = 0;
  cats.forEach((c, i) => {
    const share = rounded[i] / 100;
    const count = matrixCountByCategory.get(c);
    const perCatReturn =
      count && count > 0
        ? matrixReturnByCategory.get(c)! / count
        : CATEGORY_DEFAULT_RETURN[c];
    annualReturn += share * perCatReturn;
  });

  return {
    composition,
    annualReturn: Number(annualReturn.toFixed(4)),
  };
}
