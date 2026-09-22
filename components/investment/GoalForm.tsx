"use client";

import { useState } from "react";
import { Target, CalendarClock, ArrowRight } from "lucide-react";
import { formatThousands, parseThousands } from "@/lib/format/rupiahInput";

/** Nilai Goal yang diserahkan ke parent setelah validasi klien. */
export interface GoalValues {
  targetAmount: number;
  horizonYears: number;
}

interface GoalFormProps {
  /** Nilai awal (mis. prefill dari Active_Goal atau saat kembali ke langkah ini). */
  initial?: { targetAmount: string; horizonYears: string };
  /** Dipanggil setelah validasi klien lolos; parent (wizard) menyuplai goalId dari Active_Goal. */
  onSubmitted: (values: GoalValues) => void;
}

type FieldKey = "targetAmount" | "horizonYears";
type FieldErrors = Partial<Record<FieldKey, string>>;

/**
 * Validasi targetAmount: wajib, angka, dan > 0 (Req 2.3).
 * `value` berupa string bergrup ribuan; divalidasi via angka terparsir.
 */
function validateTarget(value: string): string | undefined {
  if (value.trim() === "") return "Wajib diisi.";
  const n = parseThousands(value);
  if (n === null) return "Harus berupa angka.";
  if (n <= 0) return "Harus lebih besar dari 0.";
  return undefined;
}

/**
 * Validasi horizonYears: wajib, bilangan bulat positif (Req 2.4).
 */
function validateHorizon(value: string): string | undefined {
  const trimmed = value.trim();
  if (trimmed === "") return "Wajib diisi.";
  const n = Number(trimmed);
  if (!Number.isFinite(n)) return "Harus berupa angka.";
  if (n <= 0) return "Harus lebih besar dari 0.";
  if (!Number.isInteger(n)) return "Harus dalam tahun bulat (mis. 5).";
  return undefined;
}

/**
 * GoalForm — langkah pertama alur Investasi (Req 6.1, 7.1, 7.3).
 *
 * Mengumpulkan `targetAmount` (Rupiah) dan `horizonYears` (tahun, bilangan
 * bulat) — terprefill dari `Active_Goal` lewat prop `initial` — memvalidasi di
 * sisi klien, lalu menyerahkan nilai ke parent lewat `onSubmitted`. Form ini
 * TIDAK membuat baris `Goal` (tidak POST /api/goal); dashboard-lah pembuat
 * `Goal`, dan wizard menyuplai `goalId` dari `Active_Goal` secara terpisah.
 */
export default function GoalForm({ initial, onSubmitted }: GoalFormProps) {
  // Nilai awal langsung dibuat bergrup ribuan agar tampil rapi saat prefill.
  const [targetAmount, setTargetAmount] = useState(
    formatThousands(initial?.targetAmount ?? "")
  );
  const [horizonYears, setHorizonYears] = useState(initial?.horizonYears ?? "");
  const [errors, setErrors] = useState<FieldErrors>({});

  function validateAll(): boolean {
    const next: FieldErrors = {
      targetAmount: validateTarget(targetAmount),
      horizonYears: validateHorizon(horizonYears),
    };
    // Buang key undefined agar hitungan error akurat.
    const cleaned: FieldErrors = {};
    if (next.targetAmount) cleaned.targetAmount = next.targetAmount;
    if (next.horizonYears) cleaned.horizonYears = next.horizonYears;
    setErrors(cleaned);
    return Object.keys(cleaned).length === 0;
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validateAll()) return;

    const target = parseThousands(targetAmount) ?? 0;
    const horizon = Number(horizonYears);

    onSubmitted({ targetAmount: target, horizonYears: horizon });
  }

  // Pratinjau mencerminkan nilai bergrup yang sedang diketik.
  const targetPreview = targetAmount ? `Rp ${targetAmount}` : null;

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="flex flex-col gap-5 rounded-2xl border border-border bg-surface p-5 shadow-[0_2px_20px_rgba(0,0,0,0.04)] sm:p-6"
    >
      {/* Target dana */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="targetAmount" className="text-sm font-medium text-foreground">
          Target dana
        </label>
        <div
          className={`flex items-center gap-2.5 rounded-xl border bg-background px-3 py-2.5 transition-shadow focus-within:shadow-[0_2px_16px_rgba(0,180,216,0.12)] ${
            errors.targetAmount
              ? "border-red-400"
              : "border-border focus-within:border-[var(--accent)]/50"
          }`}
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-[var(--accent)]">
            <Target className="h-4 w-4" />
          </span>
          <span className="shrink-0 text-sm text-muted">Rp</span>
          <input
            id="targetAmount"
            name="targetAmount"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            value={targetAmount}
            onChange={(e) => {
              setTargetAmount(formatThousands(e.target.value));
              if (errors.targetAmount) setErrors((p) => ({ ...p, targetAmount: undefined }));
            }}
            placeholder="100.000.000"
            aria-invalid={errors.targetAmount ? true : undefined}
            aria-describedby={errors.targetAmount ? "targetAmount-error" : "targetAmount-hint"}
            className="min-w-0 flex-1 bg-transparent text-[0.9375rem] text-foreground placeholder:text-muted focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
        </div>
        {errors.targetAmount ? (
          <p id="targetAmount-error" className="text-xs text-red-500">
            {errors.targetAmount}
          </p>
        ) : (
          <p id="targetAmount-hint" className="text-xs text-muted">
            {targetPreview ? targetPreview : "Nominal yang ingin Anda capai."}
          </p>
        )}
      </div>

      {/* Jangka waktu */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="horizonYears" className="text-sm font-medium text-foreground">
          Jangka waktu
        </label>
        <div
          className={`flex items-center gap-2.5 rounded-xl border bg-background px-3 py-2.5 transition-shadow focus-within:shadow-[0_2px_16px_rgba(0,180,216,0.12)] ${
            errors.horizonYears
              ? "border-red-400"
              : "border-border focus-within:border-[var(--accent)]/50"
          }`}
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-[var(--accent)]">
            <CalendarClock className="h-4 w-4" />
          </span>
          <input
            id="horizonYears"
            name="horizonYears"
            type="number"
            inputMode="numeric"
            min={1}
            step={1}
            value={horizonYears}
            onChange={(e) => {
              setHorizonYears(e.target.value);
              if (errors.horizonYears) setErrors((p) => ({ ...p, horizonYears: undefined }));
            }}
            placeholder="5"
            aria-invalid={errors.horizonYears ? true : undefined}
            aria-describedby={errors.horizonYears ? "horizonYears-error" : "horizonYears-hint"}
            className="min-w-0 flex-1 bg-transparent text-[0.9375rem] text-foreground placeholder:text-muted focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
          <span className="shrink-0 text-sm text-muted">tahun</span>
        </div>
        {errors.horizonYears ? (
          <p id="horizonYears-error" className="text-xs text-red-500">
            {errors.horizonYears}
          </p>
        ) : (
          <p id="horizonYears-hint" className="text-xs text-muted">
            Berapa lama Anda ingin mencapai target ini.
          </p>
        )}
      </div>

      <button
        type="submit"
        className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[var(--accent)] text-[0.9375rem] font-medium text-white transition-all duration-200 hover:brightness-110 disabled:cursor-not-allowed disabled:bg-border disabled:text-muted"
      >
        Lanjut ke survei risiko
        <ArrowRight className="h-4 w-4" />
      </button>
    </form>
  );
}
