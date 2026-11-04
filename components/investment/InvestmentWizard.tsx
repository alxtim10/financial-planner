"use client";

import { useState } from "react";
import { Loader2, AlertCircle, Check } from "lucide-react";
import GoalSelector, { type SelectedGoal } from "@/components/goal/GoalSelector";
import RiskSurvey, { type RiskSurveyResult } from "./RiskSurvey";
import RecommendationCard, {
  type InvestmentRecommendation,
} from "./RecommendationCard";

/** Langkah alur: Goal → Survei → Rekomendasi. */
type Step = 1 | 2 | 3;

const STEP_LABELS: Record<Step, string> = {
  1: "Tujuan",
  2: "Survei",
  3: "Rekomendasi",
};

/**
 * InvestmentWizard — orkestrator client alur Investasi (Req 6.1, 6.2, 6.3, 7.x).
 *
 * Merangkai GoalSelector → RiskSurvey → RecommendationCard sebagai stepper:
 *  1. GoalSelector: pilih satu/beberapa/semua tujuan (multi-tujuan). Bila belum
 *     ada tujuan tersimpan, pengguna mengisi satu tujuan manual (fallback).
 *  2. RiskSurvey: kumpulkan riskAnswers (number[] panjang 5).
 *  3. Ambil currentSavings via GET /api/profile, lalu POST /api/recommendation
 *     dengan daftar `goals` terpilih; server memakai SATU alokasi + agregasi
 *     opsi A, lalu menampilkan RecommendationCard.
 *
 * Wizard TIDAK membuat/mengubah baris Goal — dashboard satu-satunya pengelola
 * Goal. Pilihan di sini bersifat satu kali untuk skenario perhitungan.
 *
 * Menangani loading & error dengan pesan Bahasa Indonesia yang ramah.
 */
export default function InvestmentWizard() {
  const [step, setStep] = useState<Step>(1);
  // Tujuan terpilih (≥1) dari GoalSelector.
  const [selectedGoals, setSelectedGoals] = useState<SelectedGoal[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recommendation, setRecommendation] = useState<InvestmentRecommendation | null>(null);
  // Sisa kas bulanan (pemasukan − pengeluaran) dari profil, untuk peringatan
  // keterjangkauan setoran. null = belum/ tidak diketahui (tak tampilkan).
  const [monthlySurplus, setMonthlySurplus] = useState<number | null>(null);

  /** Langkah 1 selesai: simpan tujuan terpilih, lanjut ke survei. */
  function handleGoalsSelected(goals: SelectedGoal[]) {
    setSelectedGoals(goals);
    setError(null);
    setStep(2);
  }

  /** Langkah 2 selesai: ambil savings, hitung rekomendasi, lanjut ke langkah 3. */
  async function handleSurveyComplete({ answers: riskAnswers, selectedInstruments }: RiskSurveyResult) {
    if (selectedGoals.length === 0) {
      setError("Belum ada tujuan dipilih. Silakan mulai dari awal.");
      setStep(1);
      return;
    }

    setStep(3);
    setLoading(true);
    setError(null);
    setRecommendation(null);

    try {
      // Ambil currentSavings dari profil (gate memastikan profil ada). Sekalian
      // ambil pemasukan & pengeluaran untuk menghitung sisa kas bulanan, dipakai
      // peringatan keterjangkauan setoran di RecommendationCard.
      let currentSavings = 0;
      let surplus: number | null = null;
      const profileRes = await fetch("/api/profile", { method: "GET" });
      if (profileRes.ok) {
        const data = await profileRes.json();
        const savings = data?.profile?.currentSavings;
        if (typeof savings === "number" && Number.isFinite(savings)) {
          currentSavings = savings;
        }
        const income = data?.profile?.income;
        const expense = data?.profile?.expense;
        if (
          typeof income === "number" &&
          Number.isFinite(income) &&
          typeof expense === "number" &&
          Number.isFinite(expense)
        ) {
          surplus = income - expense;
        }
      }
      setMonthlySurplus(surplus);

      const res = await fetch("/api/recommendation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // Daftar tujuan terpilih (satu, beberapa, atau semua). Server
          // mengagregasi target + horizon (opsi A) dengan satu alokasi.
          goals: selectedGoals.map((g) => ({
            id: g.id,
            name: g.name,
            targetAmount: g.targetAmount,
            horizonMonths: g.horizonMonths,
          })),
          riskAnswers,
          // Pilihan instrumen opsional; kosong = sistem menentukan alokasi.
          selectedInstruments,
          currentSavings,
        }),
      });

      if (res.ok) {
        const data = (await res.json()) as InvestmentRecommendation;
        setRecommendation(data);
        return;
      }

      let msg = "Gagal menghitung rekomendasi. Coba lagi sebentar.";
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
      setLoading(false);
    }
  }

  /** Ulang seluruh alur dari awal. */
  function handleRestart() {
    setStep(1);
    setSelectedGoals([]);
    setRecommendation(null);
    setMonthlySurplus(null);
    setError(null);
    setLoading(false);
  }

  /** Coba ulang perhitungan rekomendasi (kembali ke survei). */
  function handleRetryRecommendation() {
    setError(null);
    setRecommendation(null);
    setStep(2);
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Stepper indikator */}
      <ol className="flex items-center gap-2" aria-label="Langkah perencanaan investasi">
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

      {/* Konten per langkah */}
      {step === 1 && (
        <GoalSelector
          submitLabel="Lanjut ke survei risiko"
          onSubmitted={handleGoalsSelected}
        />
      )}

      {step === 2 && (
        <RiskSurvey onComplete={handleSurveyComplete} onBack={() => setStep(1)} />
      )}

      {step === 3 && (
        <>
          {loading && (
            <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-border bg-surface px-5 py-12 text-center">
              <Loader2 className="h-6 w-6 animate-spin text-[var(--accent)]" />
              <p className="text-sm text-muted">Menghitung rekomendasi untuk Anda...</p>
            </div>
          )}

          {!loading && error && (
            <div className="flex flex-col items-center gap-4 rounded-2xl border border-red-200 bg-red-50 px-5 py-10 text-center">
              <AlertCircle className="h-6 w-6 text-red-500" />
              <p className="text-sm text-red-600">{error}</p>
              <div className="flex flex-wrap items-center justify-center gap-2.5">
                <button
                  type="button"
                  onClick={handleRetryRecommendation}
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

          {!loading && !error && recommendation && (
            <RecommendationCard
              recommendation={recommendation}
              monthlySurplus={monthlySurplus}
              onRestart={handleRestart}
            />
          )}
        </>
      )}
    </div>
  );
}
