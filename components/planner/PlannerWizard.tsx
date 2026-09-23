"use client";

import { useEffect, useState } from "react";
import { Loader2, AlertCircle, Check } from "lucide-react";
import BudgetForm, { type BudgetFormValues } from "./BudgetForm";
import BudgetResultCard from "./BudgetResultCard";
import type { GoalBudgetResult } from "@/types/planner";

/** Langkah alur goal-driven: Tujuan → Hasil. */
type Step = 1 | 2;

const STEP_LABELS: Record<Step, string> = {
  1: "Tujuan",
  2: "Hasil",
};

/**
 * PlannerWizard — orkestrator client alur Planner goal-driven (Req 17.2, 17.3,
 * 21.1). Alur disederhanakan menjadi dua langkah: form tujuan → hasil.
 * PresetPicker dan logika preset/custom/mode telah dihapus.
 *
 *  1. BudgetForm: isi Monthly_Income (prefilled dari profil), Target_Amount,
 *     dan Horizon_Years; `currentSavings` ditampilkan read-only. Submit →
 *     POST /api/budget.
 *  2. BudgetResultCard: tampilkan GoalBudgetResult (tiga pos + Derived_Percentage,
 *     baris target, status, dan feasibility).
 *
 * Pada mount, GET /api/budget menarik defaultMonthlyIncome + currentSavings
 * untuk konteks form. Menangani loading & error dengan pesan Bahasa Indonesia
 * yang ramah.
 */
