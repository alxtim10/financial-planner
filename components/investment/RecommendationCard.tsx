"use client";

import { useState } from "react";
import {
  Info,
  TrendingUp,
  CalendarClock,
  PieChart,
  RotateCcw,
  Wallet,
  Sprout,
  Target,
  ExternalLink,
} from "lucide-react";
import type {
  AllocationSlice,
  RiskProfile,
  InvestmentProjection,
} from "@/types/finance";
import { instrumentToCategory } from "@/lib/investment/allocation";
import { getPartnerOffers, type PartnerOffer } from "@/lib/partners";
import { trackClientEvent } from "@/lib/analytics/client";

/**
 * Penjelasan ringkas instrumen investasi untuk pengguna awam.
 * Pencocokan berbasis kata kunci agar label gabungan (mis. "SBN/Deposito",
 * "Emas/SBN Ritel", "Saham/Indeks") tetap menemukan penjelasan yang relevan.
 */
const INSTRUMENT_INFO: { keyword: string; label: string; desc: string }[] = [
  {
    keyword: "RDPU",
    label: "RDPU (Reksa Dana Pasar Uang)",
    desc: "Reksa dana berisi deposito dan surat utang jangka pendek. Risiko paling rendah dan mudah dicairkan, cocok untuk tujuan dekat. Imbal hasilnya kecil tapi relatif stabil.",
  },
  {
    keyword: "Deposito",
    label: "Deposito",
    desc: "Simpanan di bank dengan bunga tetap dan jangka waktu tertentu. Aman dan dijamin LPS (sampai batas tertentu), tapi dana terkunci sampai jatuh tempo.",
  },
  {
    keyword: "SBN Ritel",
    label: "SBN Ritel (Surat Berharga Negara Ritel)",
    desc: "Surat utang yang diterbitkan pemerintah untuk investor individu (mis. ORI, SBR, Sukuk Ritel). Relatif aman karena dijamin negara, dengan imbal hasil tetap.",
  },
  {
    keyword: "RDPT",
    label: "RDPT / Reksa Dana Pendapatan Tetap",
    desc: "Reksa dana yang mayoritas isinya surat utang (obligasi). Risiko dan imbal hasilnya menengah — lebih tinggi dari pasar uang, lebih stabil dari saham.",
  },
  {
    keyword: "SBN",
    label: "SBN (Surat Berharga Negara)",
    desc: "Surat utang yang diterbitkan pemerintah. Tergolong aman karena dijamin negara, memberi imbal hasil tetap, cocok untuk menyeimbangkan portofolio.",
  },
  {
    keyword: "Emas",
    label: "Emas",
    desc: "Aset lindung nilai yang cenderung menjaga daya beli saat inflasi. Harga bisa naik-turun jangka pendek, tapi sering dipakai sebagai penyeimbang jangka panjang.",
  },
  {
    keyword: "Indeks",
    label: "Reksa Dana Indeks / Saham",
    desc: "Mengikuti kinerja sekumpulan saham (mis. indeks IDX30/LQ45). Berpotensi imbal hasil tinggi untuk jangka panjang, tapi nilainya bisa berfluktuasi cukup besar.",
  },
  {
    keyword: "Saham",
    label: "Saham",
    desc: "Kepemilikan sebagian atas perusahaan. Potensi pertumbuhan paling tinggi untuk jangka panjang, tapi juga paling fluktuatif — cocok bila jangka waktu Anda panjang.",
  },
];

/** Cari penjelasan instrumen berdasarkan kata kunci pertama yang cocok. */
function findInstrumentInfo(instrument: string): { label: string; desc: string } | null {
  const match = INSTRUMENT_INFO.find((info) =>
    instrument.toLowerCase().includes(info.keyword.toLowerCase()),
  );
  return match ? { label: match.label, desc: match.desc } : null;
}

