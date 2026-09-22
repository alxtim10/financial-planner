"use client";

import { useEffect, useState } from "react";
import { Loader2, AlertCircle, Check } from "lucide-react";
import GoalForm, { type GoalValues } from "./GoalForm";
import RiskSurvey from "./RiskSurvey";
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

/** Bentuk Active_Goal yang mengalir dari GET /api/goal (createdAt diomit). */
interface ActiveGoal {
  id: string;
  name: string | null;
  targetAmount: number;
  horizonYears: number;
}

/**
 * InvestmentWizard — orkestrator client alur Investasi (Req 6.1, 6.2, 6.3, 7.x).
 *
 * Merangkai GoalForm → RiskSurvey → RecommendationCard sebagai stepper:
 *  1. GoalForm: kumpulkan targetAmount, horizonYears — terprefill dari
 *     Active_Goal (GET /api/goal saat mount); pengguna boleh menimpa (one-off).
 *  2. RiskSurvey: kumpulkan riskAnswers (number[] panjang 5).
 *  3. Ambil currentSavings via GET /api/profile, lalu POST /api/recommendation
 *     dengan goalId dari Active_Goal + target/horizon efektif; tampilkan
 *     RecommendationCard.
 *
 * Wizard TIDAK membuat baris Goal (tidak POST /api/goal) — dashboard satu-satunya
 * pembuat Goal, dan override di form bersifat satu kali (tidak dipersistensi).
 *
 * Menangani loading & error dengan pesan Bahasa Indonesia yang ramah.
 */
export default function InvestmentWizard() {
  const [step, setStep] = useState<Step>(1);
  // Active_Goal dari GET /api/goal (sumber goalId + nilai prefill).
  const [activeGoal, setActiveGoal] = useState<ActiveGoal | null>(null);
  // Nilai target/horizon efektif (bisa hasil override di GoalForm).
  const [goal, setGoal] = useState<GoalValues | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recommendation, setRecommendation] = useState<InvestmentRecommendation | null>(null);

  // Muat Active_Goal saat mount untuk memprefill GoalForm. Non-fatal bila gagal
  // atau null: form dibiarkan kosong dan input manual tetap diperbolehkan.
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/goal", { method: "GET" });
        if (!active) return;
        if (res.ok) {
          const data = await res.json();
          const g = data?.goal;
          if (
            g &&
            typeof g.targetAmount === "number" &&
            Number.isFinite(g.targetAmount) &&
            typeof g.horizonYears === "number" &&
            Number.isFinite(g.horizonYears)
          ) {
            setActiveGoal({
              id: g.id,
              name: typeof g.name === "string" ? g.name : null,
              targetAmount: g.targetAmount,
              horizonYears: g.horizonYears,
            });
          }
        }
        // Gagal/null → biarkan activeGoal null; form kosong, input manual.
      } catch {
        /* offline / gangguan jaringan — biarkan form terisi manual */
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  /** Langkah 1 selesai: simpan nilai efektif (target/horizon), lanjut ke survei. */
  function handleGoalSubmitted(values: GoalValues) {
    setGoal(values);
    setError(null);
    setStep(2);
  }

  /** Langkah 2 selesai: ambil savings, hitung rekomendasi, lanjut ke langkah 3. */
  async function handleSurveyComplete(riskAnswers: number[]) {
    if (!goal) {
      setError("Data tujuan tidak ditemukan. Silakan mulai dari awal.");
      setStep(1);
      return;
    }

    setStep(3);
    setLoading(true);
    setError(null);
    setRecommendation(null);

    try {
      // Ambil currentSavings dari profil (gate memastikan profil ada).
      let currentSavings = 0;
      const profileRes = await fetch("/api/profile", { method: "GET" });
      if (profileRes.ok) {
        const data = await profileRes.json();
        const savings = data?.profile?.currentSavings;
        if (typeof savings === "number" && Number.isFinite(savings)) {
          currentSavings = savings;
        }
      }

      const res = await fetch("/api/recommendation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // goalId berasal dari Active_Goal (bukan dari form) — bisa undefined
          // bila belum ada tujuan tersimpan.
          goalId: activeGoal?.id ?? undefined,
          // target/horizon efektif dari form (mungkin hasil override satu kali).
          targetAmount: goal.targetAmount,
          horizonYears: goal.horizonYears,
          riskAnswers,
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
    setGoal(null);
    setRecommendation(null);
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
        <GoalForm
          initial={(() => {
            // Prefill: nilai efektif (override sebelumnya) diprioritaskan, lalu
            // Active_Goal. GoalForm memformat target dengan pemisah ribuan.
            const source = goal ?? activeGoal;
            return source
              ? {
                  targetAmount: String(source.targetAmount),
                  horizonYears: String(source.horizonYears),
                }
              : undefined;
          })()}
          onSubmitted={handleGoalSubmitted}
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
            <RecommendationCard recommendation={recommendation} onRestart={handleRestart} />
          )}
        </>
      )}
    </div>
  );
}
