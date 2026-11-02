"use client";

import { ExternalLink, Store } from "lucide-react";
import type { PartnerOffer } from "@/lib/partners";
import { trackClientEvent } from "@/lib/analytics/client";

interface PartnerOffersProps {
  /** Daftar tawaran partner yang akan ditampilkan (sudah difilter/dedupe pemanggil). */
  offers: PartnerOffer[];
}

/**
 * PartnerOffers — daftar konten partner (placement) yang bisa dipakai ulang.
 *
 * Ditandai jelas sebagai konten partner dan TERPISAH dari angka rekomendasi —
 * placement tidak memengaruhi komposisi/persentase alokasi (angka dihitung
 * mandiri oleh engine, bukan dari siapa yang beriklan). Klik tiap tawaran
 * dicatat lewat `partner_placement_clicked` (fire-and-forget).
 */
export default function PartnerOffers({ offers }: PartnerOffersProps) {
  /** Catat klik placement partner (fire-and-forget, tak mengganggu UX). */
  function handlePartnerClick(offer: PartnerOffer) {
    trackClientEvent("partner_placement_clicked", {
      partnerId: offer.id,
      category: offer.category,
    });
  }

  if (offers.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-surface p-5 text-sm text-muted sm:p-6">
        Belum ada tawaran partner untuk kategori ini. Kembali dan coba kategori
        instrumen lain dari rekomendasi Anda.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-dashed border-border bg-surface p-5 shadow-[0_2px_20px_rgba(0,0,0,0.04)] sm:p-6">
      <div className="flex items-center gap-2.5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-[var(--accent)]">
          <Store className="h-4.5 w-4.5" />
        </span>
        <div className="flex flex-col">
          <span className="text-xs text-muted">Konten partner</span>
          <span className="text-base font-semibold text-foreground">
            Mulai berinvestasi lewat partner
          </span>
        </div>
      </div>
      <p className="text-xs leading-relaxed text-muted">
        Tawaran berikut berasal dari partner dan{" "}
        <span className="font-medium text-foreground">tidak memengaruhi</span>{" "}
        perhitungan komposisi/persentase pada rekomendasi Anda. Angka alokasi
        dihitung mandiri, bukan dari siapa yang beriklan.
      </p>
      <ul className="flex flex-col gap-2.5">
        {offers.map((offer) => (
          <li key={offer.id}>
            <a
              href={offer.referralUrl}
              target="_blank"
              rel="noopener noreferrer sponsored"
              onClick={() => handlePartnerClick(offer)}
              className="flex items-start justify-between gap-3 rounded-xl border border-border bg-background px-4 py-3 transition-colors hover:border-[var(--accent)]/50"
            >
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="text-sm font-medium text-[var(--accent)]">
                  {offer.ctaLabel}
                </span>
                <span className="text-xs text-foreground">
                  {offer.partnerName} · {offer.productLabel}
                </span>
                <span className="text-[11px] leading-snug text-muted">
                  {offer.disclosure}
                </span>
              </span>
              <ExternalLink className="mt-0.5 h-4 w-4 shrink-0 text-muted" />
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