/** Payload rekomendasi dari POST /api/recommendation. */
export interface InvestmentRecommendation {
  riskProfile: RiskProfile | string;
  composition: AllocationSlice[];
  annualReturn: number; // desimal, mis. 0.095 → 9,5%
  monthlyContribution: number; // Rupiah
  /** Proyeksi detail (opsional demi backward-compat bila API lama). */
  projection?: InvestmentProjection;
}

interface RecommendationCardProps {
  recommendation: InvestmentRecommendation;
  /** Mulai ulang alur dari awal (opsional). */
  onRestart?: () => void;
}

/** Warna bar per slice, diputar bila instrumen lebih banyak dari daftar. */
const BAR_COLORS = [
  "var(--accent)",
  "#22c55e",
  "#f59e0b",
  "#0ea5e9",
  "#ec4899",
];

/** Format desimal return ke persentase gaya Indonesia (0.095 → "9,5%"). */
function formatPercent(decimal: number): string {
  const pct = decimal * 100;
  // Tampilkan 1 desimal bila tidak bulat, koma sebagai pemisah desimal.
  const rounded = Math.round(pct * 10) / 10;
  return `${rounded.toLocaleString("id-ID", { maximumFractionDigits: 1 })}%`;
}

/** Format angka ke Rupiah (id-ID), dibulatkan ke rupiah terdekat. */
function formatRupiah(value: number): string {
  return `Rp ${Math.round(value).toLocaleString("id-ID")}`;
}

/**
 * RecommendationCard — menampilkan Investment_Recommendation (Req 6.1, 6.2, 6.3).
 *
 * Menampilkan komposisi alokasi (rincian persen + bar), estimasi return tahunan
 * (format persentase), dan kontribusi bulanan (format Rupiah). Menyertakan
 * disclaimer edukatif wajib (Req 6.2) dan responsif untuk mobile (Req 6.3).
 */
