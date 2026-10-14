"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles, CheckCircle2 } from "lucide-react";

/**
 * UpgradeButton — tombol upgrade ke Pro (demo).
 * POST /api/billing/upgrade (yang juga mencatat event `upgrade_clicked`),
 * lalu refresh agar status plan terbaru terbaca. Tanpa gateway pembayaran.
 */
export default function UpgradeButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onUpgrade() {
    if (loading || done) return;
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/billing/upgrade", { method: "POST" });
      if (res.ok) {
        setDone(true);
        router.refresh();
        return;
      }
      let msg = "Gagal memproses upgrade. Coba lagi sebentar.";
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
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={onUpgrade}
        disabled={loading || done}
        className="flex h-12 items-center justify-center gap-2 rounded-xl bg-[var(--accent)] text-[0.9375rem] font-medium text-white transition-all duration-200 hover:brightness-110 disabled:cursor-not-allowed disabled:bg-border disabled:text-muted"
      >
        {done ? (
          <>
            <CheckCircle2 className="h-4 w-4" />
            Kamu sekarang Pro
          </>
        ) : loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Memproses...
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4" />
            Upgrade ke Pro
          </>
        )}
      </button>
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
      <p className="text-center text-xs text-muted">
        Demo: upgrade langsung aktif tanpa pembayaran.
      </p>
    </div>
  );
}
