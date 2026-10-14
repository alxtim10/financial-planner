// Entitlement free/pro — sumber kebenaran tunggal untuk gating fitur.
// Pure/isolated: hanya baca env untuk angka batas, tanpa I/O/DB.

export type Plan = "free" | "pro";

/** Normalisasi string plan dari DB ke tipe Plan (fallback "free"). */
export function normalizePlan(value: string | null | undefined): Plan {
  return value === "pro" ? "pro" : "free";
}

/** True bila plan termasuk tier Pro. */
export function isPro(plan: string | null | undefined): boolean {
  return normalizePlan(plan) === "pro";
}

/** Batas pesan chat AI harian menurut plan (dapat disetel via env). */
export function chatDailyLimit(plan: string | null | undefined): number {
  if (isPro(plan)) {
    const raw = Number(process.env.CHAT_DAILY_LIMIT_PRO);
    return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 500;
  }
  const raw = Number(process.env.CHAT_DAILY_LIMIT);
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 30;
}

/** Daftar benefit Pro untuk ditampilkan di halaman /upgrade (ramah-awam). */
export const PRO_FEATURES: readonly string[] = [
  "Chat AI dengan kuota harian jauh lebih besar",
  "Proyeksi investasi detail per instrumen (rincian setoran & pertumbuhan)",
  "Prioritas fitur lanjutan berikutnya",
];
