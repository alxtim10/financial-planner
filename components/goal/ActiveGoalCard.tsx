"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Target, CalendarClock, Pencil, Plus } from "lucide-react";
import GoalEditor from "@/components/goal/GoalEditor";

/** Bentuk Active_Goal terserialisasi (tanpa `createdAt`) yang mengalir dari dashboard. */
interface ActiveGoalView {
  id: string;
  name: string | null;
  targetAmount: number;
  horizonMonths: number;
}

interface ActiveGoalCardProps {
  /** Tujuan Aktif terbaru, atau `null` bila belum ada. */
  activeGoal: ActiveGoalView | null;
}

/** Format nominal ke Rupiah id-ID (mis. 100000000 → "Rp 100.000.000"). */
function formatRupiah(value: number): string {
  return `Rp ${Math.round(value).toLocaleString("id-ID")}`;
}

/**
 * Format jangka waktu bulan menjadi label ramah, mis.:
 * 60 → "60 bulan (5 tahun)", 18 → "18 bulan (1 tahun 6 bulan)", 8 → "8 bulan".
 */
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
 * ActiveGoalCard — kartu Tujuan Aktif di dashboard (Req 4).
 *
 * Bila `activeGoal` ada: menampilkan nama (fallback "Tujuan" saat null/kosong),
 * target dana (Rupiah), dan jangka waktu (mis. "60 bulan"), plus tombol
 * "Ubah tujuan" yang membuka `GoalEditor` inline terprefill dari tujuan saat ini.
 * Bila `activeGoal` null: menampilkan CTA "Tetapkan tujuan" yang membuka
 * `GoalEditor` dalam mode set-baru (tanpa nilai awal).
 *
 * Setelah `GoalEditor` sukses menyimpan, `onSaved` menutup editor dan memanggil
 * `router.refresh()` agar server component memuat ulang `getActiveGoal()` dan
 * menampilkan nilai terbaru (Req 5.5). Token Miami blue, responsif (Req 10.2–10.4).
 */
export default function ActiveGoalCard({ activeGoal }: ActiveGoalCardProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);

  const displayName =
    activeGoal?.name && activeGoal.name.trim() !== ""
      ? activeGoal.name.trim()
      : "Tujuan";

  function handleSaved() {
    setEditing(false);
    router.refresh();
  }

  function handleCancel() {
    setEditing(false);
  }

  return (
    <section
      aria-label="Tujuan aktif"
      className="mb-8 rounded-2xl border border-border bg-surface p-5 shadow-[0_2px_20px_rgba(0,0,0,0.04)] sm:p-6"
    >
      {activeGoal ? (
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-[var(--accent)]">
                <Target className="h-5 w-5" />
              </span>
              <div className="flex min-w-0 flex-col gap-1">
                <span className="text-xs font-medium text-muted">
                  Tujuan aktif
                </span>
                <h2 className="truncate text-base font-semibold text-foreground">
                  {displayName}
                </h2>
              </div>
            </div>

            {!editing && (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 text-sm font-medium text-foreground transition-colors hover:bg-surface-hover"
              >
                <Pencil className="h-4 w-4" />
                Ubah tujuan
              </button>
            )}
          </div>

          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex items-center gap-3 rounded-xl border border-border bg-background px-3.5 py-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-[var(--accent)]">
                <Target className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <dt className="text-xs text-muted">Target dana</dt>
                <dd className="truncate text-sm font-medium text-foreground">
                  {formatRupiah(activeGoal.targetAmount)}
                </dd>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-xl border border-border bg-background px-3.5 py-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-[var(--accent)]">
                <CalendarClock className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <dt className="text-xs text-muted">Jangka waktu</dt>
                <dd className="truncate text-sm font-medium text-foreground">
                  {formatMonths(activeGoal.horizonMonths)}
                </dd>
              </div>
            </div>
          </dl>

          {editing && (
            <GoalEditor
              initialName={activeGoal.name}
              initialTargetAmount={activeGoal.targetAmount}
              initialHorizonMonths={activeGoal.horizonMonths}
              onSaved={handleSaved}
              onCancel={handleCancel}
            />
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-[var(--accent)]">
              <Target className="h-5 w-5" />
            </span>
            <div className="flex flex-col gap-1">
              <h2 className="text-base font-semibold text-foreground">
                Belum ada tujuan aktif
              </h2>
              <p className="text-sm leading-relaxed text-muted">
                Tetapkan satu tujuan keuangan (target dana dan jangka waktu).
                Tujuan ini otomatis dipakai untuk perencanaan investasi dan
                anggaran Anda.
              </p>
            </div>
          </div>

          {editing ? (
            <GoalEditor onSaved={handleSaved} onCancel={handleCancel} />
          ) : (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="flex h-11 w-fit items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-5 text-[0.9375rem] font-medium text-white transition-all duration-200 hover:brightness-110"
            >
              <Plus className="h-4 w-4" />
              Tetapkan tujuan
            </button>
          )}
        </div>
      )}
    </section>
  );
}
