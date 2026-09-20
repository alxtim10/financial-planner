"use client";

import { useState } from "react";
import { Target, CalendarClock, Loader2, ArrowRight } from "lucide-react";

/** Nilai Goal yang diserahkan ke parent setelah tersimpan. */
export interface GoalValues {
  targetAmount: number;
  horizonYears: number;
  /** id Goal dari API bila tersedia (POST /api/goal → { id }). */
  goalId?: string | null;
}

interface GoalFormProps {
  /** Nilai awal (mis. saat pengguna kembali ke langkah ini). */
  initial?: { targetAmount: string; horizonYears: string };
  /** Dipanggil setelah Goal berhasil disimpan (POST /api/goal 201). */
  onSubmitted: (values: GoalValues) => void;
}

type FieldKey = "targetAmount" | "horizonYears";
type FieldErrors = Partial<Record<FieldKey, string>>;

/** Format angka ke Rupiah untuk pratinjau (10000 → "Rp 10.000"). */
function formatRupiah(raw: string): string | null {
  const n = Number(raw);
  if (raw.trim() === "" || !Number.isFinite(n)) return null;
  return `Rp ${n.toLocaleString("id-ID")}`;
}

/**
 * Validasi targetAmount: wajib, angka, dan > 0 (Req 2.3).
 */
function validateTarget(value: string): string | undefined {
  const trimmed = value.trim();
  if (trimmed === "") return "Wajib diisi.";
  const n = Number(trimmed);
  if (!Number.isFinite(n)) return "Harus berupa angka.";
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
 * GoalForm — langkah pertama alur Investasi (Req 2.1).
 *
 * Mengumpulkan `targetAmount` (Rupiah) dan `horizonYears` (tahun, bilangan
 * bulat), memvalidasi di sisi klien, lalu POST /api/goal. Pada sukses,
 * menyerahkan nilai (termasuk `goalId` bila ada) ke parent lewat `onSubmitted`.
 */
export default function GoalForm({ initial, onSubmitted }: GoalFormProps) {
  const [targetAmount, setTargetAmount] = useState(initial?.targetAmount ?? "");
  const [horizonYears, setHorizonYears] = useState(initial?.horizonYears ?? "");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

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

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setApiError(null);
    if (!validateAll()) return;

    const target = Number(targetAmount);
    const horizon = Number(horizonYears);

    setSubmitting(true);
    try {
      const res = await fetch("/api/goal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetAmount: target, horizonYears: horizon }),
      });

      if (res.status === 201) {
        let goalId: string | null = null;
        try {
          const data = await res.json();
          if (typeof data?.id === "string") goalId = data.id;
        } catch {
          /* body bukan JSON — tetap lanjut tanpa goalId */
        }
        onSubmitted({ targetAmount: target, horizonYears: horizon, goalId });
        return;
      }

      let msg = "Gagal menyimpan target. Coba lagi sebentar.";
      try {
        const data = await res.json();
        if (data?.error) msg = data.error;
      } catch {
        /* body bukan JSON, pakai pesan default */
      }
      setApiError(msg);
    } catch {
      setApiError("Gagal terhubung ke server. Periksa koneksi Anda.");
    } finally {
      setSubmitting(false);
    }
  }

  const targetPreview = formatRupiah(targetAmount);

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
          className={`flex items-center gap-2.5 rounded-xl border bg-background px-3 py-2.5 transition-shadow focus-within:shadow-[0_2px_16px_rgba(107,92,255,0.12)] ${
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
            type="number"
            inputMode="numeric"
            min={0}
            step="any"
            value={targetAmount}
            onChange={(e) => {
              setTargetAmount(e.target.value);
              if (errors.targetAmount) setErrors((p) => ({ ...p, targetAmount: undefined }));
              if (apiError) setApiError(null);
            }}
            placeholder="100000000"
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
          className={`flex items-center gap-2.5 rounded-xl border bg-background px-3 py-2.5 transition-shadow focus-within:shadow-[0_2px_16px_rgba(107,92,255,0.12)] ${
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
              if (apiError) setApiError(null);
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

      {apiError && (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-600"
        >
          {apiError}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[var(--accent)] text-[0.9375rem] font-medium text-white transition-all duration-200 hover:brightness-110 disabled:cursor-not-allowed disabled:bg-border disabled:text-muted"
      >
        {submitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Menyimpan...
          </>
        ) : (
          <>
            Lanjut ke survei risiko
            <ArrowRight className="h-4 w-4" />
          </>
        )}
      </button>
    </form>
  );
}