export default function PlannerWizard() {
  const [step, setStep] = useState<Step>(1);

  // Konteks awal dari GET /api/budget.
  const [loadingContext, setLoadingContext] = useState(true);
  const [defaultMonthlyIncome, setDefaultMonthlyIncome] = useState<number | null>(
    null
  );
  const [defaultMonthlyExpense, setDefaultMonthlyExpense] = useState<
    number | null
  >(null);
  const [currentSavings, setCurrentSavings] = useState<number | null>(null);
  // Prefill tujuan dari Active_Goal (via GET /api/budget).
  const [defaultTargetAmount, setDefaultTargetAmount] = useState<number | null>(
    null
  );
  const [defaultHorizonMonths, setDefaultHorizonMonths] = useState<number | null>(
    null
  );

  // Proses POST /api/budget (langkah 1 → 2).
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GoalBudgetResult | null>(null);

  // Muat konteks awal saat mount: defaultMonthlyIncome + currentSavings.
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/budget", { method: "GET" });
        if (!active) return;
        if (res.ok) {
          const data = await res.json();
          const income = data?.defaultMonthlyIncome;
          if (typeof income === "number" && Number.isFinite(income)) {
            setDefaultMonthlyIncome(income);
          }
          const expense = data?.monthlyExpense;
          if (typeof expense === "number" && Number.isFinite(expense)) {
            setDefaultMonthlyExpense(expense);
          }
          const savings = data?.currentSavings;
          if (typeof savings === "number" && Number.isFinite(savings)) {
            setCurrentSavings(savings);
          }
          const goalTarget = data?.goalTargetAmount;
          if (typeof goalTarget === "number" && Number.isFinite(goalTarget)) {
            setDefaultTargetAmount(goalTarget);
          }
          const goalHorizon = data?.goalHorizonMonths;
          if (typeof goalHorizon === "number" && Number.isFinite(goalHorizon)) {
            setDefaultHorizonMonths(goalHorizon);
          }
        }
        // Bila gagal memuat konteks, form tetap dapat diisi manual — bukan
        // error fatal, jadi tidak diperlakukan sebagai kegagalan alur.
      } catch {
        /* offline / gangguan jaringan — biarkan form terisi manual */
      } finally {
        if (active) setLoadingContext(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  /** Langkah 1 selesai: hitung + simpan anggaran via POST, lalu tampilkan hasil. */
  async function handleFormSubmit(values: BudgetFormValues) {
    setSubmitting(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/budget", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          monthlyIncome: values.monthlyIncome,
          monthlyExpense: values.monthlyExpense,
          targetAmount: values.targetAmount,
          horizonMonths: values.horizonMonths,
        }),
      });

      if (res.ok) {
        const data = (await res.json()) as GoalBudgetResult;
        setResult(data);
        setStep(2);
        return;
      }

      let msg = "Gagal menghitung anggaran. Coba lagi sebentar.";
      try {
        const data = await res.json();
        if (data?.error) msg = data.error;
      } catch {
        /* body bukan JSON — pakai pesan default */
      }
      setError(msg);
    } catch {
      setError("Gagal terhubung ke server. Periksa koneksi Anda.");
    } finally {
      setSubmitting(false);
    }
  }

  /** Ulang seluruh alur dari awal. */
  function handleRestart() {
    setStep(1);
    setResult(null);
    setError(null);
    setSubmitting(false);
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Stepper indikator */}
      <ol className="flex items-center gap-2" aria-label="Langkah perencanaan anggaran">
        {([1, 2] as Step[]).map((s, i) => {
          const active = step === s;
          const done = step > s;
          return (
            <li key={s} className="flex flex-1 items-center gap-2">
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-medium transition-colors ${
                  active
                    ? "bg-[var(--accent)] text-white"
                    : done
                      ? "bg-accent-soft text-[var(--accent)]"
                      : "bg-surface text-muted"
                }`}
                aria-current={active ? "step" : undefined}
              >
                {done ? <Check className="h-4 w-4" /> : s}
              </span>
              <span
                className={`hidden text-sm sm:inline ${
                  active ? "font-medium text-foreground" : "text-muted"
                }`}
              >
                {STEP_LABELS[s]}
              </span>
              {i < 1 && <span className="h-px flex-1 bg-border" />}
            </li>
          );
        })}
      </ol>

      {/* Langkah 1: isi tujuan */}
      {step === 1 && (
        <div className="flex flex-col gap-4">
          {loadingContext ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-border bg-surface px-5 py-12 text-center">
              <Loader2 className="h-6 w-6 animate-spin text-[var(--accent)]" />
              <p className="text-sm text-muted">Memuat data profil Anda...</p>
            </div>
          ) : (
            <>
              <BudgetForm
                defaultMonthlyIncome={defaultMonthlyIncome}
                defaultMonthlyExpense={defaultMonthlyExpense}
                currentSavings={currentSavings}
                defaultTargetAmount={defaultTargetAmount}
                defaultHorizonMonths={defaultHorizonMonths}
                onSubmit={handleFormSubmit}
                submitting={submitting}
              />
              {error && (
                <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3.5">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Langkah 2: hasil */}
      {step === 2 && (
        <>
          {submitting && (
            <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-border bg-surface px-5 py-12 text-center">
              <Loader2 className="h-6 w-6 animate-spin text-[var(--accent)]" />
              <p className="text-sm text-muted">Menghitung anggaran untuk Anda...</p>
            </div>
          )}

          {!submitting && error && (
            <div className="flex flex-col items-center gap-4 rounded-2xl border border-red-200 bg-red-50 px-5 py-10 text-center">
              <AlertCircle className="h-6 w-6 text-red-500" />
              <p className="text-sm text-red-600">{error}</p>
              <div className="flex flex-wrap items-center justify-center gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setResult(null);
                    setStep(1);
                  }}
                  className="flex h-10 items-center justify-center rounded-xl bg-[var(--accent)] px-4 text-sm font-medium text-white transition-all hover:brightness-110"
                >
                  Coba lagi
                </button>
                <button
                  type="button"
                  onClick={handleRestart}
                  className="flex h-10 items-center justify-center rounded-xl border border-border bg-background px-4 text-sm font-medium text-muted transition-colors hover:text-foreground"
                >
                  Mulai dari awal
                </button>
              </div>
            </div>
          )}

          {!submitting && !error && result && (
            <BudgetResultCard result={result} onRestart={handleRestart} />
          )}
        </>
      )}
    </div>
  );
}
