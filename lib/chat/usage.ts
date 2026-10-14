import { prisma } from "@/lib/db";
import { chatDailyLimit, type Plan } from "@/lib/billing/plan";

// Rate limiting chat AI per pengguna per hari. Hitungan disimpan di DB
// (ChatUsage) agar konsisten lintas instance runtime (bukan in-memory).
// Batas bergantung pada plan pengguna (free vs pro).

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
 * memutuskan boleh/tidak sebelum memanggil Gemini. Batas sesuai `plan`.
 */
export async function getUsageStatus(userId: string, plan: Plan): Promise<UsageStatus> {
  const limit = chatDailyLimit(plan);
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
