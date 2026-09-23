"use client";

import { useState } from "react";
import {
  Wallet,
  TrendingDown,
  Target,
  CalendarClock,
  PiggyBank,
  Loader2,
  ArrowRight,
} from "lucide-react";
import { formatThousands, parseThousands } from "@/lib/format/rupiahInput";

/** Nilai goal-driven yang diserahkan ke parent (PlannerWizard) saat submit. */
export interface BudgetFormValues {
  /** Monthly_Income (Rupiah). Berhingga > 0. */
  monthlyIncome: number;
  /** Monthly_Expense (Rupiah). Berhingga >= 0. */
  monthlyExpense: number;
  /** Target_Amount (Rupiah). Berhingga > 0. */
  targetAmount: number;
  /** Horizon_Months (bulan). Bilangan bulat > 0. */
  horizonMonths: number;
}

interface BudgetFormProps {
  /** Prefill Monthly_Income dari `income` profil terbaru; `null` bila tak ada. */
  defaultMonthlyIncome: number | null;
  /**
   * Prefill Monthly_Expense dari `expense` profil terbaru (Rupiah); `null` bila
   * tak ada. Pengguna dapat mengisi/mengubah bebas — sistem tidak tahu
   * pengeluaran pengguna, jadi ini free input.
   */
  defaultMonthlyExpense?: number | null;
  /**
   * `currentSavings` dari `Financial_Profile` terbaru (Rupiah); `null`/`0`
   * bila tak ada. Ditampilkan sebagai konteks READ-ONLY, bukan field editable.
   */
  currentSavings: number | null;
  /**
   * Prefill Target_Amount dari `Active_Goal` (Rupiah); `null` bila tak ada.
   * Pengguna boleh menimpa (override satu kali) — tidak mengubah tujuan tersimpan.
   */
  defaultTargetAmount?: number | null;
  /**
   * Prefill Horizon_Months dari `Active_Goal` (bulan); `null` bila tak ada.
   * Pengguna boleh menimpa (override satu kali) — tidak mengubah tujuan tersimpan.
   */
  defaultHorizonMonths?: number | null;
  /** Dipanggil dengan nilai terparsir saat form valid dan disubmit. */
  onSubmit: (values: BudgetFormValues) => void;
  /** Menonaktifkan tombol submit selama proses berlangsung. */
  submitting?: boolean;
}

type FieldKey = "monthlyIncome" | "monthlyExpense" | "targetAmount" | "horizonMonths";
type FieldErrors = Partial<Record<FieldKey, string>>;

/** Format angka ke Rupiah gaya Indonesia (10000 → "Rp 10.000"). */
function formatRupiah(value: number): string {
  return `Rp ${Math.round(value).toLocaleString("id-ID")}`;
}

/** Validasi Monthly_Income: wajib, angka berhingga > 0 (mirror server Req 21.4). */
function validateMonthlyIncome(value: string): string | undefined {
  if (value.trim() === "") return "Wajib diisi.";
  const n = parseThousands(value);
  if (n === null || !Number.isFinite(n)) return "Harus berupa angka.";
  if (n <= 0) return "Harus lebih dari 0.";
  return undefined;
}

/** Validasi Monthly_Expense: wajib, angka berhingga >= 0. */
function validateMonthlyExpense(value: string): string | undefined {
  if (value.trim() === "") return "Wajib diisi.";
  const n = parseThousands(value);
  if (n === null || !Number.isFinite(n)) return "Harus berupa angka.";
  if (n < 0) return "Tidak boleh negatif.";
  return undefined;
}

/** Validasi Target_Amount: wajib, angka berhingga > 0 (mirror server Req 21.4). */
function validateTargetAmount(value: string): string | undefined {
  if (value.trim() === "") return "Wajib diisi.";
  const n = parseThousands(value);
  if (n === null || !Number.isFinite(n)) return "Harus berupa angka.";
  if (n <= 0) return "Harus lebih dari 0.";
  return undefined;
}

/** Validasi Horizon_Months: wajib, bilangan bulat > 0 (mirror server Req 21.4). */
function validateHorizonMonths(value: string): string | undefined {
  const trimmed = value.trim();
  if (trimmed === "") return "Wajib diisi.";
  const n = Number(trimmed);
  if (!Number.isFinite(n)) return "Harus berupa angka.";
  if (!Number.isInteger(n)) return "Harus bilangan bulat.";
  if (n <= 0) return "Harus lebih dari 0.";
  return undefined;
}

