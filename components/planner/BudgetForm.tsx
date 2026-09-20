"use client";

import { useState } from "react";
import {
  Wallet,
  PiggyBank,
  TrendingUp,
  Loader2,
  ArrowRight,
  Info,
  Target,
  CalendarClock,
} from "lucide-react";
import type { SavingsMode } from "@/types/planner";

/** Nilai yang diserahkan ke parent (PlannerWizard) saat submit. */
export interface BudgetFormValues {
  baseAmount: number;
  mode: SavingsMode;
  manualSavingsTarget: number | null;
  /** Savings_Target_Amount (Rupiah); `null` bila field kosong (tanpa proyeksi). */
  savingsTargetAmount: number | null;
  /** Savings_Horizon (tahun); `null` bila field kosong. */
  savingsHorizonYears: number | null;
}

interface BudgetFormProps {
  /** Prefill Base_Amount dari `income` profil terbaru; `null` bila tak ada. */
  defaultBaseAmount: number | null;
  /**
   * Kontribusi investasi bulanan (monthlyContribution) dari rekomendasi
   * terbaru, ditarik saat mode `kombinasi`. `null`/`0` berarti belum ada
   * rekomendasi tersimpan.
   */
  investmentContribution?: number | null;
  /** Dipanggil dengan nilai terparsir saat form valid dan disubmit. */
  onSubmit: (values: BudgetFormValues) => void;
  /** Menonaktifkan tombol submit selama proses berlangsung. */
  submitting?: boolean;
}

type FieldKey =
  | "baseAmount"
  | "manualSavingsTarget"
  | "savingsTargetAmount"
  | "savingsHorizonYears";
type FieldErrors = Partial<Record<FieldKey, string>>;

/** Format angka ke Rupiah gaya Indonesia (10000 → "Rp 10.000"). */
function formatRupiah(value: number): string {
  return `Rp ${Math.round(value).toLocaleString("id-ID")}`;
}

/** Pratinjau Rupiah dari input mentah; `null` bila kosong/bukan angka. */
function previewRupiah(raw: string): string | null {
  const n = Number(raw);
  if (raw.trim() === "" || !Number.isFinite(n)) return null;
  return formatRupiah(n);
}

/** Validasi Base_Amount: wajib, angka berhingga, ≥ 0 (Req 2.2, 2.3). */
function validateBaseAmount(value: string): string | undefined {
  const trimmed = value.trim();
  if (trimmed === "") return "Wajib diisi.";
  const n = Number(trimmed);
  if (!Number.isFinite(n)) return "Harus berupa angka.";
  if (n < 0) return "Tidak boleh negatif.";
  return undefined;
}

/** Validasi Manual_Savings_Target: opsional, tapi bila diisi harus angka ≥ 0 (Req 5.2, 5.4). */
function validateManualTarget(value: string): string | undefined {
  const trimmed = value.trim();
  if (trimmed === "") return undefined;
  const n = Number(trimmed);
  if (!Number.isFinite(n)) return "Harus berupa angka.";
  if (n < 0) return "Tidak boleh negatif.";
  return undefined;
}

/** Validasi Savings_Target_Amount: opsional, tapi bila diisi harus angka > 0 (Req 11.1, 11.7). */
function validateSavingsTarget(value: string): string | undefined {
  const trimmed = value.trim();
  if (trimmed === "") return undefined;
  const n = Number(trimmed);
  if (!Number.isFinite(n)) return "Harus berupa angka.";
  if (n <= 0) return "Harus lebih dari 0.";
  return undefined;
}

/** Validasi Savings_Horizon: opsional, tapi bila diisi harus bilangan bulat positif (Req 11.1, 11.8). */
function validateSavingsHorizon(value: string): string | undefined {
  const trimmed = value.trim();
  if (trimmed === "") return undefined;
  const n = Number(trimmed);
  if (!Number.isFinite(n)) return "Harus berupa angka.";
  if (!Number.isInteger(n)) return "Harus bilangan bulat.";
  if (n <= 0) return "Harus lebih dari 0.";
  return undefined;
}

const MODES: { value: SavingsMode; label: string; hint: string }[] = [
  {
    value: "terpisah",
    label: "Terpisah",
    hint: "Target tabungan berdiri sendiri.",
  },
  {
    value: "kombinasi",
    label: "Kombinasi",
    hint: "Tarik kontribusi dari rencana investasi.",
  },
];

