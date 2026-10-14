// Tier harga untuk UJI MINAT (price testing) di halaman /upgrade.
// Angka bersifat ILUSTRATIF (dapat disetel via env) — belum ada transaksi nyata.
// Pure: hanya baca env + format, tanpa I/O/DB.

export interface PriceTier {
  id: "free" | "pro";
  name: string;
  /** Harga bulanan dalam Rupiah (0 untuk Free). */
  monthly: number;
  /** Harga bila dibayar tahunan, dinyatakan per bulan (Rupiah). */
  yearlyPerMonth: number;
  tagline: string;
  features: string[];
}

/** Ambil angka dari env, fallback ke default bila kosong/invalid. */
function envNumber(key: string, fallback: number): number {
  const raw = Number(process.env[key]);
  return Number.isFinite(raw) && raw >= 0 ? Math.floor(raw) : fallback;
}

/**
 * Daftar tier harga. Default anchor: Pro Rp 39.000/bln, atau Rp 29.000/bln bila
 * dibayar tahunan (hemat ~26%). Dapat ditimpa env PRO_PRICE_MONTHLY /
 * PRO_PRICE_YEARLY_PER_MONTH untuk uji harga tanpa ubah kode.
 */
export function priceTiers(): PriceTier[] {
  const proMonthly = envNumber("PRO_PRICE_MONTHLY", 39_000);
  const proYearlyPerMonth = envNumber("PRO_PRICE_YEARLY_PER_MONTH", 29_000);

  return [
    {
      id: "free",
      name: "Free",
      monthly: 0,
      yearlyPerMonth: 0,
      tagline: "Mulai merencanakan tanpa biaya.",
      features: [
        "Profil finansial & tujuan aktif",
        "Rekomendasi alokasi + setoran bulanan",
        "Indikator dana darurat & Planner",
        "Chat AI dengan kuota harian dasar",
      ],
    },
    {
      id: "pro",
      name: "Pro",
      monthly: proMonthly,
      yearlyPerMonth: proYearlyPerMonth,
      tagline: "Buka fitur lanjutan untuk perencanaan lebih matang.",
      features: [
        "Semua fitur Free",
        "Kuota chat AI jauh lebih besar",
        "Proyeksi investasi detail per instrumen",
        "Prioritas fitur lanjutan berikutnya",
      ],
    },
  ];
}

/** Format Rupiah ringkas, konsisten dengan konvensi app. */
export function formatRupiah(value: number): string {
  return `Rp ${Math.round(value).toLocaleString("id-ID")}`;
}

/**
 * Persentase hemat bila membayar tahunan dibanding bulanan (dibulatkan).
 * 0 bila tidak ada selisih / data tidak valid.
 */
export function yearlySavingPercent(tier: PriceTier): number {
  if (tier.monthly <= 0 || tier.yearlyPerMonth <= 0 || tier.yearlyPerMonth >= tier.monthly) {
    return 0;
  }
  return Math.round((1 - tier.yearlyPerMonth / tier.monthly) * 100);
}
