"use client";

import {
  Info,
  Wallet,
  PieChart,
  PiggyBank,
  AlertTriangle,
  CheckCircle2,
  RotateCcw,
} from "lucide-react";
import type { GoalBudgetResult } from "@/types/planner";

interface BudgetResultCardProps {
  result: GoalBudgetResult;
  /** Mulai ulang alur dari awal (opsional). */
  onRestart?: () => void;
}

/** Warna bar per pos, diputar bila melebihi daftar (mengikuti RecommendationCard). */
const BAR_COLORS = [
  "var(--accent)",
  "#22c55e",
  "#f59e0b",
  "#0ea5e9",
  "#ec4899",
];

/** Format angka ke Rupiah (id-ID), dibulatkan ke rupiah terdekat. */
function formatRupiah(value: number): string {
  return `Rp ${Math.round(value).toLocaleString("id-ID")}`;
}

/** Format persentase gaya Indonesia (koma sebagai pemisah desimal, 1 desimal). */
function formatPercent(percentage: number): string {
  const rounded = Math.round(percentage * 10) / 10;
  return `${rounded.toLocaleString("id-ID", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })}%`;
}

/** Format tahun (id-ID) dengan maks 1 desimal, untuk konteks "~Y tahun". */
function formatYears(years: number): string {
  return years.toLocaleString("id-ID", { maximumFractionDigits: 1 });
}

/**
 * BudgetResultCard — menampilkan Goal_Budget_Result goal-driven (Req 19.4, 20.6, 18.3).
 *
 * Mengikuti pola visual RecommendationCard: bar proporsi (warna berputar),
 * rincian tiga pos (Kebutuhan/Keinginan/Ditabung) dengan Derived_Percentage +
 * nominal Rupiah, ringkasan "Ditabung" untuk mencapai target, status
 * alreadyReached, panel peringatan feasibility (tight/impossible), dan
 * disclaimer edukatif wajib. Responsif untuk viewport mobile.
 */
export default function BudgetResultCard({
  result,
  onRestart,
}: BudgetResultCardProps) {
  const {
    monthlyIncome,
    monthsN,
    ditabung,
    lines,
    alreadyReached,
    feasibility,
  } = result;

  const years = monthsN / 12;
  const showWarning = feasibility.severity !== "ok";
  const isImpossible = feasibility.severity === "impossible";

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-5 rounded-2xl border border-border bg-surface p-5 shadow-[0_2px_20px_rgba(0,0,0,0.04)] sm:p-6">
        {/* Header: rencana + pemasukan bulanan */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-[var(--accent)]">
              <PieChart className="h-4.5 w-4.5" />
            </span>
            <div className="flex flex-col">
              <span className="text-xs text-muted">Rencana anggaran bulanan</span>
              <span className="text-base font-semibold text-foreground">
                Berbasis tujuan
              </span>
            </div>
          </div>
          <div className="flex flex-col rounded-xl border border-border bg-background px-4 py-2.5 sm:items-end">
            <span className="flex items-center gap-1.5 text-xs text-muted">
              <Wallet className="h-3.5 w-3.5" />
              Pemasukan bulanan
            </span>
            <span className="text-lg font-semibold text-foreground">
              {formatRupiah(monthlyIncome)}
            </span>
          </div>
        </div>

        {/* Alokasi per pos */}
        <div className="flex flex-col gap-3">
          <span className="text-sm font-medium text-foreground">Alokasi per pos</span>

          {/* Bar proporsi gabungan (persentase turunan) */}
          <div className="flex h-3 w-full overflow-hidden rounded-full bg-background">
            {lines.map((line, i) => (
              <div
                key={`${line.name}-bar`}
                style={{
                  width: `${Math.max(0, line.percentage)}%`,
                  backgroundColor: BAR_COLORS[i % BAR_COLORS.length],
                }}
                title={`${line.name} ${formatPercent(line.percentage)}`}
              />
            ))}
          </div>

          {/* Rincian per pos: nama, persentase turunan, nominal Rupiah */}
          <ul className="flex flex-col gap-2.5">
            {lines.map((line, i) => (
              <li
                key={line.name}
                className="flex items-center justify-between gap-3 text-sm"
              >
                <span className="flex min-w-0 items-center gap-2 text-foreground">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: BAR_COLORS[i % BAR_COLORS.length] }}
                  />
                  <span className="truncate">{line.name}</span>
                  <span className="shrink-0 text-xs text-muted tabular-nums">
                    {formatPercent(line.percentage)}
                  </span>
                </span>
                <span className="shrink-0 font-medium tabular-nums text-foreground">
                  {formatRupiah(line.amount)}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Ringkasan Ditabung / status sudah tercapai */}
        {alreadyReached ? (
          <div className="flex items-start gap-2.5 rounded-xl border border-green-400 bg-green-50 px-4 py-3.5">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
            <p className="text-xs leading-relaxed text-green-800">
              Target sudah tercapai dari tabungan saat ini — tidak perlu menabung
              tambahan.
            </p>
          </div>
        ) : (
          <div className="flex items-start gap-2.5 rounded-xl border border-border bg-accent-soft px-4 py-3.5">
            <PiggyBank className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent)]" />
            <p className="text-xs leading-relaxed text-muted">
              Sisihkan{" "}
              <span className="font-semibold text-foreground">
                {formatRupiah(ditabung)}
              </span>{" "}
              per bulan selama{" "}
              <span className="font-semibold text-foreground">
                {monthsN.toLocaleString("id-ID")} bulan
              </span>{" "}
              (~{formatYears(years)} tahun) untuk mencapai target Anda.
            </p>
          </div>
        )}

        {/* Panel peringatan feasibility (Req 20.6) — hanya bila bukan "ok" */}
        {showWarning && (
          <div
            className={
              isImpossible
                ? "flex items-start gap-2.5 rounded-xl border border-red-400 bg-red-50 px-4 py-3.5"
                : "flex items-start gap-2.5 rounded-xl border border-amber-400 bg-amber-50 px-4 py-3.5"
            }
          >
            <AlertTriangle
              className={
                isImpossible
                  ? "mt-0.5 h-4 w-4 shrink-0 text-red-600"
                  : "mt-0.5 h-4 w-4 shrink-0 text-amber-600"
              }
            />
            <p
              className={
                isImpossible
                  ? "text-xs leading-relaxed text-red-800"
                  : "text-xs leading-relaxed text-amber-800"
              }
            >
              {feasibility.reason}
            </p>
          </div>
        )}

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

      {/* Disclaimer edukatif wajib */}
      <div className="flex items-start gap-2.5 rounded-xl border border-border bg-accent-soft px-4 py-3.5">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent)]" />
        <p className="text-xs leading-relaxed text-muted">
          Alokasi ini bersifat <span className="font-medium text-foreground">edukatif</span> dan
          dihasilkan dari perhitungan sederhana berbasis tujuan. Ini{" "}
          <span className="font-medium text-foreground">bukan nasihat keuangan tersertifikasi</span>.
          Pertimbangkan kondisi pribadi Anda dan konsultasikan dengan penasihat keuangan berlisensi
          sebelum mengambil keputusan.
        </p>
      </div>
    </div>
  );
}
