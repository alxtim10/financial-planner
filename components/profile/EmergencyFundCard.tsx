import { ShieldCheck, ShieldAlert, AlertCircle, Calculator } from "lucide-react";
import { evaluateEmergencyFund } from "@/lib/financial/emergencyFund";
import type { EmergencyFundTier } from "@/types/usp";

interface EmergencyFundCardProps {
  currentSavings: number;
  expense: number;
}

/** Format nominal ke Rupiah id-ID (mis. 10000000 → "Rp 10.000.000"). */
function formatRupiah(value: number): string {
  return `Rp ${Math.round(value).toLocaleString("id-ID")}`;
}

/** Format angka 1 desimal gaya id-ID (mis. 3.3 → "3,3"). */
function formatNumber(value: number): string {
  return value.toLocaleString("id-ID", { maximumFractionDigits: 1 });
}

/** Batas atas skala visual tier (bulan); di atas ini marker menempel di ujung. */
const SCALE_MAX_MONTHS = 9;

const TIER_CONFIG: Record<
  EmergencyFundTier,
  {
    icon: typeof ShieldCheck;
    label: string;
    badge: string;
    bar: string;
  }
> = {
  VULNERABLE: {
    icon: AlertCircle,
    label: "Perlu perhatian",
    badge:
      "border-red-200 bg-red-50 text-red-700 dark:border-red-800/50 dark:bg-red-950/40 dark:text-red-400",
    bar: "bg-red-500",
  },
  ADEQUATE: {
    icon: ShieldAlert,
    label: "Memadai",
    badge:
      "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800/50 dark:bg-amber-950/40 dark:text-amber-400",
    bar: "bg-amber-500",
  },
  STRONG: {
    icon: ShieldCheck,
    label: "Kuat",
    badge:
      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/50 dark:bg-emerald-950/40 dark:text-emerald-400",
    bar: "bg-emerald-500",
  },
};

/**
 * EmergencyFundCard — indikator kesiapan dana darurat (Requirement 3.1).
 *
 * Menghitung rasio `currentSavings / expense` lewat fungsi murni
 * `evaluateEmergencyFund`, lalu menampilkan:
 * - hasil (coverage + tier) beserta rincian perhitungan asalnya,
 * - skala tier (Rentan/Memadai/Kuat) dengan penanda posisi saat ini,
 * - kekurangan nominal terhadap target 6 bulan,
 * - saran edukatif + penjelasan "kenapa angka ini" yang bisa dibuka.
 */
