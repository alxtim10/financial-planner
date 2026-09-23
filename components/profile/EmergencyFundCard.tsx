import { ShieldCheck, ShieldAlert, AlertCircle } from "lucide-react";
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
 * `evaluateEmergencyFund`, lalu menampilkan tier (VULNERABLE/ADEQUATE/STRONG),
 * progres terhadap target 6 bulan, kekurangan nominal, dan saran edukatif.
 */
export default function EmergencyFundCard({
  currentSavings,
  expense,
}: EmergencyFundCardProps) {
  const analysis = evaluateEmergencyFund(currentSavings, expense);
  const config = TIER_CONFIG[analysis.tier];
  const Icon = config.icon;
  const progress = Math.min(
    100,
    Math.round((analysis.coverageMonths / analysis.targetMonths) * 100),
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
                {analysis.coverageMonths} bulan pengeluaran
              </h2>
            </div>
          </div>

          <span
            className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${config.badge}`}
          >
            {config.label}
          </span>
        </div>

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

        {analysis.shortfallAmount > 0 && (
          <p className="text-sm text-foreground">
            Kekurangan untuk mencapai target:{" "}
            <span className="font-medium">
              {formatRupiah(analysis.shortfallAmount)}
            </span>
          </p>
        )}

        <p className="text-sm leading-relaxed text-muted">
          {analysis.advisoryMessage}
        </p>
      </div>
    </section>
  );
}
