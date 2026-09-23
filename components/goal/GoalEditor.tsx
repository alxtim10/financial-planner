"use client";

import { useState } from "react";
import {
  Pencil,
  Target,
  CalendarClock,
  Loader2,
  Check,
  X,
} from "lucide-react";
import { formatThousands, parseThousands } from "@/lib/format/rupiahInput";

interface GoalEditorProps {
  /** Nilai awal nama (mode "ubah"); `null`/undefined → kosong. */
  initialName?: string | null;
  /** Nilai awal target (Rupiah, mode "ubah"); `null`/undefined → kosong. */
  initialTargetAmount?: number | null;
  /** Nilai awal jangka waktu (bulan, mode "ubah"); `null`/undefined → kosong. */
  initialHorizonMonths?: number | null;
  /** Dipanggil setelah Goal berhasil disimpan (POST /api/goal 201). */
  onSaved: () => void;
  /** Bila disediakan, tampilkan tombol "Batal". */
  onCancel?: () => void;
}

type FieldKey = "targetAmount" | "horizonMonths";
type FieldErrors = Partial<Record<FieldKey, string>>;

/**
 * Validasi targetAmount: wajib, angka berhingga, dan > 0 (mirror server, Req 5.3).
 * `value` berupa string bergrup ribuan; divalidasi via angka terparsir.
 */
function validateTarget(value: string): string | undefined {
  if (value.trim() === "") return "Wajib diisi.";
  const n = parseThousands(value);
  if (n === null || !Number.isFinite(n)) return "Harus berupa angka.";
  if (n <= 0) return "Harus lebih besar dari 0.";
  return undefined;
}

/**
 * Validasi horizonMonths: wajib, bilangan bulat positif (mirror server, Req 5.4).
 */
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
 * GoalEditor — form set/ubah Tujuan Aktif dari dashboard (Req 5).
 *
 * Field: `name` (opsional), `targetAmount` (Rupiah bergrup ribuan) dan
 * `horizonMonths` (bulan, bilangan bulat). Validasi klien mencerminkan server
 * (target > 0; horizon bilangan bulat > 0) dan mencegah submit bila tidak
 * valid. Submit → POST /api/goal `{ name: name.trim() || null, targetAmount,
 * horizonMonths }`; sukses (201) → `onSaved()`. Gagal → pesan error ramah
 * tanpa menghapus input pengguna. Pola input & token visual identik dengan
 * `GoalForm`/`BudgetForm` (Miami blue).
 */
export default function GoalEditor({
  initialName,
  initialTargetAmount,
  initialHorizonMonths,
  onSaved,
  onCancel,
}: GoalEditorProps) {
  const [name, setName] = useState(initialName ?? "");
  const [targetAmount, setTargetAmount] = useState(
    initialTargetAmount != null && Number.isFinite(initialTargetAmount)
      ? formatThousands(String(initialTargetAmount))
      : ""
  );
  const [horizonMonths, setHorizonMonths] = useState(
    initialHorizonMonths != null && Number.isFinite(initialHorizonMonths)
      ? String(initialHorizonMonths)
      : ""
  );
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  function validateAll(): boolean {
    const next: FieldErrors = {};
    const targetErr = validateTarget(targetAmount);
    if (targetErr) next.targetAmount = targetErr;
    const horizonErr = validateHorizon(horizonMonths);
    if (horizonErr) next.horizonMonths = horizonErr;
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setApiError(null);
    if (!validateAll()) return;

    const target = parseThousands(targetAmount) ?? 0;
    const horizon = Number(horizonMonths.trim());
    const trimmedName = name.trim();

    setSubmitting(true);
    try {
      const res = await fetch("/api/goal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmedName || null,
          targetAmount: target,
          horizonMonths: horizon,
        }),
      });

      if (res.status === 201) {
        onSaved();
        return;
      }

      let msg = "Gagal menyimpan tujuan. Coba lagi sebentar.";
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

  // Pratinjau mencerminkan nilai bergrup yang sedang diketik.
  const targetPreview = targetAmount ? `Rp ${targetAmount}` : null;

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="flex flex-col gap-5 rounded-2xl border border-border bg-surface p-5 shadow-[0_2px_20px_rgba(0,0,0,0.04)] sm:p-6"
    >
      {/* Nama tujuan (opsional) */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="goalName" className="text-sm font-medium text-foreground">
          Nama tujuan <span className="font-normal text-muted">(opsional)</span>
        </label>
        <div className="flex items-center gap-2.5 rounded-xl border border-border bg-background px-3 py-2.5 transition-shadow focus-within:border-[var(--accent)]/50 focus-within:shadow-[0_2px_16px_rgba(0,180,216,0.12)]">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-[var(--accent)]">
            <Pencil className="h-4 w-4" />
          </span>
          <input
            id="goalName"
            name="goalName"
            type="text"
            autoComplete="off"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (apiError) setApiError(null);
            }}
            placeholder="mis. Beli Rumah"
            className="min-w-0 flex-1 bg-transparent text-[0.9375rem] text-foreground placeholder:text-muted focus:outline-none"
          />
        </div>
      </div>

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
              if (apiError) setApiError(null);
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
        <label htmlFor="horizonMonths" className="text-sm font-medium text-foreground">
          Jangka waktu <span className="font-normal text-muted">(bulan)</span>
        </label>
        <div
          className={`flex items-center gap-2.5 rounded-xl border bg-background px-3 py-2.5 transition-shadow focus-within:shadow-[0_2px_16px_rgba(0,180,216,0.12)] ${
            errors.horizonMonths
              ? "border-red-400"
              : "border-border focus-within:border-[var(--accent)]/50"
          }`}
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-[var(--accent)]">
            <CalendarClock className="h-4 w-4" />
          </span>
          <input
            id="horizonMonths"
            name="horizonMonths"
            type="number"
            inputMode="numeric"
            min={1}
            step={1}
            value={horizonMonths}
            onChange={(e) => {
              setHorizonMonths(e.target.value);
              if (errors.horizonMonths) setErrors((p) => ({ ...p, horizonMonths: undefined }));
              if (apiError) setApiError(null);
            }}
            placeholder="60"
            aria-invalid={errors.horizonMonths ? true : undefined}
            aria-describedby={errors.horizonMonths ? "horizonMonths-error" : "horizonMonths-hint"}
            className="min-w-0 flex-1 bg-transparent text-[0.9375rem] text-foreground placeholder:text-muted focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
          <span className="shrink-0 text-sm text-muted">bulan</span>
        </div>
        {errors.horizonMonths ? (
          <p id="horizonMonths-error" className="text-xs text-red-500">
            {errors.horizonMonths}
          </p>
        ) : (
          <p id="horizonMonths-hint" className="text-xs text-muted">
            Berapa lama Anda ingin mencapai tujuan ini (dalam bulan).
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

      <div className="flex flex-col gap-2.5 sm:flex-row-reverse">
        <button
          type="submit"
          disabled={submitting}
          className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--accent)] text-[0.9375rem] font-medium text-white transition-all duration-200 hover:brightness-110 disabled:cursor-not-allowed disabled:bg-border disabled:text-muted"
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Menyimpan...
            </>
          ) : (
            <>
              <Check className="h-4 w-4" />
              Simpan tujuan
            </>
          )}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="flex h-11 items-center justify-center gap-2 rounded-xl border border-border bg-background px-5 text-[0.9375rem] font-medium text-foreground transition-colors duration-200 hover:bg-accent-soft disabled:cursor-not-allowed disabled:text-muted"
          >
            <X className="h-4 w-4" />
            Batal
          </button>
        )}
      </div>
    </form>
  );
}
