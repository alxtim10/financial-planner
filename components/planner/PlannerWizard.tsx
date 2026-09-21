"use client";

import { useEffect, useState } from "react";
import { Loader2, AlertCircle, Check, ArrowRight } from "lucide-react";
import PresetPicker from "./PresetPicker";
import BudgetForm, { type BudgetFormValues } from "./BudgetForm";
import BudgetResultCard from "./BudgetResultCard";
import type {
  BudgetBreakdown,
  CustomAllocation,
  PresetId,
  SavingsMode,
  SavingsProjection,
  ShortfallResult,
} from "@/types/planner";

/** Langkah alur: Preset → Form → Hasil. */
type Step = 1 | 2 | 3;

const STEP_LABELS: Record<Step, string> = {
  1: "Metode",
  2: "Anggaran",
  3: "Hasil",
};

/** Bentuk respons sukses dari POST /api/budget. */
interface BudgetResult {
  breakdown: BudgetBreakdown;
  savingsBucketAmount: number;
  investmentContribution: number;
  shortfall: ShortfallResult;
  savingsProjection: SavingsProjection | null;
  recommendationMissing?: boolean;
}

/**
 * PlannerWizard — orkestrator client alur Planner (Req 1.2, 4.1, 8.1, 9.1).
 *
 * Merangkai PresetPicker → BudgetForm → BudgetResultCard sebagai stepper:
 *  1. PresetPicker: pilih 1 dari 3 metode penganggaran (wajib sebelum lanjut).
 *  2. BudgetForm: isi Base_Amount (prefilled dari profil), Savings_Mode, dan
 *     proyeksi target tabungan opsional; submit → POST /api/budget.
 *  3. BudgetResultCard: tampilkan Budget_Breakdown, ringkasan tabungan, dan
 *     peringatan Savings_Shortfall.
 *
 * Pada mount, GET /api/budget menarik defaultBaseAmount (income profil) untuk
 * memprefill form. Menangani loading & error dengan pesan Bahasa Indonesia
 * yang ramah.
 */
