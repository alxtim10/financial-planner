import { prisma } from "@/lib/db";
import type { Goal } from "@prisma/client";

/**
 * Ambil Active_Goal (server-side): baris Goal terbaru berdasarkan `createdAt`
 * desc, atau `null` bila belum ada tujuan tersimpan.
 *
 * Sumber tunggal "latest wins" untuk dashboard (mengikuti pola
 * `getLatestProfile()`). Dipakai dashboard untuk menampilkan tujuan aktif dan
 * oleh `GET /api/budget` untuk memprefill cakupan Planner.
 *
 * Requirements: 3.2, 3.3
 */
export async function getActiveGoal(): Promise<Goal | null> {
  return prisma.goal.findFirst({
    orderBy: { createdAt: "desc" },
  });
}
