import type { InstrumentCategory } from "@/lib/investment/allocation";

/**
 * Lapisan placement partner keuangan — TERPISAH dari Allocation_Engine.
 *
 * Fungsi lapisan ini HANYA memetakan kategori instrumen (hasil engine yang
 * sudah dihitung) ke tawaran partner untuk ditampilkan. Ia TIDAK mengubah
 * alokasi, urutan instrumen, maupun estimasi return. Engine tetap netral dan
 * deterministik (bukan LLM); monetisasi tidak boleh menggeser angka.
 *
 * CATATAN KEPATUHAN (OJK): menampilkan/mengarahkan ke produk investasi spesifik
 * ke publik menyentuh ranah regulasi. Data di bawah bersifat ILUSTRATIF /
 * placeholder (nama produk, link referral) — BUKAN penawaran resmi dari pihak
 * mana pun. Ganti dengan perjanjian partner + sumber resmi, dan lakukan review
 * hukum/compliance, sebelum dipakai di produksi.
 *
 * Pola mengikuti `lib/consultants.ts`: data statis + pure helper, tanpa I/O.
 */

export interface PartnerOffer {
  /** ID unik tawaran (dipakai sebagai key UI + metadata analitik). */
  id: string;
  /** Nama partner/penyedia (mis. "Bank Mandiri"). */
  partnerName: string;
  /** Deskripsi produk ramah-pemula untuk ditampilkan. */
  productLabel: string;
  /** Kategori instrumen kanonik tempat tawaran ini relevan. */
  category: InstrumentCategory;
  /** Teks tombol/link ajakan (mis. "Buka Deposito di Livin'"). */
  ctaLabel: string;
  /** URL referral/affiliate (placeholder pada fase ini). */
  referralUrl: string;
  /** Penanda transparansi wajib bahwa ini konten partner. */
  disclosure: string;
}

/** Disclosure standar untuk semua tawaran partner (transparansi). */
const DEFAULT_DISCLOSURE =
  "Didukung partner. Bukan rekomendasi atau penawaran resmi.";

/**
 * Tawaran partner — DATA STATIS & ILUSTRATIF.
 *
 * Contoh memakai produk bergaya Bank Mandiri untuk menggambarkan konsep.
 * Nama produk, kanal, dan link bersifat placeholder; bukan data/penawaran
 * resmi. Kategori `Emas` sengaja dikosongkan untuk menunjukkan bahwa tidak
 * setiap kategori harus punya tawaran.
 */
export const PARTNER_OFFERS: PartnerOffer[] = [
  {
    id: "mandiri-deposito",
    partnerName: "Bank Mandiri",
    productLabel: "Deposito berjangka, cocok untuk dana jangka pendek.",
    category: "Deposito/SBN",
    ctaLabel: "Buka Deposito di Livin'",
    referralUrl: "https://example.com/ref/mandiri-deposito",
    disclosure: DEFAULT_DISCLOSURE,
  },
  {
    id: "mandiri-rdpu",
    partnerName: "Mandiri Investasi",
    productLabel: "Reksa dana pasar uang untuk pemula, mudah dicairkan.",
    category: "RDPU",
    ctaLabel: "Mulai reksa dana di Livin'",
    referralUrl: "https://example.com/ref/mandiri-rdpu",
    disclosure: DEFAULT_DISCLOSURE,
  },
  {
    id: "mandiri-rdpt",
    partnerName: "Mandiri Investasi",
    productLabel: "Reksa dana pendapatan tetap untuk jangka menengah.",
    category: "RDPT",
    ctaLabel: "Mulai reksa dana di Livin'",
    referralUrl: "https://example.com/ref/mandiri-rdpt",
    disclosure: DEFAULT_DISCLOSURE,
  },
  {
    id: "mandiri-sekuritas",
    partnerName: "Mandiri Sekuritas",
    productLabel: "Rekening saham & indeks untuk tujuan jangka panjang.",
    category: "Saham/Indeks",
    ctaLabel: "Buka rekening saham di MOST",
    referralUrl: "https://example.com/ref/mandiri-most",
    disclosure: DEFAULT_DISCLOSURE,
  },
];

/**
 * Mengambil tawaran partner untuk satu kategori instrumen kanonik.
 * Pure function — read-only terhadap PARTNER_OFFERS, tanpa I/O. Mengembalikan
 * array baru (bisa kosong bila tak ada tawaran untuk kategori tsb).
 */
export function getPartnerOffers(
  category: InstrumentCategory,
): PartnerOffer[] {
  return PARTNER_OFFERS.filter((offer) => offer.category === category);
}
