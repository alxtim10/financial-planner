"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Target,
  CalendarClock,
  Pencil,
  Plus,
  Trash2,
  Loader2,
} from "lucide-react";
import GoalEditor from "@/components/goal/GoalEditor";

/** Bentuk tujuan terserialisasi yang mengalir dari dashboard (tanpa createdAt). */
export interface GoalView {
  id: string;
  name: string | null;
  targetAmount: number;
  horizonMonths: number;
}

interface GoalsListCardProps {
  /** Semua tujuan milik pengguna (terbaru dulu). */
  goals: GoalView[];
}

/** Format nominal ke Rupiah id-ID (mis. 100000000 → "Rp 100.000.000"). */
function formatRupiah(value: number): string {
  return `Rp ${Math.round(value).toLocaleString("id-ID")}`;
}

/** Format jangka waktu bulan menjadi label ramah. */
function formatMonths(months: number): string {
  const m = Math.round(months);
  if (m < 12) return `${m} bulan`;
  const years = Math.floor(m / 12);
  const rem = m % 12;
  const yearPart = `${years} tahun`;
  const detail = rem === 0 ? yearPart : `${yearPart} ${rem} bulan`;
  return `${m} bulan (${detail})`;
}

/**
 * GoalsListCard — kartu daftar tujuan (multi-tujuan) di dashboard.
 *
 * Menampilkan semua tujuan pengguna. Tiap tujuan bisa diubah (GoalEditor mode
 * edit → PATCH) atau dihapus (DELETE /api/goal). Tombol "Tambah tujuan"
 * membuka GoalEditor mode tambah (POST). Setelah operasi sukses, `router.refresh()`
 * memuat ulang server component agar daftar terbaru tampil.
 *
 * Tujuan-tujuan ini dipakai bersama Investasi & Planner (pengguna memilih
 * satu/beberapa/semua di wizard masing-masing).
 */
export default function GoalsListCard({ goals }: GoalsListCardProps) {
  const router = useRouter();
  // id tujuan yang sedang diedit; "new" = form tambah; null = tidak ada.
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  function handleSaved() {
    setEditing(null);
    setAdding(false);
    router.refresh();
  }

  async function handleDelete(id: string) {
    if (deletingId) return;
    const ok = window.confirm("Hapus tujuan ini? Tindakan ini tidak bisa dibatalkan.");
    if (!ok) return;

    setDeletingId(id);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/goal?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (res.ok) {
        router.refresh();
        return;
      }
      let msg = "Gagal menghapus tujuan. Coba lagi sebentar.";
      try {
        const data = await res.json();
        if (data?.error) msg = data.error;
      } catch {
        /* body bukan JSON — pakai pesan default */
      }
      setDeleteError(msg);
    } catch {
      setDeleteError("Gagal terhubung ke server. Periksa koneksi Anda.");
    } finally {
      setDeletingId(null);
    }
  }

  const hasGoals = goals.length > 0;

  return (
    <section
      aria-label="Daftar tujuan"
      className="mb-8 rounded-2xl border border-border bg-surface p-5 shadow-[0_2px_20px_rgba(0,0,0,0.04)] sm:p-6"
    >
      <div className="flex flex-col gap-5">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-[var(--accent)]">
              <Target className="h-5 w-5" />
            </span>
            <div className="flex min-w-0 flex-col gap-1">
              <span className="text-xs font-medium text-muted">
                Tujuan keuangan
              </span>
              <h2 className="text-base font-semibold text-foreground">
                {hasGoals ? `${goals.length} tujuan` : "Belum ada tujuan"}
              </h2>
            </div>
          </div>

          {!adding && (
            <button
              type="button"
              onClick={() => {
                setAdding(true);
                setEditing(null);
              }}
              className="flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-4 text-sm font-medium text-white transition-all hover:brightness-110"
            >
              <Plus className="h-4 w-4" />
              Tambah tujuan
            </button>
          )}
        </div>

        {/* Form tambah */}
        {adding && (
          <GoalEditor onSaved={handleSaved} onCancel={() => setAdding(false)} />
        )}

        {deleteError && (
          <p
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-600"
          >
            {deleteError}
          </p>
        )}

        {/* Daftar tujuan */}
        {hasGoals ? (
          <ul className="flex flex-col gap-3">
            {goals.map((g) => {
              const isEditing = editing === g.id;
              const displayName =
                g.name && g.name.trim() !== "" ? g.name.trim() : "Tanpa nama";
              return (
                <li
                  key={g.id}
                  className="flex flex-col gap-3 rounded-xl border border-border bg-background px-4 py-3.5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 flex-col gap-1.5">
                      <span className="truncate text-sm font-semibold text-foreground">
                        {displayName}
                      </span>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
                        <span className="inline-flex items-center gap-1.5">
                          <Target className="h-3.5 w-3.5" />
                          {formatRupiah(g.targetAmount)}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <CalendarClock className="h-3.5 w-3.5" />
                          {formatMonths(g.horizonMonths)}
                        </span>
                      </div>
                    </div>

                    {!isEditing && (
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEditing(g.id);
                            setAdding(false);
                          }}
                          aria-label={`Ubah ${displayName}`}
                          title="Ubah"
                          className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted transition-colors hover:border-[var(--accent)]/50 hover:text-[var(--accent)]"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(g.id)}
                          disabled={deletingId === g.id}
                          aria-label={`Hapus ${displayName}`}
                          title="Hapus"
                          className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted transition-colors hover:border-red-300 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {deletingId === g.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    )}
                  </div>

                  {isEditing && (
                    <GoalEditor
                      goalId={g.id}
                      initialName={g.name}
                      initialTargetAmount={g.targetAmount}
                      initialHorizonMonths={g.horizonMonths}
                      onSaved={handleSaved}
                      onCancel={() => setEditing(null)}
                    />
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          !adding && (
            <p className="text-sm leading-relaxed text-muted">
              Tetapkan satu atau beberapa tujuan keuangan (mis. &ldquo;Dana
              Darurat&rdquo;, &ldquo;Beli Rumah&rdquo;). Tiap tujuan punya target
              dana dan jangka waktunya sendiri, lalu dipakai untuk perencanaan
              investasi dan anggaran — Anda bisa memilih satu, beberapa, atau
              semuanya.
            </p>
          )
        )}
      </div>
    </section>
  );
}
