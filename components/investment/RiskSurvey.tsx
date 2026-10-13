"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight, ShieldQuestion, Sparkles } from "lucide-react";
import {
  INSTRUMENT_CATEGORIES,
  type InstrumentCategory,
} from "@/lib/investment/allocation";

/** Hasil survei: jawaban risiko (wajib) + pilihan instrumen (opsional). */
export interface RiskSurveyResult {
  answers: number[];
  /** Kategori instrumen yang dipilih pengguna; kosong = sistem menentukan. */
  selectedInstruments: InstrumentCategory[];
}

interface RiskSurveyProps {
  /** Dipanggil saat kelima jawaban risiko terisi. `answers` selalu berpanjang 5. */
  onComplete: (result: RiskSurveyResult) => void;
  /** Kembali ke langkah sebelumnya (Goal). */
  onBack?: () => void;
}

/** Deskripsi singkat tiap kategori instrumen untuk pertanyaan opsional. */
const INSTRUMENT_HINTS: Record<InstrumentCategory, string> = {
  RDPU: "Pasar uang — risiko paling rendah, mudah dicairkan",
  "Deposito/SBN": "Deposito & surat utang negara — aman, imbal hasil tetap",
  Emas: "Lindung nilai inflasi — penyeimbang jangka panjang",
  "Saham/Indeks": "Potensi tinggi untuk jangka panjang, lebih fluktuatif",
  RDPT: "Reksa dana obligasi — risiko & imbal hasil menengah",
};

interface Option {
  label: string;
  /** Bobot 1..3 sesuai kontrak riskScoring (1 = konservatif, 3 = agresif). */
  weight: 1 | 2 | 3;
}

interface Question {
  id: string;
  prompt: string;
  options: Option[];
}

/**
 * Lima pertanyaan survei risiko. Kontrak dari `lib/investment/riskScoring.ts`:
 * tepat 5 pertanyaan, tiap jawaban bobot bilangan bulat 1..3, total skor 5..15.
 * Opsi selalu terurut dari paling konservatif (1) ke paling agresif (3).
 */
const QUESTIONS: Question[] = [
  {
    id: "reaction",
    prompt: "Jika nilai investasi Anda turun 20% dalam sebulan, apa yang Anda lakukan?",
    options: [
      { label: "Jual seluruhnya agar tidak rugi lebih dalam", weight: 1 },
      { label: "Tunggu dan amati perkembangannya", weight: 2 },
      { label: "Tambah pembelian karena harga sedang murah", weight: 3 },
    ],
  },
  {
    id: "priority",
    prompt: "Apa yang paling penting bagi Anda dalam berinvestasi?",
    options: [
      { label: "Modal aman, meski imbal hasil kecil", weight: 1 },
      { label: "Seimbang antara keamanan dan pertumbuhan", weight: 2 },
      { label: "Pertumbuhan maksimal, meski berisiko", weight: 3 },
    ],
  },
  {
    id: "experience",
    prompt: "Seberapa berpengalaman Anda dengan produk investasi?",
    options: [
      { label: "Baru mulai, hanya tahu tabungan/deposito", weight: 1 },
      { label: "Cukup paham reksa dana dan obligasi", weight: 2 },
      { label: "Terbiasa dengan saham dan instrumen berisiko", weight: 3 },
    ],
  },
  {
    id: "fluctuation",
    prompt: "Seberapa nyaman Anda dengan naik-turunnya nilai investasi?",
    options: [
      { label: "Tidak nyaman, ingin nilai stabil", weight: 1 },
      { label: "Bisa menerima fluktuasi wajar", weight: 2 },
      { label: "Nyaman dengan fluktuasi besar demi peluang tinggi", weight: 3 },
    ],
  },
  {
    id: "loss",
    prompt: "Berapa potensi kerugian sementara yang bisa Anda terima?",
    options: [
      { label: "Hampir tidak ada, maksimal 5%", weight: 1 },
      { label: "Sedang, sekitar 10–20%", weight: 2 },
      { label: "Besar, di atas 30% demi imbal hasil tinggi", weight: 3 },
    ],
  },
];

/**
 * RiskSurvey — langkah kedua alur Investasi (Req 3.1).
 *
 * Menyajikan 5 pertanyaan risiko finansial, masing-masing 3 opsi terpetakan ke
 * bobot 1/2/3. Mengumpulkan jawaban sebagai `number[]` berpanjang 5 lalu
 * menyerahkannya ke parent. Tidak melakukan skoring di sini — skoring dilakukan
 * server (POST /api/recommendation) sesuai kontrak deterministik.
 */
