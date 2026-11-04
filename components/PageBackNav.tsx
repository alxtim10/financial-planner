"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Home } from "lucide-react";

interface PageBackNavProps {
  /** Tujuan tombol "beranda" (default dashboard `/`). */
  homeHref?: string;
  /** Label tombol beranda (default "Dashboard"). */
  homeLabel?: string;
  /** Label tombol kembali ke halaman sebelumnya (default "Kembali"). */
  backLabel?: string;
  /** Href fallback bila tidak ada riwayat navigasi (default sama dengan homeHref). */
  fallbackHref?: string;
}

/**
 * Navigasi dua-tombol di bagian atas halaman:
 *   1. "Kembali" → halaman sebelumnya (`router.back()`), dengan fallback ke
 *      `fallbackHref` bila tidak ada riwayat (mis. dibuka via tautan langsung).
 *   2. "Beranda" → tautan statis ke dashboard (atau `homeHref`).
 *
 * Client component karena `router.back()` butuh navigasi sisi klien.
 */
export default function PageBackNav({
  homeHref = "/",
  homeLabel = "Dashboard",
  backLabel = "Kembali",
  fallbackHref,
}: PageBackNavProps) {
  const router = useRouter();

  function handleBack() {
    // Bila ada riwayat dalam sesi tab ini, mundur satu langkah; jika tidak,
    // arahkan ke fallback (atau beranda) agar tidak keluar dari aplikasi.
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push(fallbackHref ?? homeHref);
    }
  }

  return (
    <div className="mb-6 flex items-center gap-2">
      <button
        type="button"
        onClick={handleBack}
        className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-muted transition-colors hover:text-foreground hover:border-[var(--accent)]/50"
      >
        <ArrowLeft className="h-4 w-4" />
        {backLabel}
      </button>
      <Link
        href={homeHref}
        className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-muted transition-colors hover:text-foreground hover:border-[var(--accent)]/50"
      >
        <Home className="h-4 w-4" />
        {homeLabel}
      </Link>
    </div>
  );
}
