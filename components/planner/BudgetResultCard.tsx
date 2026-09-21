"use client";

import {
  Info,
  Wallet,
  PieChart,
  PiggyBank,
  TrendingUp,
  Target,
  CalendarClock,
  AlertTriangle,
  CheckCircle2,
  RotateCcw,
} from "lucide-react";
import type {
  BudgetBreakdown,
  ShortfallResult,
  SavingsProjection,
} from "@/types/planner";

interface BudgetResultCardProps {
  breakdown: BudgetBreakdown; // { presetId, baseAmount, lines: BudgetLine[] }
  savingsBucketAmount: number;
  investmentContribution: number; // 0 dalam mode terpisah
  shortfall: ShortfallResult; // { hasShortfall, savingsBucketAmount, investmentContribution, gap }
  mode: "terpisah" | "kombinasi";
  recommendationMissing?: boolean; // kombinasi tanpa rekomendasi tersimpan
  savingsProjection?: SavingsProjection | null; // proyeksi target tabungan opsional (Req 12.5–12.9)
  onRestart?: () => void;
}

/** Warna bar per pos, diputar bila kategori lebih banyak dari daftar. */
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

/** Format persentase gaya Indonesia (koma sebagai pemisah desimal, maks 1 desimal). */
function formatPercent(percentage: number): string {
  const rounded = Math.round(percentage * 10) / 10;
  return `${rounded.toLocaleString("id-ID", { maximumFractionDigits: 1 })}%`;
}

/** Format tahun (id-ID) dengan 1 desimal, untuk tampilan "~Y tahun". */
function formatYears(years: number): string {
  return years.toLocaleString("id-ID", { maximumFractionDigits: 1 });
}

/** Bulan dibulatkan ke atas ke bilangan bulat untuk tampilan "~X bulan". */
function formatMonths(months: number): string {
  return Math.ceil(months).toLocaleString("id-ID");
}

/**
 * BudgetResultCard — menampilkan Budget_Breakdown hasil perhitungan (Req 8.1–8.6).
 *
 * Mengikuti pola visual RecommendationCard: bar proporsi (warna berputar),
 * rincian per pos (nama, persentase, jumlah Rupiah), dan disclaimer edukatif
 * wajib. Dalam mode kombinasi menampilkan kontribusi investasi dan peringatan
 * Savings_Shortfall bila alokasi tabungan preset lebih kecil dari kontribusi
 * yang diperlukan (Req 8.5). Responsif untuk viewport mobile (Req 8.6).
 */
