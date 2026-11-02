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
export async function getActiveGoal(userId: string): Promise<Goal | null> {
  return prisma.goal.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Ambil SEMUA tujuan milik pengguna (multi-tujuan), terbaru dulu.
 * Dipakai dashboard (daftar tujuan) dan wizard Investasi/Planner (pemilih
 * tujuan + "Pilih semua"). Selalu ter-scope `userId` (isolasi antar-pengguna).
 */
export async function listGoals(userId: string): Promise<Goal[]> {
  return prisma.goal.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Ambil satu tujuan milik pengguna berdasarkan `goalId`, atau `null` bila tidak
 * ada / bukan milik pengguna. Guard `userId` mencegah akses lintas-pengguna.
 */
export async function getGoalById(userId: string, goalId: string): Promise<Goal | null> {
  return prisma.goal.findFirst({
    where: { id: goalId, userId },
  });
}