/**
 * BudgetForm — input Base_Amount, Savings_Mode, dan Manual_Savings_Target
 * (Req 2.1, 2.2, 5.1, 5.2, 5.4). Base_Amount diprefill dari profil dan dapat
 * ditimpa. Pada mode `kombinasi`, kontribusi investasi bulanan ditampilkan
 * read-only (Req 5.3); bila belum ada rekomendasi, pengguna diberi tahu (Req 5.5).
 */
export default function BudgetForm({
  defaultBaseAmount,
  investmentContribution,
  onSubmit,
  submitting = false,
}: BudgetFormProps) {
  const [baseAmount, setBaseAmount] = useState(
    defaultBaseAmount != null && Number.isFinite(defaultBaseAmount)
      ? String(defaultBaseAmount)
      : ""
  );
  const [mode, setMode] = useState<SavingsMode>("terpisah");
  const [manualSavingsTarget, setManualSavingsTarget] = useState("");
  const [savingsTargetAmount, setSavingsTargetAmount] = useState("");
  const [savingsHorizonYears, setSavingsHorizonYears] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});

  const contribution =
    investmentContribution != null && Number.isFinite(investmentContribution)
      ? investmentContribution
      : 0;
  const hasContribution = contribution > 0;

  function validateAll(): boolean {
    const next: FieldErrors = {};
    const baseErr = validateBaseAmount(baseAmount);
    if (baseErr) next.baseAmount = baseErr;
    const targetErr = validateManualTarget(manualSavingsTarget);
    if (targetErr) next.manualSavingsTarget = targetErr;
    const savingsTargetErr = validateSavingsTarget(savingsTargetAmount);
    if (savingsTargetErr) next.savingsTargetAmount = savingsTargetErr;
    const savingsHorizonErr = validateSavingsHorizon(savingsHorizonYears);
    if (savingsHorizonErr) next.savingsHorizonYears = savingsHorizonErr;
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    if (!validateAll()) return;

    const parsedTarget = manualSavingsTarget.trim();
    const parsedSavingsTarget = savingsTargetAmount.trim();
    const parsedSavingsHorizon = savingsHorizonYears.trim();
    onSubmit({
      baseAmount: Number(baseAmount),
      mode,
      manualSavingsTarget: parsedTarget === "" ? null : Number(parsedTarget),
      savingsTargetAmount:
        parsedSavingsTarget === "" ? null : Number(parsedSavingsTarget),
      savingsHorizonYears:
        parsedSavingsHorizon === "" ? null : Number(parsedSavingsHorizon),
    });
  }

  const basePreview = previewRupiah(baseAmount);
  const targetPreview = previewRupiah(manualSavingsTarget);
  const savingsTargetPreview = previewRupiah(savingsTargetAmount);

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="flex flex-col gap-5 rounded-2xl border border-border bg-surface p-5 shadow-[0_2px_20px_rgba(0,0,0,0.04)] sm:p-6"
    >
      {/* Base_Amount */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="baseAmount" className="text-sm font-medium text-foreground">
          Jumlah dasar (pemasukan bulanan)
        </label>
        <div
          className={`flex items-center gap-2.5 rounded-xl border bg-background px-3 py-2.5 transition-shadow focus-within:shadow-[0_2px_16px_rgba(0,180,216,0.12)] ${
            errors.baseAmount
              ? "border-red-400"
              : "border-border focus-within:border-[var(--accent)]/50"
          }`}
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-[var(--accent)]">
            <Wallet className="h-4 w-4" />
          </span>
          <span className="shrink-0 text-sm text-muted">Rp</span>
          <input
            id="baseAmount"
            name="baseAmount"
            type="number"
            inputMode="numeric"
            min={0}
            step="any"
            value={baseAmount}
            onChange={(e) => {
              setBaseAmount(e.target.value);
              if (errors.baseAmount) setErrors((p) => ({ ...p, baseAmount: undefined }));
            }}
            placeholder="0"
            aria-invalid={errors.baseAmount ? true : undefined}
            aria-describedby={errors.baseAmount ? "baseAmount-error" : "baseAmount-hint"}
            className="min-w-0 flex-1 bg-transparent text-[0.9375rem] text-foreground placeholder:text-muted focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
        </div>
        {errors.baseAmount ? (
          <p id="baseAmount-error" className="text-xs text-red-500">
            {errors.baseAmount}
          </p>
        ) : (
          <p id="baseAmount-hint" className="text-xs text-muted">
            {basePreview
              ? basePreview
              : "Otomatis dari profil, dapat Anda ubah untuk skenario lain."}
          </p>
        )}
      </div>

      {/* Savings_Mode */}
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-foreground">Mode target tabungan</span>
        <div className="grid grid-cols-2 gap-2.5" role="radiogroup" aria-label="Mode target tabungan">
          {MODES.map((m) => {
            const selected = mode === m.value;
            return (
              <button
                key={m.value}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setMode(m.value)}
                className={`flex flex-col gap-0.5 rounded-xl border px-3.5 py-2.5 text-left transition-all duration-200 ${
                  selected
                    ? "border-[var(--accent)] bg-accent-soft"
                    : "border-border bg-background hover:border-[var(--accent)]/50"
                }`}
              >
                <span className="text-sm font-medium text-foreground">{m.label}</span>
                <span className="text-xs text-muted">{m.hint}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Info kontribusi investasi (mode kombinasi) */}
      {mode === "kombinasi" && (
        <div
          className={`flex items-start gap-2.5 rounded-xl border px-4 py-3.5 ${
            hasContribution
              ? "border-border bg-accent-soft"
              : "border-amber-200 bg-amber-50"
          }`}
        >
          {hasContribution ? (
            <TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent)]" />
          ) : (
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          )}
          {hasContribution ? (
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-muted">
                Kontribusi investasi bulanan dari rekomendasi terbaru
              </span>
              <span className="text-base font-semibold text-foreground">
                {formatRupiah(contribution)}
              </span>
              <span className="text-xs text-muted">
                Nilai ini ditarik otomatis sebagai pos investasi di dalam tabungan.
              </span>
            </div>
          ) : (
            <p className="text-xs leading-relaxed text-amber-700">
              Belum ada rekomendasi investasi tersimpan, jadi kontribusi investasi
              dianggap <span className="font-medium">Rp 0</span>. Selesaikan alur
              Investasi lebih dulu untuk menariknya otomatis.
            </p>
          )}
        </div>
      )}

      {/* Manual_Savings_Target (opsional) */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="manualSavingsTarget" className="text-sm font-medium text-foreground">
          Target tabungan manual{" "}
          <span className="font-normal text-muted">(opsional)</span>
        </label>
        <div
          className={`flex items-center gap-2.5 rounded-xl border bg-background px-3 py-2.5 transition-shadow focus-within:shadow-[0_2px_16px_rgba(0,180,216,0.12)] ${
            errors.manualSavingsTarget
              ? "border-red-400"
              : "border-border focus-within:border-[var(--accent)]/50"
          }`}
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-[var(--accent)]">
            <PiggyBank className="h-4 w-4" />
          </span>
          <span className="shrink-0 text-sm text-muted">Rp</span>
          <input
            id="manualSavingsTarget"
            name="manualSavingsTarget"
            type="number"
            inputMode="numeric"
            min={0}
            step="any"
            value={manualSavingsTarget}
            onChange={(e) => {
              setManualSavingsTarget(e.target.value);
              if (errors.manualSavingsTarget)
                setErrors((p) => ({ ...p, manualSavingsTarget: undefined }));
            }}
            placeholder="0"
            aria-invalid={errors.manualSavingsTarget ? true : undefined}
            aria-describedby={
              errors.manualSavingsTarget
                ? "manualSavingsTarget-error"
                : "manualSavingsTarget-hint"
            }
            className="min-w-0 flex-1 bg-transparent text-[0.9375rem] text-foreground placeholder:text-muted focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
        </div>
        {errors.manualSavingsTarget ? (
          <p id="manualSavingsTarget-error" className="text-xs text-red-500">
            {errors.manualSavingsTarget}
          </p>
        ) : (
          <p id="manualSavingsTarget-hint" className="text-xs text-muted">
            {targetPreview ? targetPreview : "Isi bila ingin menetapkan target sendiri."}
          </p>
        )}
      </div>

      {/* Proyeksi target tabungan (opsional) — Savings_Target_Amount & Savings_Horizon */}
      <div className="flex flex-col gap-3 rounded-xl border border-dashed border-border bg-background/60 p-4">
        <div className="flex items-start gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-[var(--accent)]">
            <Target className="h-4 w-4" />
          </span>
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium text-foreground">
              Proyeksi target tabungan{" "}
              <span className="font-normal text-muted">(opsional)</span>
            </span>
            <span className="text-xs leading-relaxed text-muted">
              Isi target saja → estimasi kapan tercapai. Isi target + jangka waktu →
              tabungan bulanan yang diperlukan.
            </span>
          </div>
        </div>

        {/* Savings_Target_Amount */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="savingsTargetAmount"
            className="text-sm font-medium text-foreground"
          >
            Target tabungan
          </label>
          <div
            className={`flex items-center gap-2.5 rounded-xl border bg-background px-3 py-2.5 transition-shadow focus-within:shadow-[0_2px_16px_rgba(0,180,216,0.12)] ${
              errors.savingsTargetAmount
                ? "border-red-400"
                : "border-border focus-within:border-[var(--accent)]/50"
            }`}
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-[var(--accent)]">
              <Target className="h-4 w-4" />
            </span>
            <span className="shrink-0 text-sm text-muted">Rp</span>
            <input
              id="savingsTargetAmount"
              name="savingsTargetAmount"
              type="number"
              inputMode="numeric"
              min={0}
              step="any"
              value={savingsTargetAmount}
              onChange={(e) => {
                setSavingsTargetAmount(e.target.value);
                if (errors.savingsTargetAmount)
                  setErrors((p) => ({ ...p, savingsTargetAmount: undefined }));
              }}
              placeholder="0"
              aria-invalid={errors.savingsTargetAmount ? true : undefined}
              aria-describedby={
                errors.savingsTargetAmount
                  ? "savingsTargetAmount-error"
                  : "savingsTargetAmount-hint"
              }
              className="min-w-0 flex-1 bg-transparent text-[0.9375rem] text-foreground placeholder:text-muted focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
          </div>
          {errors.savingsTargetAmount ? (
            <p id="savingsTargetAmount-error" className="text-xs text-red-500">
              {errors.savingsTargetAmount}
            </p>
          ) : (
            <p id="savingsTargetAmount-hint" className="text-xs text-muted">
              {savingsTargetPreview
                ? savingsTargetPreview
                : "Nominal yang ingin Anda kumpulkan."}
            </p>
          )}
        </div>

        {/* Savings_Horizon */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="savingsHorizonYears"
            className="text-sm font-medium text-foreground"
          >
            Jangka waktu{" "}
            <span className="font-normal text-muted">(tahun, opsional)</span>
          </label>
          <div
            className={`flex items-center gap-2.5 rounded-xl border bg-background px-3 py-2.5 transition-shadow focus-within:shadow-[0_2px_16px_rgba(0,180,216,0.12)] ${
              errors.savingsHorizonYears
                ? "border-red-400"
                : "border-border focus-within:border-[var(--accent)]/50"
            }`}
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-[var(--accent)]">
              <CalendarClock className="h-4 w-4" />
            </span>
            <input
              id="savingsHorizonYears"
              name="savingsHorizonYears"
              type="number"
              inputMode="numeric"
              min={0}
              step={1}
              value={savingsHorizonYears}
              onChange={(e) => {
                setSavingsHorizonYears(e.target.value);
                if (errors.savingsHorizonYears)
                  setErrors((p) => ({ ...p, savingsHorizonYears: undefined }));
              }}
              placeholder="0"
              aria-invalid={errors.savingsHorizonYears ? true : undefined}
              aria-describedby={
                errors.savingsHorizonYears
                  ? "savingsHorizonYears-error"
                  : "savingsHorizonYears-hint"
              }
              className="min-w-0 flex-1 bg-transparent text-[0.9375rem] text-foreground placeholder:text-muted focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
            <span className="shrink-0 text-sm text-muted">tahun</span>
          </div>
          {errors.savingsHorizonYears ? (
            <p id="savingsHorizonYears-error" className="text-xs text-red-500">
              {errors.savingsHorizonYears}
            </p>
          ) : (
            <p id="savingsHorizonYears-hint" className="text-xs text-muted">
              Kosongkan untuk melihat estimasi kapan target tercapai.
            </p>
          )}
        </div>
      </div>

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