/**
 * BudgetForm — form goal-driven (Req 17.2, 17.3, 21.1). Pengguna memberi
 * Monthly_Income (prefill dari profil), Target_Amount, dan Horizon_Months;
 * `currentSavings` ditampilkan read-only sebagai konteks. Validasi klien
 * mencerminkan server (income>0, target>0, horizon bilangan bulat>0) dan
 * mencegah submit bila tidak valid.
 */
export default function BudgetForm({
  defaultMonthlyIncome,
  defaultMonthlyExpense,
  currentSavings,
  defaultTargetAmount,
  defaultHorizonMonths,
  onSubmit,
  submitting = false,
}: BudgetFormProps) {
  const [monthlyIncome, setMonthlyIncome] = useState(
    defaultMonthlyIncome != null && Number.isFinite(defaultMonthlyIncome)
      ? formatThousands(String(defaultMonthlyIncome))
      : ""
  );
  // Prefill Monthly_Expense dari profil (bergrup ribuan) bila tersedia.
  const [monthlyExpense, setMonthlyExpense] = useState(
    defaultMonthlyExpense != null && Number.isFinite(defaultMonthlyExpense)
      ? formatThousands(String(defaultMonthlyExpense))
      : ""
  );
  // Prefill Target_Amount dari Active_Goal (bergrup ribuan) bila tersedia.
  const [targetAmount, setTargetAmount] = useState(
    defaultTargetAmount != null && Number.isFinite(defaultTargetAmount)
      ? formatThousands(String(defaultTargetAmount))
      : ""
  );
  // Prefill Horizon_Months dari Active_Goal (string) bila tersedia.
  const [horizonMonths, setHorizonMonths] = useState(
    defaultHorizonMonths != null && Number.isFinite(defaultHorizonMonths)
      ? String(defaultHorizonMonths)
      : ""
  );
  const [errors, setErrors] = useState<FieldErrors>({});

  // Nominal tabungan saat ini — konteks read-only (Req 17.3).
  const savings =
    currentSavings != null && Number.isFinite(currentSavings)
      ? currentSavings
      : null;

  function validateAll(): boolean {
    const next: FieldErrors = {};
    const incomeErr = validateMonthlyIncome(monthlyIncome);
    if (incomeErr) next.monthlyIncome = incomeErr;
    const expenseErr = validateMonthlyExpense(monthlyExpense);
    if (expenseErr) next.monthlyExpense = expenseErr;
    const targetErr = validateTargetAmount(targetAmount);
    if (targetErr) next.targetAmount = targetErr;
    const horizonErr = validateHorizonMonths(horizonMonths);
    if (horizonErr) next.horizonMonths = horizonErr;
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    if (!validateAll()) return;

    onSubmit({
      monthlyIncome: parseThousands(monthlyIncome) ?? 0,
      monthlyExpense: parseThousands(monthlyExpense) ?? 0,
      targetAmount: parseThousands(targetAmount) ?? 0,
      horizonMonths: Number(horizonMonths.trim()),
    });
  }

  // Pratinjau mencerminkan nilai bergrup yang sedang diketik.
  const incomePreview = monthlyIncome ? `Rp ${monthlyIncome}` : null;
  const expensePreview = monthlyExpense ? `Rp ${monthlyExpense}` : null;
  const targetPreview = targetAmount ? `Rp ${targetAmount}` : null;

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="flex flex-col gap-5 rounded-2xl border border-border bg-surface p-5 shadow-[0_2px_20px_rgba(0,0,0,0.04)] sm:p-6"
    >
      {/* Monthly_Income */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="monthlyIncome" className="text-sm font-medium text-foreground">
          Pemasukan bulanan
        </label>
        <div
          className={`flex items-center gap-2.5 rounded-xl border bg-background px-3 py-2.5 transition-shadow focus-within:shadow-[0_2px_16px_rgba(0,180,216,0.12)] ${
            errors.monthlyIncome
              ? "border-red-400"
              : "border-border focus-within:border-[var(--accent)]/50"
          }`}
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-[var(--accent)]">
            <Wallet className="h-4 w-4" />
          </span>
          <span className="shrink-0 text-sm text-muted">Rp</span>
          <input
            id="monthlyIncome"
            name="monthlyIncome"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            value={monthlyIncome}
            onChange={(e) => {
              setMonthlyIncome(formatThousands(e.target.value));
              if (errors.monthlyIncome)
                setErrors((p) => ({ ...p, monthlyIncome: undefined }));
            }}
            placeholder="0"
            aria-invalid={errors.monthlyIncome ? true : undefined}
            aria-describedby={
              errors.monthlyIncome ? "monthlyIncome-error" : "monthlyIncome-hint"
            }
            className="min-w-0 flex-1 bg-transparent text-[0.9375rem] text-foreground placeholder:text-muted focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
        </div>
        {errors.monthlyIncome ? (
          <p id="monthlyIncome-error" className="text-xs text-red-500">
            {errors.monthlyIncome}
          </p>
        ) : (
          <p id="monthlyIncome-hint" className="text-xs text-muted">
            {incomePreview
              ? incomePreview
              : "Otomatis dari profil, dapat Anda ubah untuk skenario lain."}
          </p>
        )}
      </div>

      {/* Monthly_Expense — free input pengeluaran bulanan */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="monthlyExpense" className="text-sm font-medium text-foreground">
          Pengeluaran bulanan
        </label>
        <div
          className={`flex items-center gap-2.5 rounded-xl border bg-background px-3 py-2.5 transition-shadow focus-within:shadow-[0_2px_16px_rgba(0,180,216,0.12)] ${
            errors.monthlyExpense
              ? "border-red-400"
              : "border-border focus-within:border-[var(--accent)]/50"
          }`}
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-[var(--accent)]">
            <TrendingDown className="h-4 w-4" />
          </span>
          <span className="shrink-0 text-sm text-muted">Rp</span>
          <input
            id="monthlyExpense"
            name="monthlyExpense"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            value={monthlyExpense}
            onChange={(e) => {
              setMonthlyExpense(formatThousands(e.target.value));
              if (errors.monthlyExpense)
                setErrors((p) => ({ ...p, monthlyExpense: undefined }));
            }}
            placeholder="0"
            aria-invalid={errors.monthlyExpense ? true : undefined}
            aria-describedby={
              errors.monthlyExpense ? "monthlyExpense-error" : "monthlyExpense-hint"
            }
            className="min-w-0 flex-1 bg-transparent text-[0.9375rem] text-foreground placeholder:text-muted focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
        </div>
        {errors.monthlyExpense ? (
          <p id="monthlyExpense-error" className="text-xs text-red-500">
            {errors.monthlyExpense}
          </p>
        ) : (
          <p id="monthlyExpense-hint" className="text-xs text-muted">
            {expensePreview
              ? expensePreview
              : "Rata-rata kebutuhan rutin per bulan. Dipakai sebagai pos Kebutuhan."}
          </p>
        )}
      </div>

      {/* Target_Amount */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="targetAmount" className="text-sm font-medium text-foreground">
          Target tabungan
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
              if (errors.targetAmount)
                setErrors((p) => ({ ...p, targetAmount: undefined }));
            }}
            placeholder="0"
            aria-invalid={errors.targetAmount ? true : undefined}
            aria-describedby={
              errors.targetAmount ? "targetAmount-error" : "targetAmount-hint"
            }
            className="min-w-0 flex-1 bg-transparent text-[0.9375rem] text-foreground placeholder:text-muted focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
        </div>
        {errors.targetAmount ? (
          <p id="targetAmount-error" className="text-xs text-red-500">
            {errors.targetAmount}
          </p>
        ) : (
          <p id="targetAmount-hint" className="text-xs text-muted">
            {targetPreview ? targetPreview : "Nominal yang ingin Anda kumpulkan."}
          </p>
        )}
      </div>

      {/* Horizon_Months */}
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
              if (errors.horizonMonths)
                setErrors((p) => ({ ...p, horizonMonths: undefined }));
            }}
            placeholder="0"
            aria-invalid={errors.horizonMonths ? true : undefined}
            aria-describedby={
              errors.horizonMonths ? "horizonMonths-error" : "horizonMonths-hint"
            }
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
            Berapa bulan untuk mencapai target ini.
          </p>
        )}
      </div>

      {/* currentSavings — konteks READ-ONLY (Req 17.3) */}
      {savings != null && (
        <div className="flex items-center gap-2.5 rounded-xl border border-border bg-background/60 px-3.5 py-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-[var(--accent)]">
            <PiggyBank className="h-4 w-4" />
          </span>
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="text-xs text-muted">Tabungan saat ini</span>
            <span className="text-sm font-medium text-foreground">
              {formatRupiah(savings)}
            </span>
          </div>
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[var(--accent)] text-[0.9375rem] font-medium text-white transition-all duration-200 hover:brightness-110 disabled:cursor-not-allowed disabled:bg-border disabled:text-muted"
      >
        {submitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Menghitung...
          </>
        ) : (
          <>
            Hitung anggaran
            <ArrowRight className="h-4 w-4" />
          </>
        )}
      </button>
    </form>
  );
}