export default function RiskSurvey({ onComplete, onBack }: RiskSurveyProps) {
  // null = belum dijawab; angka = bobot terpilih.
  const [answers, setAnswers] = useState<(number | null)[]>(
    () => QUESTIONS.map(() => null),
  );
  // Pertanyaan opsional: kategori instrumen yang diminati (boleh kosong).
  const [selectedInstruments, setSelectedInstruments] = useState<InstrumentCategory[]>(
    [],
  );
  const [error, setError] = useState<string | null>(null);

  function selectOption(qIndex: number, weight: number) {
    setAnswers((prev) => {
      const next = [...prev];
      next[qIndex] = weight;
      return next;
    });
    if (error) setError(null);
  }

  function toggleInstrument(cat: InstrumentCategory) {
    setSelectedInstruments((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat],
    );
  }

  const answeredCount = answers.filter((a) => a !== null).length;
  const allAnswered = answeredCount === QUESTIONS.length;

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!allAnswered) {
      setError("Mohon jawab semua pertanyaan terlebih dahulu.");
      return;
    }
    onComplete({ answers: answers as number[], selectedInstruments });
  }

  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-col gap-5 rounded-2xl border border-border bg-surface p-5 shadow-[0_2px_20px_rgba(0,0,0,0.04)] sm:p-6"
    >
      <div className="flex items-center gap-2.5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-[var(--accent)]">
          <ShieldQuestion className="h-4.5 w-4.5" />
        </span>
        <div className="flex flex-col">
          <span className="text-sm font-medium text-foreground">Survei profil risiko</span>
          <span className="text-xs text-muted">
            {answeredCount}/{QUESTIONS.length} pertanyaan terjawab
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-background">
        <div
          className="h-full rounded-full bg-[var(--accent)] transition-all duration-300"
          style={{ width: `${(answeredCount / QUESTIONS.length) * 100}%` }}
        />
      </div>

      <fieldset className="flex flex-col gap-6">
        {QUESTIONS.map((q, qIndex) => (
          <div key={q.id} className="flex flex-col gap-2.5">
            <p className="text-[0.9375rem] font-medium leading-snug text-foreground">
              <span className="mr-1.5 text-[var(--accent)]">{qIndex + 1}.</span>
              {q.prompt}
            </p>
            <div className="flex flex-col gap-2">
              {q.options.map((opt) => {
                const selected = answers[qIndex] === opt.weight;
                return (
                  <label
                    key={opt.weight}
                    className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-2.5 text-sm transition-colors ${
                      selected
                        ? "border-[var(--accent)] bg-accent-soft text-foreground"
                        : "border-border bg-background text-muted hover:border-[var(--accent)]/40 hover:text-foreground"
                    }`}
                  >
                    <input
                      type="radio"
                      name={q.id}
                      value={opt.weight}
                      checked={selected}
                      onChange={() => selectOption(qIndex, opt.weight)}
                      className="sr-only"
                    />
                    <span
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                        selected ? "border-[var(--accent)]" : "border-border"
                      }`}
                    >
                      {selected && (
                        <span className="h-2 w-2 rounded-full bg-[var(--accent)]" />
                      )}
                    </span>
                    <span className="leading-snug">{opt.label}</span>
                  </label>
                );
              })}
            </div>
          </div>
        ))}
      </fieldset>

      {/* Pertanyaan opsional: pilihan instrumen (menentukan komposisi hasil) */}
      <fieldset className="flex flex-col gap-3 rounded-xl border border-dashed border-border bg-background/60 p-4">
        <legend className="flex items-center gap-1.5 px-1 text-sm font-medium text-foreground">
          <Sparkles className="h-4 w-4 text-[var(--accent)]" />
          Instrumen yang Anda minati{" "}
          <span className="font-normal text-muted">(opsional)</span>
        </legend>
        <p className="text-xs leading-relaxed text-muted">
          Pilih satu atau beberapa instrumen bila Anda punya preferensi — komposisi
          rekomendasi akan menyesuaikan pilihan Anda. Kosongkan bila ingin sistem yang
          menentukan secara otomatis.
        </p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {INSTRUMENT_CATEGORIES.map((cat) => {
            const checked = selectedInstruments.includes(cat);
            return (
              <label
                key={cat}
                className={`flex cursor-pointer items-start gap-2.5 rounded-xl border px-3.5 py-2.5 text-sm transition-colors ${
                  checked
                    ? "border-[var(--accent)] bg-accent-soft text-foreground"
                    : "border-border bg-surface text-muted hover:border-[var(--accent)]/40 hover:text-foreground"
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleInstrument(cat)}
                  className="sr-only"
                />
                <span
                  className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                    checked
                      ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                      : "border-border"
                  }`}
                >
                  {checked && (
                    <svg viewBox="0 0 12 12" className="h-2.5 w-2.5" fill="none">
                      <path
                        d="M2.5 6.5l2.5 2.5 4.5-5"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </span>
                <span className="flex flex-col gap-0.5 leading-snug">
                  <span className="font-medium text-foreground">{cat}</span>
                  <span className="text-xs text-muted">{INSTRUMENT_HINTS[cat]}</span>
                </span>
              </label>
            );
          })}
        </div>
        {selectedInstruments.length > 0 && (
          <button
            type="button"
            onClick={() => setSelectedInstruments([])}
            className="self-start text-xs font-medium text-[var(--accent)] hover:underline"
          >
            Kosongkan pilihan (biar sistem yang tentukan)
          </button>
        )}
      </fieldset>

      {error && (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-600"
        >
          {error}
        </p>
      )}

      <div className="flex flex-col-reverse gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="flex h-11 items-center justify-center gap-1.5 rounded-xl border border-border bg-background px-4 text-sm font-medium text-muted transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Kembali
          </button>
        )}
        <button
          type="submit"
          disabled={!allAnswered}
          className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--accent)] text-[0.9375rem] font-medium text-white transition-all duration-200 hover:brightness-110 disabled:cursor-not-allowed disabled:bg-border disabled:text-muted sm:flex-none sm:px-6"
        >
          Lihat rekomendasi
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </form>
  );
}
