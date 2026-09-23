"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Wallet, TrendingDown, PiggyBank, Loader2, CheckCircle2, Info } from "lucide-react";
import { formatThousands, parseThousands } from "@/lib/format/rupiahInput";

/** Field yang dikelola form beserta metadata tampilannya. */
type FieldKey = "income" | "expense" | "currentSavings";

interface FieldConfig {
  key: FieldKey;
  label: string;
  hint: string;
  icon: typeof Wallet;
  /** Catatan penjelas opsional yang tampil di bawah field (mis. cakupan pengeluaran). */
  note?: string;
}

const FIELDS: FieldConfig[] = [
  {
    key: "income",
    label: "Pemasukan bulanan",
    hint: "Total penghasilan rutin per bulan.",
    icon: Wallet,
  },
  {
    key: "expense",
    label: "Pengeluaran bulanan",
    hint: "Rata-rata pengeluaran rutin per bulan.",
    icon: TrendingDown,
    note: "Sertakan juga utang/angsuran (mis. cicilan KPR, kendaraan) dan bagi rata pengeluaran yang tidak tiap bulan (mis. pajak kendaraan tahunan ÷ 12) agar estimasi lebih akurat.",
  },
  {
    key: "currentSavings",
    label: "Tabungan saat ini",
    hint: "Total dana yang sudah Anda miliki.",
    icon: PiggyBank,
  },
];

type FormValues = Record<FieldKey, string>;
type FieldErrors = Partial<Record<FieldKey, string>>;

const EMPTY_VALUES: FormValues = { income: "", expense: "", currentSavings: "" };

/**
 * Validasi satu field: wajib diisi, harus angka, dan tidak negatif (Req 1.2).
 * Nilai `value` adalah string bergrup ribuan; divalidasi via angka terparsir.
 * Mengembalikan pesan error dalam Bahasa Indonesia atau `undefined` bila valid.
 */
function validateField(value: string): string | undefined {
  if (value.trim() === "") return "Wajib diisi.";
  const n = parseThousands(value);
  if (n === null) return "Harus berupa angka.";
  if (n < 0) return "Tidak boleh negatif.";
  return undefined;
}

/**
 * ProfileForm — form onboarding Financial_Profile (income, expense, currentSavings).
 * Memvalidasi di sisi klien lalu mengirim POST /api/profile. Pada sukses (201)
 * pengguna diarahkan ke /investment; pada error, pesan dari API ditampilkan.
 */
export default function ProfileForm() {
  const router = useRouter();
  const [values, setValues] = useState<FormValues>(EMPTY_VALUES);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function updateField(key: FieldKey, value: string) {
    // Simpan nilai yang sudah bergrup ribuan agar tampil live saat mengetik.
    setValues((prev) => ({ ...prev, [key]: formatThousands(value) }));
    // Bersihkan error field ini begitu pengguna mengetik ulang.
    setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
    if (apiError) setApiError(null);
  }

  /** Jalankan validasi seluruh field; return true bila semuanya valid. */
  function validateAll(): boolean {
    const next: FieldErrors = {};
    for (const { key } of FIELDS) {
      const msg = validateField(values[key]);
      if (msg) next[key] = msg;
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setApiError(null);

    if (!validateAll()) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          income: parseThousands(values.income),
          expense: parseThousands(values.expense),
          currentSavings: parseThousands(values.currentSavings),
        }),
      });

      if (res.status === 201) {
        setSuccess(true);
        // Beri jeda singkat agar umpan balik sukses terlihat, lalu lanjut.
        router.push("/investment");
        return;
      }

      // Error dari API — tampilkan pesan { error } bila ada.
      let msg = "Gagal menyimpan profil. Coba lagi sebentar.";
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

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="flex flex-col gap-5 rounded-2xl border border-border bg-surface p-5 shadow-[0_2px_20px_rgba(0,0,0,0.04)] sm:p-6"
    >
      {FIELDS.map(({ key, label, hint, icon: Icon, note }) => {
        const error = errors[key];
        // Pratinjau kini cukup mencerminkan nilai bergrup yang sedang diketik.
        const preview = values[key] ? `Rp ${values[key]}` : null;
        const errorId = `${key}-error`;
        const hintId = `${key}-hint`;
        return (
          <div key={key} className="flex flex-col gap-1.5">
            <label
              htmlFor={key}
              className="text-sm font-medium text-foreground"
            >
              {label}
            </label>
            <div
              className={`flex items-center gap-2.5 rounded-xl border bg-background px-3 py-2.5 transition-shadow focus-within:shadow-[0_2px_16px_rgba(0,180,216,0.12)] ${
                error
                  ? "border-red-400"
                  : "border-border focus-within:border-[var(--accent)]/50"
              }`}
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-[var(--accent)]">
                <Icon className="h-4 w-4" />
              </span>
              <span className="shrink-0 text-sm text-muted">Rp</span>
              <input
                id={key}
                name={key}
                type="text"
                inputMode="numeric"
                autoComplete="off"
                value={values[key]}
                onChange={(e) => updateField(key, e.target.value)}
                placeholder="0"
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? errorId : hintId}
                className="min-w-0 flex-1 bg-transparent text-[0.9375rem] text-foreground placeholder:text-muted focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              />
            </div>
            {error ? (
              <p id={errorId} className="text-xs text-red-500">
                {error}
              </p>
            ) : (
              <p id={hintId} className="text-xs text-muted">
                {preview ? preview : hint}
              </p>
            )}
            {note && (
              <div className="mt-1 flex items-start gap-2 rounded-lg bg-accent-soft px-3 py-2">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--accent)]" />
                <p className="text-xs leading-relaxed text-muted">{note}</p>
              </div>
            )}
          </div>
        );
      })}

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
        disabled={submitting || success}
        className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[var(--accent)] text-[0.9375rem] font-medium text-white transition-all duration-200 hover:brightness-110 disabled:cursor-not-allowed disabled:bg-border disabled:text-muted"
      >
        {success ? (
          <>
            <CheckCircle2 className="h-4 w-4" />
            Profil tersimpan
          </>
        ) : submitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Menyimpan...
          </>
        ) : (
          "Simpan & lanjut ke Investasi"
        )}
      </button>
    </form>
  );
}