export default function RecommendationCard({
  recommendation,
  onRestart,
}: RecommendationCardProps) {
  const { riskProfile, composition, annualReturn, monthlyContribution, projection } =
    recommendation;
  // Instrumen mana yang penjelasannya sedang dibuka (null = tidak ada).
  const [openInfo, setOpenInfo] = useState<string | null>(null);

  // Peta porsi setoran bulanan + return per instrumen (bila proyeksi tersedia).
  const perInstrumentMap = new Map(
    (projection?.perInstrument ?? []).map((p) => [p.instrument, p]),
  );

  // Lacak kategori yang placement partnernya sudah dirender, agar satu kategori
  // tidak tampil ganda saat ada beberapa slice sekategori.
  const shownCategories = new Set<string>();

  /** Catat klik placement partner (fire-and-forget, tak mengganggu UX). */
  function handlePartnerClick(offer: PartnerOffer) {
    trackClientEvent("partner_placement_clicked", {
      partnerId: offer.id,
      category: offer.category,
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-5 rounded-2xl border border-border bg-surface p-5 shadow-[0_2px_20px_rgba(0,0,0,0.04)] sm:p-6">
        {/* Header profil risiko */}
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-[var(--accent)]">
            <PieChart className="h-4.5 w-4.5" />
          </span>
          <div className="flex flex-col">
            <span className="text-xs text-muted">Profil risiko Anda</span>
            <span className="text-base font-semibold text-foreground">{riskProfile}</span>
          </div>
        </div>

        {/* Ringkasan angka: return & kontribusi bulanan */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1 rounded-xl border border-border bg-background px-4 py-3.5">
            <span className="flex items-center gap-1.5 text-xs text-muted">
              <TrendingUp className="h-3.5 w-3.5" />
              Estimasi return tahunan
            </span>
            <span className="text-xl font-semibold text-foreground">
              {formatPercent(annualReturn)}
            </span>
          </div>
          <div className="flex flex-col gap-1 rounded-xl border border-border bg-background px-4 py-3.5">
            <span className="flex items-center gap-1.5 text-xs text-muted">
              <CalendarClock className="h-3.5 w-3.5" />
              Kontribusi per bulan
            </span>
            <span className="text-xl font-semibold text-foreground">
              {formatRupiah(monthlyContribution)}
            </span>
          </div>
        </div>

        {/* Proyeksi detail: total terkumpul, modal disetor, hasil pertumbuhan */}
        {projection && (
          <div className="flex flex-col gap-3 rounded-xl border border-border bg-background px-4 py-4">
            <span className="text-sm font-medium text-foreground">
              Proyeksi di akhir jangka waktu
            </span>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
              <div className="flex flex-col gap-1 rounded-lg bg-accent-soft px-3.5 py-3">
                <span className="flex items-center gap-1.5 text-xs text-muted">
                  <Target className="h-3.5 w-3.5" />
                  Total terkumpul
                </span>
                <span className="text-lg font-semibold text-foreground tabular-nums">
                  {formatRupiah(projection.futureValue)}
                </span>
              </div>
              <div className="flex flex-col gap-1 rounded-lg bg-surface px-3.5 py-3">
                <span className="flex items-center gap-1.5 text-xs text-muted">
                  <Wallet className="h-3.5 w-3.5" />
                  Modal Anda setor
                </span>
                <span className="text-lg font-semibold text-foreground tabular-nums">
                  {formatRupiah(projection.totalContributed)}
                </span>
              </div>
              <div className="flex flex-col gap-1 rounded-lg bg-surface px-3.5 py-3">
                <span className="flex items-center gap-1.5 text-xs text-muted">
                  <Sprout className="h-3.5 w-3.5 text-emerald-500" />
                  Hasil pertumbuhan
                </span>
                <span className="text-lg font-semibold text-emerald-600 tabular-nums dark:text-emerald-400">
                  {formatRupiah(projection.totalGrowth)}
                </span>
              </div>
            </div>
            {projection.presentValue > 0 && (
              <p className="text-xs leading-relaxed text-muted">
                Termasuk tabungan awal{" "}
                <span className="font-medium text-foreground">
                  {formatRupiah(projection.presentValue)}
                </span>{" "}
                yang ikut diinvestasikan. Angka proyeksi memakai estimasi return{" "}
                {formatPercent(projection.annualReturn)}/tahun dan belum
                memperhitungkan pajak/biaya.
              </p>
            )}
          </div>
        )}

        {/* Komposisi alokasi */}
        <div className="flex flex-col gap-3">
          <span className="text-sm font-medium text-foreground">Komposisi alokasi</span>

          {/* Bar proporsi gabungan */}
          <div className="flex h-3 w-full overflow-hidden rounded-full bg-background">
            {composition.map((slice, i) => (
              <div
                key={`${slice.instrument}-bar`}
                style={{
                  width: `${slice.percentage}%`,
                  backgroundColor: BAR_COLORS[i % BAR_COLORS.length],
                }}
                title={`${slice.instrument} ${slice.percentage}%`}
              />
            ))}
          </div>

          {/* Rincian per instrumen */}
          <ul className="flex flex-col gap-2.5">
            {composition.map((slice, i) => {
              const info = findInstrumentInfo(slice.instrument);
              const isOpen = openInfo === slice.instrument;
              const detail = perInstrumentMap.get(slice.instrument);
              // Placement partner (lapisan terpisah, read-only terhadap engine):
              // petakan label slice → kategori kanonik → tawaran partner. Dedupe
              // per kategori agar tak tampil ganda.
              const category = instrumentToCategory(slice.instrument);
              let offers: PartnerOffer[] = [];
              if (category && !shownCategories.has(category)) {
                offers = getPartnerOffers(category);
                if (offers.length > 0) shownCategories.add(category);
              }
              return (
                <li key={slice.instrument} className="flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-3 text-sm">
                    <span className="flex min-w-0 items-center gap-2 text-foreground">
                      <span
                        className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: BAR_COLORS[i % BAR_COLORS.length] }}
                      />
                      <span className="truncate">{slice.instrument}</span>
                      {info && (
                        <button
                          type="button"
                          onClick={() =>
                            setOpenInfo(isOpen ? null : slice.instrument)
                          }
                          aria-expanded={isOpen}
                          aria-label={`Apa itu ${slice.instrument}?`}
                          title={`Apa itu ${slice.instrument}?`}
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors ${
                            isOpen
                              ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                              : "border-border text-muted hover:border-[var(--accent)]/50 hover:text-[var(--accent)]"
                          }`}
                        >
                          <Info className="h-3 w-3" />
                        </button>
                      )}
                    </span>
                    <span className="flex shrink-0 flex-col items-end">
                      <span className="font-medium tabular-nums text-foreground">
                        {slice.percentage}%
                      </span>
                      {detail && (
                        <span className="text-xs tabular-nums text-muted">
                          {formatRupiah(detail.monthlyAmount)}/bln ·{" "}
                          {formatPercent(detail.annualReturn)}/thn
                        </span>
                      )}
                    </span>
                  </div>
                  {info && isOpen && (
                    <div className="ml-4.5 rounded-lg border border-border bg-background px-3 py-2.5">
                      <p className="text-xs font-medium text-foreground">
                        {info.label}
                      </p>
                      <p className="mt-0.5 text-xs leading-relaxed text-muted">
                        {info.desc}
                      </p>
                    </div>
                  )}
                  {/* Placement partner kontekstual (konten partner, ditandai
                      jelas). Tidak memengaruhi angka/alokasi di atas. */}
                  {offers.map((offer) => (
                    <a
                      key={offer.id}
                      href={offer.referralUrl}
                      target="_blank"
                      rel="noopener noreferrer sponsored"
                      onClick={() => handlePartnerClick(offer)}
                      className="ml-4.5 flex items-start justify-between gap-3 rounded-lg border border-dashed border-border bg-background px-3 py-2.5 transition-colors hover:border-[var(--accent)]/50"
                    >
                      <span className="flex min-w-0 flex-col gap-0.5">
                        <span className="text-xs font-medium text-[var(--accent)]">
                          {offer.ctaLabel}
                        </span>
                        <span className="truncate text-xs text-foreground">
                          {offer.partnerName} · {offer.productLabel}
                        </span>
                        <span className="text-[11px] leading-snug text-muted">
                          {offer.disclosure}
                        </span>
                      </span>
                      <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted" />
                    </a>
                  ))}
                </li>
              );
            })}
          </ul>
          <p className="flex items-center gap-1.5 text-xs text-muted">
            <Info className="h-3.5 w-3.5 shrink-0 text-[var(--accent)]" />
            Ketuk ikon <span className="font-medium text-foreground">i</span> di
            samping tiap instrumen untuk penjelasan singkatnya.
          </p>
        </div>

        {onRestart && (
          <button
            type="button"
            onClick={onRestart}
            className="flex h-10 items-center justify-center gap-1.5 self-start rounded-xl border border-border bg-background px-4 text-sm font-medium text-muted transition-colors hover:text-foreground"
          >
            <RotateCcw className="h-4 w-4" />
            Hitung ulang
          </button>
        )}
      </div>

      {/* Disclaimer edukatif wajib (Req 6.2) */}
      <div className="flex items-start gap-2.5 rounded-xl border border-border bg-accent-soft px-4 py-3.5">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent)]" />
        <p className="text-xs leading-relaxed text-muted">
          Rekomendasi ini bersifat <span className="font-medium text-foreground">edukatif</span> dan
          dihasilkan dari aturan sederhana. Ini{" "}
          <span className="font-medium text-foreground">bukan nasihat investasi tersertifikasi</span>.
          Pertimbangkan kondisi pribadi Anda dan konsultasikan dengan penasihat keuangan berlisensi
          sebelum mengambil keputusan.
        </p>
      </div>
    </div>
  );
}
