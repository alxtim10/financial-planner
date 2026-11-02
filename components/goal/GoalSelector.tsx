"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Target,
  CalendarClock,
  Loader2,
  ArrowRight,
  CheckSquare,
  Square,
  ListChecks,
} from "lucide-react";
import { formatThousands, parseThousands } from "@/lib/format/rupiahInput";

/** Satu tujuan sebagaimana diterima dari GET /api/goal. */
export interface GoalOption {
  id: string;
  name: string | null;
  targetAmount: number;
  horizonMonths: number;
}

/** Tujuan terpilih yang diserahkan ke parent (untuk dikirim ke API). */
export interface SelectedGoal {
  id?: string;
  name?: string | null;
  targetAmount: number;
  horizonMonths: number;
}

interface GoalSelectorProps {
  /** Teks tombol lanjut (mis. "Lanjut ke survei risiko"). */
  submitLabel: string;
  /** Dipanggil setelah pengguna memilih tujuan (≥1) & menekan lanjut. */
  onSubmitted: (goals: SelectedGoal[]) => void;
  /** Daftar tujuan awal (bila sudah dimuat parent); bila tak ada, komponen fetch sendiri. */
  initialGoals?: GoalOption[];
}

/** Format nominal ke Rupiah id-ID. */
function formatRupiah(value: number): string {
  return `Rp ${Math.round(value).toLocaleString("id-ID")}`;
}

/** Label jangka waktu ringkas, mis. 60 → "60 bln (5 thn)". */
function formatMonthsShort(months: number): string {
  const m = Math.round(months);
  if (m < 12) return `${m} bln`;
  const years = m / 12;
  const yearLabel = Number.isInteger(years) ? `${years}` : years.toFixed(1);
  return `${m} bln (~${yearLabel} thn)`;
}

/** Validasi manual (fallback saat belum ada tujuan tersimpan). */
function validateTarget(value: string): string | undefined {
  if (value.trim() === "") return "Wajib diisi.";
  const n = parseThousands(value);
  if (n === null || !Number.isFinite(n)) return "Harus berupa angka.";
  if (n <= 0) return "Harus lebih besar dari 0.";
  return undefined;
}

function validateHorizon(value: string): string | undefined {
  const trimmed = value.trim();
  if (trimmed === "") return "Wajib diisi.";
  const n = Number(trimmed);
  if (!Number.isFinite(n)) return "Harus berupa angka.";
  if (n <= 0) return "Harus lebih besar dari 0.";
  if (!Number.isInteger(n)) return "Harus dalam bulan bulat (mis. 60).";
  return undefined;
}

/**
 * GoalSelector — pemilih tujuan multi-kategori untuk wizard Investasi/Planner.
 *
 * Perilaku:
 * - Bila pengguna punya ≥1 tujuan: tampilkan daftar dengan checkbox + opsi
 *   "Pilih semua". Pengguna memilih satu, beberapa, atau semua tujuan; nilai
 *   terpilih dikirim ke parent sebagai array `SelectedGoal`.
 * - Bila belum ada tujuan: tampilkan form manual satu tujuan (target + jangka
 *   waktu) sebagai fallback agar alur tetap bisa jalan tanpa menyimpan Goal.
 *
 * Perhitungan agregasi (opsi A) dilakukan di server; komponen ini hanya
 * mengumpulkan pilihan.
 */
