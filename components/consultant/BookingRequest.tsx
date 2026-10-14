"use client";

import { useState } from "react";
import { CalendarCheck, Loader2, CheckCircle2 } from "lucide-react";

interface BookingRequestProps {
  consultantId: string;
  consultantName: string;
}

/**
 * BookingRequest — tombol "Minta konsultasi" + form ringkas (lead capture).
 * POST /api/bookings menyimpan lead (ter-scope userId) dan mencatat event.
 * Pengguna boleh menyertakan ringkasan Financial Twin atas izin (checkbox).
 */
export default function BookingRequest({ consultantId, consultantName }: BookingRequestProps) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [includeSnapshot, setIncludeSnapshot] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consultantId, message: message.trim() || undefined, includeSnapshot }),
      });
      if (res.status === 201) {
        setDone(true);
        return;
      }
      let msg = "Gagal mengirim permintaan. Coba lagi sebentar.";
      try {
        const data = await res.json();
        if (data?.error) msg = data.error;
      } catch {
        /* body bukan JSON */
      }
      setError(msg);
    } catch {
      setError("Gagal terhubung ke server. Periksa koneksi Anda.");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-[var(--accent)]/30 bg-accent-soft px-3.5 py-2.5 text-sm text-[var(--accent)]">
        <CheckCircle2 className="h-4 w-4 shrink-0" />
        Permintaan konsultasi terkirim. {consultantName} akan dihubungkan.
      </div>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-[var(--accent)]/40 bg-accent-soft text-[0.9375rem] font-medium text-[var(--accent)] transition-colors hover:brightness-105"
      >
        <CalendarCheck className="h-4 w-4" />
        Minta konsultasi
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-2.5 rounded-xl border border-border bg-background p-3.5">
      <label htmlFor={`msg-${consultantId}`} className="text-sm font-medium text-foreground">
        Pesan singkat (opsional)
      </label>
      <textarea
        id={`msg-${consultantId}`}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={3}
        maxLength={1000}
        placeholder="Mis. ingin konsultasi dana darurat & rencana beli rumah."
        className="w-full resize-none rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-[var(--accent)]/50 focus:outline-none"
      />
      <label className="flex items-start gap-2 text-xs text-muted">
        <input
          type="checkbox"
          checked={includeSnapshot}
          onChange={(e) => setIncludeSnapshot(e.target.checked)}
          className="mt-0.5 accent-[var(--accent)]"
        />
        Sertakan ringkasan keuangan saya (profil & tujuan) agar konsultan lebih paham konteks.
      </label>

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="flex h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-[var(--accent)] text-sm font-medium text-white transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:bg-border disabled:text-muted"
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Mengirim...
            </>
          ) : (
            "Kirim permintaan"
          )}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          disabled={submitting}
          className="h-10 rounded-lg border border-border bg-surface px-3 text-sm text-muted transition-colors hover:text-foreground"
        >
          Batal
        </button>
      </div>
    </form>
  );
}
