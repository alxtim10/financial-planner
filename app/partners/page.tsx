import { Store } from "lucide-react";
import PartnerOffers from "@/components/partner/PartnerOffers";
import PageBackNav from "@/components/PageBackNav";
import { PARTNER_OFFERS, getPartnerOffers, type PartnerOffer } from "@/lib/partners";
import { isInstrumentCategory } from "@/lib/investment/allocation";

export const metadata = {
  title: "Partner Investasi — Tabungin",
  description:
    "Mulai berinvestasi lewat partner sesuai komposisi rekomendasi Anda. Konten partner, bukan penawaran resmi.",
};

/**
 * Halaman Partner Investasi.
 *
 * Menampilkan konten partner (placement) yang relevan dengan rekomendasi
 * pengguna. Kategori instrumen diteruskan lewat query `?c=RDPU,Saham/Indeks`
 * (comma-separated, kategori kanonik). Tanpa param valid → tampilkan semua
 * tawaran.
 *
 * Halaman ini READ-ONLY terhadap engine alokasi: hanya memetakan kategori →
 * tawaran partner, tidak mengubah angka apa pun. Ditandai jelas sebagai konten
 * partner (lihat `PartnerOffers`).
 */
export default async function PartnersPage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string | string[] }>;
}) {
  const params = await searchParams;
  const rawC = Array.isArray(params.c) ? params.c.join(",") : params.c ?? "";

  // Parse kategori dari query: pisah koma, hanya kategori kanonik, dedupe,
  // pertahankan urutan.
  const categories: string[] = [];
  for (const part of rawC.split(",")) {
    const cat = part.trim();
    if (isInstrumentCategory(cat) && !categories.includes(cat)) {
      categories.push(cat);
    }
  }

  // Resolusi tawaran: bila ada kategori → gabungkan tawaran per kategori
  // (dedupe by id, pertahankan urutan); bila tidak → semua tawaran.
  let offers: PartnerOffer[];
  if (categories.length > 0) {
    const seen = new Set<string>();
    offers = [];
    for (const cat of categories) {
      for (const offer of getPartnerOffers(cat as Parameters<typeof getPartnerOffers>[0])) {
        if (!seen.has(offer.id)) {
          seen.add(offer.id);
          offers.push(offer);
        }
      }
    }
  } else {
    offers = PARTNER_OFFERS;
  }

  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto w-full max-w-2xl px-4 py-10 sm:py-14">
        <PageBackNav fallbackHref="/investment" />

        <div className="mb-6 flex flex-col gap-3 pr-16">
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1 text-xs font-medium text-[var(--accent)]">
            <Store className="h-3.5 w-3.5" />
            Partner investasi
          </span>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Mulai berinvestasi lewat partner
          </h1>
          <p className="text-[0.9375rem] leading-relaxed text-muted">
            {categories.length > 0
              ? "Tawaran berikut dipilih sesuai komposisi instrumen pada rekomendasi Anda."
              : "Berikut tawaran dari partner untuk berbagai jenis instrumen investasi."}
          </p>
        </div>

        <PartnerOffers offers={offers} />

        <p className="mt-6 text-center text-xs text-muted">
          Simulasi edukatif, bukan nasihat keuangan tersertifikasi.
        </p>
      </div>
    </div>
  );
}
