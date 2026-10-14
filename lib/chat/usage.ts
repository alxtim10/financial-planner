import { prisma } from "@/lib/db";

// Rate limiting chat AI per pengguna per hari. Hitungan disimpan di DB
// (ChatUsage) agar konsisten lintas instance runtime (bukan in-memory).

/** Batas pesan chat harian per pengguna (dapat disetel via env). */
export function dailyLimit(): number {
  const raw = Number(process.env.CHAT_DAILY_LIMIT);
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 30;
}

/** Kunci hari ini sebagai "YYYY-MM-DD" (UTC) — deterministik & sederhana. */
export function todayKey(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

export interface UsageStatus {
  used: number;
  limit: number;
  remaining: number;
  allowed: boolean;
}

/**
 * Baca status kuota hari ini TANPA menaikkan hitungan. Dipakai untuk
 * memutuskan boleh/tidak sebelum memanggil Gemini.
 */
export async function getUsageStatus(userId: string): Promise<UsageStatus> {
  const limit = dailyLimit();
  const row = await prisma.chatUsage.findUnique({
    where: { userId_day: { userId, day: todayKey() } },
  });
  const used = row?.count ?? 0;
  return {
    used,
    limit,
    remaining: Math.max(0, limit - used),
    allowed: used < limit,
  };
}

/**
 * Naikkan hitungan pemakaian hari ini sebesar 1 (upsert atomik). Dipanggil
 * setelah permintaan chat diterima/diproses.
 */
export async function incrementUsage(userId: string): Promise<void> {
  const day = todayKey();
  await prisma.chatUsage.upsert({
    where: { userId_day: { userId, day } },
    create: { userId, day, count: 1 },
    update: { count: { increment: 1 } },
  });
}
