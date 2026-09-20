"use client";

import { Info, TrendingUp, CalendarClock, PieChart, RotateCcw } from "lucide-react";
import type { AllocationSlice, RiskProfile } from "@/types/finance";

/** Payload rekomendasi dari POST /api/recommendation. */
export interface InvestmentRecommendation {
  riskProfile: RiskProfile | string;
  composition: AllocationSlice[];
  annualReturn: number; // desimal, mis. 0.095 → 9,5%
  monthlyContribution: number; // Rupiah
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
  const { riskProfile, composition, annualReturn, monthlyContribution } = recommendation;

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
            {composition.map((slice, i) => (
              <li
                key={slice.instrument}
                className="flex items-center justify-between gap-3 text-sm"
              >
                <span className="flex min-w-0 items-center gap-2 text-foreground">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: BAR_COLORS[i % BAR_COLORS.length] }}
                  />
                  <span className="truncate">{slice.instrument}</span>
                </span>
                <span className="shrink-0 font-medium tabular-nums text-foreground">
                  {slice.percentage}%
                </span>
              </li>
            ))}
          </ul>
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