export default function GoalSelector({
  submitLabel,
  onSubmitted,
  initialGoals,
}: GoalSelectorProps) {
  const [goals, setGoals] = useState<GoalOption[]>(initialGoals ?? []);
  const [loading, setLoading] = useState(!initialGoals);
  // Default: pilih tujuan terbaru (pertama) bila daftar awal sudah tersedia.
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() =>
    initialGoals && initialGoals.length > 0 ? new Set([initialGoals[0].id]) : new Set(),
  );
  const [listError, setListError] = useState<string | null>(null);

  // Fallback manual (saat tak ada tujuan tersimpan).
  const [manualTarget, setManualTarget] = useState("");
  const [manualHorizon, setManualHorizon] = useState("");
  const [manualErrors, setManualErrors] = useState<{
    targetAmount?: string;
    horizonMonths?: string;
  }>({});

  // Muat daftar tujuan bila tidak disuplai parent.
  useEffect(() => {
    if (initialGoals) return;
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/goal", { method: "GET" });
        if (!active) return;
        if (res.ok) {
          const data = await res.json();
          const list: GoalOption[] = Array.isArray(data?.goals)
            ? data.goals
                .filter(
                  (g: unknown): g is GoalOption =>
                    typeof g === "object" &&
                    g !== null &&
                    typeof (g as GoalOption).id === "string" &&
                    typeof (g as GoalOption).targetAmount === "number" &&
                    Number.isFinite((g as GoalOption).targetAmount) &&
                    typeof (g as GoalOption).horizonMonths === "number" &&
                    Number.isFinite((g as GoalOption).horizonMonths),
                )
                .map((g: GoalOption) => ({
                  id: g.id,
                  name: typeof g.name === "string" ? g.name : null,
                  targetAmount: g.targetAmount,
                  horizonMonths: g.horizonMonths,
                }))
            : [];
          setGoals(list);
          // Default: pilih tujuan terbaru (pertama) bila ada.
          if (list.length > 0) setSelectedIds(new Set([list[0].id]));
        }
      } catch {
        if (active) setListError("Gagal memuat daftar tujuan. Anda tetap bisa mengisi manual di bawah.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [initialGoals]);

  const allSelected = goals.length > 0 && selectedIds.size === goals.length;

  function toggleGoal(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelectedIds((prev) =>
      prev.size === goals.length ? new Set() : new Set(goals.map((g) => g.id)),
    );
  }

  const selectedGoals = useMemo(
    () => goals.filter((g) => selectedIds.has(g.id)),
    [goals, selectedIds],
  );

  function handleSubmitSelection(e: React.FormEvent) {
    e.preventDefault();
    if (selectedGoals.length === 0) return;
    onSubmitted(
      selectedGoals.map((g) => ({
        id: g.id,
        name: g.name,
        targetAmount: g.targetAmount,
        horizonMonths: g.horizonMonths,
      })),
    );
  }

  function handleSubmitManual(e: React.FormEvent) {
    e.preventDefault();
    const errs = {
      targetAmount: validateTarget(manualTarget),
      horizonMonths: validateHorizon(manualHorizon),
    };
    const cleaned: typeof manualErrors = {};
    if (errs.targetAmount) cleaned.targetAmount = errs.targetAmount;
    if (errs.horizonMonths) cleaned.horizonMonths = errs.horizonMonths;
    setManualErrors(cleaned);
    if (Object.keys(cleaned).length > 0) return;

    onSubmitted([
      {
        targetAmount: parseThousands(manualTarget) ?? 0,
        horizonMonths: Number(manualHorizon.trim()),
      },
    ]);
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-border bg-surface px-5 py-12 text-center">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--accent)]" />
        <p className="text-sm text-muted">Memuat tujuan Anda...</p>
      </div>
    );
  }

  // ── Fallback manual: belum ada tujuan tersimpan ──────────────────────────
  if (goals.length === 0) {
    return (
      <form
        onSubmit={handleSubmitManual}
        noValidate
        className="flex flex-col gap-5 rounded-2xl border border-border bg-surface p-5 shadow-[0_2px_20px_rgba(0,0,0,0.04)] sm:p-6"
      >
        {listError && (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs text-amber-700">
            {listError}
          </p>
        )}
        <p className="text-sm leading-relaxed text-muted">
          Anda belum punya tujuan tersimpan. Isi target dan jangka waktu untuk
          skenario ini. Untuk menyimpan beberapa tujuan, tambahkan dari dashboard.
        </p>

        {/* Target dana */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="gs-target" className="text-sm font-medium text-foreground">
            Target dana
          </label>
          <div
            className={`flex items-center gap-2.5 rounded-xl border bg-background px-3 py-2.5 transition-shadow focus-within:shadow-[0_2px_16px_rgba(0,180,216,0.12)] ${
              manualErrors.targetAmount
                ? "border-red-400"
                : "border-border focus-within:border-[var(--accent)]/50"
            }`}
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-[var(--accent)]">
              <Target className="h-4 w-4" />
            </span>
            <span className="shrink-0 text-sm text-muted">Rp</span>
            <input
              id="gs-target"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              value={manualTarget}
              onChange={(e) => {
                setManualTarget(formatThousands(e.target.value));
                if (manualErrors.targetAmount)
                  setManualErrors((p) => ({ ...p, targetAmount: undefined }));
              }}
              placeholder="100.000.000"
              className="min-w-0 flex-1 bg-transparent text-[0.9375rem] text-foreground placeholder:text-muted focus:outline-none"
            />
          </div>
          {manualErrors.targetAmount ? (
            <p className="text-xs text-red-500">{manualErrors.targetAmount}</p>
          ) : (
            <p className="text-xs text-muted">
              {manualTarget ? `Rp ${manualTarget}` : "Nominal yang ingin Anda capai."}
            </p>
          )}
        </div>

        {/* Jangka waktu */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="gs-horizon" className="text-sm font-medium text-foreground">
            Jangka waktu <span className="font-normal text-muted">(bulan)</span>
          </label>
          <div
            className={`flex items-center gap-2.5 rounded-xl border bg-background px-3 py-2.5 transition-shadow focus-within:shadow-[0_2px_16px_rgba(0,180,216,0.12)] ${
              manualErrors.horizonMonths
                ? "border-red-400"
                : "border-border focus-within:border-[var(--accent)]/50"
            }`}
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-[var(--accent)]">
              <CalendarClock className="h-4 w-4" />
            </span>
            <input
              id="gs-horizon"
              type="number"
              inputMode="numeric"
              min={1}
              step={1}
              value={manualHorizon}
              onChange={(e) => {
                setManualHorizon(e.target.value);
                if (manualErrors.horizonMonths)
                  setManualErrors((p) => ({ ...p, horizonMonths: undefined }));
              }}
              placeholder="60"
              className="min-w-0 flex-1 bg-transparent text-[0.9375rem] text-foreground placeholder:text-muted focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
            <span className="shrink-0 text-sm text-muted">bulan</span>
          </div>
          {manualErrors.horizonMonths ? (
            <p className="text-xs text-red-500">{manualErrors.horizonMonths}</p>
          ) : (
            <p className="text-xs text-muted">
              Berapa lama Anda ingin mencapai target ini (dalam bulan).
            </p>
          )}
        </div>

        <button
          type="submit"
          className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[var(--accent)] text-[0.9375rem] font-medium text-white transition-all duration-200 hover:brightness-110"
        >
          {submitLabel}
          <ArrowRight className="h-4 w-4" />
        </button>
      </form>
    );
  }

  // ── Pemilih tujuan (≥1 tujuan tersimpan) ─────────────────────────────────
  return (
    <form
      onSubmit={handleSubmitSelection}
      className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-5 shadow-[0_2px_20px_rgba(0,0,0,0.04)] sm:p-6"
    >
      <div className="flex items-center gap-2.5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-[var(--accent)]">
          <ListChecks className="h-4.5 w-4.5" />
        </span>
        <div className="flex flex-col">
          <span className="text-base font-semibold text-foreground">
            Pilih tujuan untuk direncanakan
          </span>
          <span className="text-xs text-muted">
            Pilih satu, beberapa, atau semua tujuan. Target & jangka waktunya
            akan digabung otomatis.
          </span>
        </div>
      </div>

      {/* Pilih semua */}
      <button
        type="button"
        onClick={toggleAll}
        aria-pressed={allSelected}
        className="flex items-center gap-2.5 self-start rounded-lg px-1 py-1 text-sm font-medium text-foreground transition-colors hover:text-[var(--accent)]"
      >
        {allSelected ? (
          <CheckSquare className="h-5 w-5 text-[var(--accent)]" />
        ) : (
          <Square className="h-5 w-5 text-muted" />
        )}
        Pilih semua ({goals.length} tujuan)
      </button>

      {/* Daftar tujuan */}
      <ul className="flex flex-col gap-2.5">
        {goals.map((g) => {
          const checked = selectedIds.has(g.id);
          return (
            <li key={g.id}>
              <label
                className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-3 transition-colors ${
                  checked
                    ? "border-[var(--accent)]/60 bg-accent-soft"
                    : "border-border bg-background hover:border-[var(--accent)]/40"
                }`}
              >
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={checked}
                  onChange={() => toggleGoal(g.id)}
                />
                {checked ? (
                  <CheckSquare className="h-5 w-5 shrink-0 text-[var(--accent)]" />
                ) : (
                  <Square className="h-5 w-5 shrink-0 text-muted" />
                )}
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm font-medium text-foreground">
                    {g.name && g.name.trim() !== "" ? g.name.trim() : "Tanpa nama"}
                  </span>
                  <span className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted">
                    <span className="inline-flex items-center gap-1">
                      <Target className="h-3 w-3" />
                      {formatRupiah(g.targetAmount)}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <CalendarClock className="h-3 w-3" />
                      {formatMonthsShort(g.horizonMonths)}
                    </span>
                  </span>
                </span>
              </label>
            </li>
          );
        })}
      </ul>

      {/* Ringkasan pilihan */}
      {selectedGoals.length > 1 && (
        <p className="rounded-xl bg-accent-soft px-3.5 py-2.5 text-xs leading-relaxed text-muted">
          {selectedGoals.length} tujuan dipilih — total target{" "}
          <span className="font-medium text-foreground">
            {formatRupiah(selectedGoals.reduce((s, g) => s + g.targetAmount, 0))}
          </span>
          . Setoran bulanan dihitung per tujuan lalu dijumlahkan, memakai satu
          komposisi alokasi.
        </p>
      )}

      <button
        type="submit"
        disabled={selectedGoals.length === 0}
        className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[var(--accent)] text-[0.9375rem] font-medium text-white transition-all duration-200 hover:brightness-110 disabled:cursor-not-allowed disabled:bg-border disabled:text-muted"
      >
        {submitLabel}
        <ArrowRight className="h-4 w-4" />
      </button>
      {selectedGoals.length === 0 && (
        <p className="-mt-2 text-center text-xs text-muted">
          Pilih minimal satu tujuan untuk melanjutkan.
        </p>
      )}
    </form>
  );
}