export default function PlannerWizard() {
  const [step, setStep] = useState<Step>(1);

  // Konteks awal dari GET /api/budget.
  const [loadingContext, setLoadingContext] = useState(true);
  const [defaultBaseAmount, setDefaultBaseAmount] = useState<number | null>(null);
  // currentSavings profil terbaru — dipakai toggle Include_Savings (Req 14.5, 14.6).
  const [currentSavings, setCurrentSavings] = useState<number | null>(null);

  // Pilihan preset (langkah 1).
  const [selectedId, setSelectedId] = useState<PresetId | null>(null);

  // Persentase Custom_Allocation (langkah 1, hanya relevan bila preset custom).
  // Default 50/30/20 agar total awal sudah tepat 100.
  const [customAllocation, setCustomAllocation] = useState<CustomAllocation>({
    kebutuhan: 50,
    keinginan: 30,
    ditabung: 20,
  });

  // Mode yang disubmit (dipakai untuk render BudgetResultCard).
  const [submittedMode, setSubmittedMode] = useState<SavingsMode>("terpisah");

  // Proses POST /api/budget (langkah 2 → 3).
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BudgetResult | null>(null);

  // Muat konteks awal saat mount: defaultBaseAmount untuk prefill form.
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/budget", { method: "GET" });
        if (!active) return;
        if (res.ok) {
          const data = await res.json();
          const base = data?.defaultBaseAmount;
          if (typeof base === "number" && Number.isFinite(base)) {
            setDefaultBaseAmount(base);
          }
          const savings = data?.currentSavings;
          if (typeof savings === "number" && Number.isFinite(savings)) {
            setCurrentSavings(savings);
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

  // Total Custom_Allocation valid bila berjumlah tepat 100 (toleransi epsilon).
  const customTotal =
    customAllocation.kebutuhan +
    customAllocation.keinginan +
    customAllocation.ditabung;
  const customTotalValid = Math.abs(customTotal - 100) < 1e-9;

  /**
   * Langkah 1: pilih preset. Preset TETAP langsung lanjut ke form (perilaku
   * lama). Preset "custom" TIDAK auto-advance — pengguna mengisi persentase di
   * picker dulu lalu menekan "Lanjut" (gated total = 100). Req 16.8, 16.9.
   */
  function handleSelectPreset(id: PresetId) {
    setSelectedId(id);
    setError(null);
    if (id !== "custom") setStep(2);
  }

  /** Lanjut dari picker custom ke form; hanya bila total = 100. Req 16.9. */
  function handleCustomContinue() {
    if (!customTotalValid) {
      setError("Total persentase kustom harus tepat 100% sebelum lanjut.");
      return;
    }
    setError(null);
    setStep(2);
  }

  /** Langkah 2 selesai: hitung + simpan anggaran via POST, lalu tampilkan hasil. */
  async function handleFormSubmit(values: BudgetFormValues) {
    if (!selectedId) {
      setError("Silakan pilih metode penganggaran terlebih dahulu.");
      setStep(1);
      return;
    }

    // Validasi sisi klien Custom: cegah submit selama total ≠ 100 (Req 16.9).
    if (selectedId === "custom" && !customTotalValid) {
      setError("Total persentase kustom harus tepat 100% sebelum menghitung.");
      setStep(1);
      return;
    }

    setSubmitting(true);
    setError(null);
    setResult(null);
    setSubmittedMode(values.mode);

    try {
      const res = await fetch("/api/budget", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          presetId: selectedId,
          baseAmount: values.baseAmount,
          mode: values.mode,
          savingsTargetAmount: values.savingsTargetAmount,
          savingsHorizonYears: values.savingsHorizonYears,
          includeSavings: values.includeSavings,
          // Kirim customAllocation HANYA untuk preset custom; preset tetap
          // tidak menyertakannya (perilaku tidak berubah). Req 16.1, 16.5.
          ...(selectedId === "custom" ? { customAllocation } : {}),
        }),
      });

      if (res.ok) {
        const data = (await res.json()) as BudgetResult;
        setResult(data);
        setStep(3);
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
    setSelectedId(null);
    setCustomAllocation({ kebutuhan: 50, keinginan: 30, ditabung: 20 });
    setResult(null);
    setError(null);
    setSubmitting(false);
    setSubmittedMode("terpisah");
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Stepper indikator */}
      <ol className="flex items-center gap-2" aria-label="Langkah perencanaan anggaran">
        {([1, 2, 3] as Step[]).map((s, i) => {
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
              {i < 2 && <span className="h-px flex-1 bg-border" />}
            </li>
          );
        })}
      </ol>

      {/* Langkah 1: pilih preset */}
      {step === 1 && (
        <div className="flex flex-col gap-4">
          <PresetPicker
            selectedId={selectedId}
            onSelect={handleSelectPreset}
            customAllocation={customAllocation}
            onCustomAllocationChange={setCustomAllocation}
          />

          {/* Custom: tombol Lanjut (aktif hanya bila total = 100 — Req 16.9). */}
          {selectedId === "custom" && (
            <>
              {error && (
                <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3.5">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}
              <button
                type="button"
                onClick={handleCustomContinue}
                disabled={!customTotalValid}
                className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[var(--accent)] text-[0.9375rem] font-medium text-white transition-all duration-200 hover:brightness-110 disabled:cursor-not-allowed disabled:bg-border disabled:text-muted"
              >
                Lanjut
                <ArrowRight className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      )}

      {/* Langkah 2: isi anggaran */}
      {step === 2 && (
        <div className="flex flex-col gap-4">
          <button
            type="button"
            onClick={() => {
              setError(null);
              setStep(1);
            }}
            className="inline-flex w-fit items-center gap-1.5 text-sm text-muted transition-colors hover:text-foreground"
          >
            Ganti metode ({selectedId})
          </button>

          {loadingContext ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-border bg-surface px-5 py-12 text-center">
              <Loader2 className="h-6 w-6 animate-spin text-[var(--accent)]" />
              <p className="text-sm text-muted">Memuat data profil Anda...</p>
            </div>
          ) : (
            <>
              <BudgetForm
                defaultBaseAmount={defaultBaseAmount}
                currentSavings={currentSavings}
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

      {/* Langkah 3: hasil */}
      {step === 3 && (
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
                    setStep(2);
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
            <BudgetResultCard
              breakdown={result.breakdown}
              savingsBucketAmount={result.savingsBucketAmount}
              investmentContribution={result.investmentContribution}
              shortfall={result.shortfall}
              savingsProjection={result.savingsProjection}
              mode={submittedMode}
              recommendationMissing={result.recommendationMissing}
              onRestart={handleRestart}
            />
          )}
        </>
      )}
    </div>
  );
}