export default function BudgetResultCard({
  breakdown,
  savingsBucketAmount,
  investmentContribution,
  shortfall,
  mode,
  recommendationMissing = false,
  savingsProjection,
  onRestart,
}: BudgetResultCardProps) {
  const { presetId, baseAmount, lines } = breakdown;
  const isKombinasi = mode === "kombinasi";

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-5 rounded-2xl border border-border bg-surface p-5 shadow-[0_2px_20px_rgba(0,0,0,0.04)] sm:p-6">
        {/* Header preset + jumlah dasar */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-[var(--accent)]">
              <PieChart className="h-4.5 w-4.5" />
            </span>
            <div className="flex flex-col">
              <span className="text-xs text-muted">Metode anggaran</span>
              <span className="text-base font-semibold text-foreground">{presetId}</span>
            </div>
          </div>
          <div className="flex flex-col rounded-xl border border-border bg-background px-4 py-2.5 sm:items-end">
            <span className="flex items-center gap-1.5 text-xs text-muted">
              <Wallet className="h-3.5 w-3.5" />
              Jumlah dasar
            </span>
            <span className="text-lg font-semibold text-foreground">
              {formatRupiah(baseAmount)}
            </span>
          </div>
        </div>

        {/* Alokasi per pos */}
        <div className="flex flex-col gap-3">
          <span className="text-sm font-medium text-foreground">Alokasi per pos</span>

          {/* Bar proporsi gabungan */}
          <div className="flex h-3 w-full overflow-hidden rounded-full bg-background">
            {lines.map((line, i) => (
              <div
                key={`${line.name}-bar`}
                style={{
                  width: `${line.percentage}%`,
                  backgroundColor: BAR_COLORS[i % BAR_COLORS.length],
                }}
                title={`${line.name} ${formatPercent(line.percentage)}`}
              />
            ))}
          </div>

          {/* Rincian per pos */}
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

        {/* Ringkasan tabungan & investasi */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1 rounded-xl border border-border bg-background px-4 py-3.5">
            <span className="flex items-center gap-1.5 text-xs text-muted">
              <PiggyBank className="h-3.5 w-3.5" />
              Alokasi tabungan preset
            </span>
            <span className="text-xl font-semibold text-foreground">
              {formatRupiah(savingsBucketAmount)}
            </span>
          </div>

          {isKombinasi && (
            <div className="flex flex-col gap-1 rounded-xl border border-border bg-background px-4 py-3.5">
              <span className="flex items-center gap-1.5 text-xs text-muted">
                <TrendingUp className="h-3.5 w-3.5" />
                Kontribusi investasi / bulan
              </span>
              <span className="text-xl font-semibold text-foreground">
                {formatRupiah(investmentContribution)}
              </span>
            </div>
          )}

        </div>

        {/* Info: rekomendasi investasi belum tersedia (kombinasi) */}
        {isKombinasi && recommendationMissing && (
          <div className="flex items-start gap-2.5 rounded-xl border border-border bg-accent-soft px-4 py-3.5">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent)]" />
            <p className="text-xs leading-relaxed text-muted">
              Belum ada rekomendasi investasi tersimpan, sehingga{" "}
              <span className="font-medium text-foreground">kontribusi investasi diperlakukan sebagai Rp 0</span>.
              Buat rekomendasi di cakupan Investasi terlebih dahulu untuk menautkan kontribusi bulanan.
            </p>
          </div>
        )}

        {/* Peringatan Savings_Shortfall (Req 8.5, 6.2) */}
        {isKombinasi && shortfall.hasShortfall && (
          <div className="flex items-start gap-2.5 rounded-xl border border-amber-400 bg-amber-50 px-4 py-3.5">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <p className="text-xs leading-relaxed text-amber-800">
              Alokasi tabungan preset ({formatRupiah(shortfall.savingsBucketAmount)}) lebih kecil
              dari kontribusi investasi yang diperlukan ({formatRupiah(shortfall.investmentContribution)}),
              kurang{" "}
              <span className="font-semibold">{formatRupiah(shortfall.gap)}</span>. Anggaran ini belum
              cukup mendanai tujuan investasi Anda — pertimbangkan menaikkan jumlah dasar, memilih preset
              dengan porsi tabungan lebih besar, atau menyesuaikan target investasi.
            </p>
          </div>
        )}

        {/* Panel Savings_Projection opsional (Req 12.5–12.9) */}
        {savingsProjection && (
          <div className="flex flex-col gap-3">
            <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
              <Target className="h-4 w-4 text-[var(--accent)]" />
              Proyeksi target tabungan
            </span>

            {savingsProjection.alreadyReached ? (
              /* Sudah tercapai — PV >= target (Req 13.6); dahulukan sebelum cabang lain */
              <div className="flex items-start gap-2.5 rounded-xl border border-green-400 bg-green-50 px-4 py-3.5">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                <p className="text-xs leading-relaxed text-green-800">
                  Target tabungan{" "}
                  <span className="font-semibold">
                    {formatRupiah(savingsProjection.targetAmount)}
                  </span>{" "}
                  sudah tercapai dari tabungan saat ini (
                  <span className="font-semibold">
                    {formatRupiah(savingsProjection.presentValue)}
                  </span>
                  ).
                </p>
              </div>
            ) : savingsProjection.reachable === false ? (
              /* Zero-saving / target tak akan tercapai — jangan render Infinity */
              <div className="flex items-start gap-2.5 rounded-xl border border-amber-400 bg-amber-50 px-4 py-3.5">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                <p className="text-xs leading-relaxed text-amber-800">
                  Target tabungan{" "}
                  <span className="font-semibold">
                    {formatRupiah(savingsProjection.targetAmount)}
                  </span>{" "}
                  tidak akan tercapai dengan alokasi saat ini. Naikkan porsi alokasi
                  tabungan (pilih preset dengan Savings_Bucket lebih besar atau tambah
                  jumlah dasar) agar target dapat tercapai.
                </p>
              </div>
            ) : savingsProjection.direction === "time-to-goal" &&
              savingsProjection.months !== null ? (
              /* Arah A — Time_To_Goal */
              <div className="flex flex-col gap-2 rounded-xl border border-border bg-background px-4 py-3.5">
                <p className="flex items-start gap-2.5 text-xs leading-relaxed text-muted">
                  <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent)]" />
                  <span>
                    Target{" "}
                    <span className="font-semibold text-foreground">
                      {formatRupiah(savingsProjection.targetAmount)}
                    </span>{" "}
                    tercapai dalam{" "}
                    <span className="font-semibold text-foreground">
                      ~{formatMonths(savingsProjection.months)} bulan
                    </span>
                    {savingsProjection.years !== null && (
                      <>
                        {" "}
                        (~{formatYears(savingsProjection.years)} tahun)
                      </>
                    )}
                    {savingsProjection.annualReturn > 0 && (
                      <span className="text-[11px]">
                        {" "}
                        · mengasumsikan pertumbuhan investasi
                      </span>
                    )}
                    .
                  </span>
                </p>

                {savingsProjection.includeSavings && (
                  <p className="pl-6.5 text-[11px] leading-relaxed text-muted">
                    Termasuk tabungan saat ini{" "}
                    <span className="font-medium text-foreground">
                      {formatRupiah(savingsProjection.presentValue)}
                    </span>{" "}
                    sebagai saldo awal.
                  </p>
                )}
              </div>
            ) : savingsProjection.direction === "required-monthly" &&
              savingsProjection.requiredMonthly !== null ? (
              /* Arah B — Required_Monthly_Saving */
              <div className="flex flex-col gap-2.5 rounded-xl border border-border bg-background px-4 py-3.5">
                <p className="flex items-start gap-2.5 text-xs leading-relaxed text-muted">
                  <TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent)]" />
                  <span>
                    Butuh{" "}
                    <span className="font-semibold text-foreground">
                      {formatRupiah(savingsProjection.requiredMonthly)}/bulan
                    </span>{" "}
                    untuk mencapai{" "}
                    <span className="font-semibold text-foreground">
                      {formatRupiah(savingsProjection.targetAmount)}
                    </span>
                    {savingsProjection.horizonYears !== null && (
                      <>
                        {" "}
                        dalam {formatYears(savingsProjection.horizonYears)} tahun
                      </>
                    )}
                    {savingsProjection.annualReturn > 0 && (
                      <span className="text-[11px]">
                        {" "}
                        · mengasumsikan pertumbuhan investasi
                      </span>
                    )}
                    .
                  </span>
                </p>

                {savingsProjection.allocationSufficient ? (
                  <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-green-400 bg-green-50 px-3 py-1 text-xs font-medium text-green-700">
                    <TrendingUp className="h-3.5 w-3.5" />
                    Alokasi preset cukup
                  </span>
                ) : (
                  <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-amber-400 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Alokasi preset kurang{" "}
                    {formatRupiah(savingsProjection.monthlyGap ?? 0)}/bulan
                  </span>
                )}

                {savingsProjection.includeSavings && (
                  <p className="pl-6.5 text-[11px] leading-relaxed text-muted">
                    Termasuk tabungan saat ini{" "}
                    <span className="font-medium text-foreground">
                      {formatRupiah(savingsProjection.presentValue)}
                    </span>{" "}
                    sebagai saldo awal.
                  </p>
                )}
              </div>
            ) : null}
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

      {/* Disclaimer edukatif wajib (Req 8.4) */}
      <div className="flex items-start gap-2.5 rounded-xl border border-border bg-accent-soft px-4 py-3.5">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent)]" />
        <p className="text-xs leading-relaxed text-muted">
          Alokasi ini bersifat <span className="font-medium text-foreground">edukatif</span> dan
          dihasilkan dari metode penganggaran preset sederhana. Ini{" "}
          <span className="font-medium text-foreground">bukan nasihat keuangan tersertifikasi</span>.
          Pertimbangkan kondisi pribadi Anda dan konsultasikan dengan penasihat keuangan berlisensi
          sebelum mengambil keputusan.
        </p>
      </div>
    </div>
  );
}