export default function EmergencyFundCard({
  currentSavings,
  expense,
}: EmergencyFundCardProps) {
  const analysis = evaluateEmergencyFund(currentSavings, expense);
  const config = TIER_CONFIG[analysis.tier];
  const Icon = config.icon;

  const hasExpense = Number.isFinite(expense) && expense > 0;
  const progress = Math.min(
    100,
    Math.round((analysis.coverageMonths / analysis.targetMonths) * 100),
  );
  const markerPosition = Math.min(
    100,
    (Math.min(analysis.coverageMonths, SCALE_MAX_MONTHS) / SCALE_MAX_MONTHS) * 100,
  );

  return (
    <section
      aria-label="Kesiapan dana darurat"
      className="mb-8 rounded-2xl border border-border bg-surface p-5 shadow-[0_2px_20px_rgba(0,0,0,0.04)] sm:p-6"
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-[var(--accent)]">
              <Icon className="h-5 w-5" />
            </span>
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium text-muted">
                Kesiapan dana darurat
              </span>
              <h2 className="text-base font-semibold text-foreground">
                {formatNumber(analysis.coverageMonths)} bulan pengeluaran
              </h2>
            </div>
          </div>

          <span
            className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${config.badge}`}
          >
            {config.label}
          </span>
        </div>

        {hasExpense ? (
          <>
            <div className="flex flex-col gap-1.5">
              <div className="h-2 w-full overflow-hidden rounded-full bg-border">
                <div
                  className={`h-full rounded-full ${config.bar}`}
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-xs text-muted">
                <span>Target ideal {analysis.targetMonths} bulan</span>
                <span className="tabular-nums">{progress}%</span>
              </div>
            </div>

            {/* Rincian perhitungan — menjelaskan asal angka */}
            <div className="flex flex-col gap-2 rounded-xl border border-border bg-background px-3.5 py-3">
              <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                <Calculator className="h-3.5 w-3.5 text-muted" />
                Dari mana angka ini?
              </div>
              <p className="text-xs leading-relaxed text-muted">
                <span className="font-medium text-foreground">
                  {formatRupiah(currentSavings)}
                </span>{" "}
                (tabungan likuid) ÷{" "}
                <span className="font-medium text-foreground">
                  {formatRupiah(expense)}
                </span>{" "}
                (pengeluaran/bln) ={" "}
                <span className="font-medium text-foreground">
                  {formatNumber(analysis.coverageMonths)} bulan
                </span>
              </p>
              <p className="text-xs leading-relaxed text-muted">
                Target aman {analysis.targetMonths} bulan ={" "}
                <span className="font-medium text-foreground">
                  {formatRupiah(analysis.targetAmount)}
                </span>
                {analysis.shortfallAmount > 0
                  ? ` · kekurangan ${formatRupiah(analysis.shortfallAmount)}`
                  : " · sudah terpenuhi"}
              </p>
            </div>

            {/* Skala tier + penanda posisi saat ini */}
            <div className="flex flex-col gap-1.5">
              <div className="relative">
                <div className="flex h-2 overflow-hidden rounded-full">
                  <div className="w-1/3 bg-red-300 dark:bg-red-900/50" />
                  <div className="w-1/3 bg-amber-300 dark:bg-amber-900/50" />
                  <div className="w-1/3 bg-emerald-300 dark:bg-emerald-900/50" />
                </div>
                <span
                  aria-hidden
                  className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-surface bg-foreground"
                  style={{ left: `${markerPosition}%` }}
                />
              </div>
              <div className="grid grid-cols-3 text-center text-[11px] text-muted">
                <span>Rentan &lt;3</span>
                <span>Memadai 3–6</span>
                <span>Kuat &gt;6</span>
              </div>
            </div>
          </>
        ) : (
          <p className="text-sm leading-relaxed text-muted">
            Isi <span className="font-medium text-foreground">pengeluaran bulanan</span>{" "}
            di Profil Finansial agar kesiapan dana darurat bisa dihitung.
          </p>
        )}

        <p className="text-sm leading-relaxed text-muted">
          {analysis.advisoryMessage}
        </p>

        <details className="group">
          <summary className="flex cursor-pointer list-none items-center gap-1.5 text-xs font-medium text-[var(--accent)] [&::-webkit-details-marker]:hidden">
            <span className="transition-transform group-open:rotate-90">›</span>
            Kenapa angka ini penting?
          </summary>
          <div className="mt-2 flex flex-col gap-2 rounded-xl bg-accent-soft px-3.5 py-3 text-xs leading-relaxed text-muted">
            <p>
              Dana darurat adalah biaya hidup 3–6 bulan yang disimpan di
              instrumen likuid (tabungan/RDPU) agar bisa dicairkan cepat saat
              kebutuhan mendesak — sebelum menempatkan dana di aset berisiko.
            </p>
            <p>
              Kesiapan = tabungan likuid ÷ pengeluaran bulanan. Ambangnya:{" "}
              <span className="font-medium text-foreground">&lt;3 bulan</span>{" "}
              rentan,{" "}
              <span className="font-medium text-foreground">3–6 bulan</span>{" "}
              memadai, dan{" "}
              <span className="font-medium text-foreground">&gt;6 bulan</span>{" "}
              kuat.
            </p>
            <p>
              Angka di atas dihitung dari data Profil Finansial Anda (pengeluaran
              bulanan &amp; tabungan saat ini). Perbarui di halaman Profil
              Finansial bila kondisinya berubah.
            </p>
          </div>
        </details>
      </div>
    </section>
  );
}
