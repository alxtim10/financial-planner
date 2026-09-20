import { prisma } from "@/lib/db";
import type { FinancialProfile } from "@prisma/client";

/**
 * Ambil Financial_Profile terbaru (server-side) untuk kebutuhan Profile_Gate.
 *
 * Mengembalikan profil paling baru berdasarkan `createdAt`, atau `null` bila
 * belum ada profil tersimpan. Digunakan oleh `ProfileGate` untuk memutuskan
 * apakah pengguna boleh mengakses Investment_Scope atau harus diarahkan ke
 * halaman pengisian profil.
 *
 * Requirements: 1.3, 1.4
 */
export async function getLatestProfile(): Promise<FinancialProfile | null> {
  return prisma.financialProfile.findFirst({
    orderBy: { createdAt: "desc" },
  });
}
