import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUserId } from "@/lib/auth/session";
import { trackEvent } from "@/lib/analytics/track";

export const runtime = "nodejs";

/**
 * POST /api/billing/upgrade — STUB DEMO (tanpa pembayaran).
 *
 * Untuk demo/validasi minat: langsung menyetel `plan = "pro"` bagi pengguna
 * yang login, dan mencatat event `upgrade_clicked`. Pada produksi, langkah ini
 * HARUS digantikan oleh callback dari payment gateway (mis. Midtrans/Xendit)
 * yang terverifikasi — JANGAN naikkan plan hanya dari permintaan klien.
 */
export async function POST() {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Silakan login terlebih dahulu." }, { status: 401 });
  }

  // Catat niat upgrade (uji willingness-to-pay) sebelum mengubah plan.
  await trackEvent(userId, "upgrade_clicked");

  try {
    const user = await prisma.user.update({
      where: { id: userId },
      data: { plan: "pro" },
    });
    return NextResponse.json({ plan: user.plan }, { status: 200 });
  } catch (err) {
    console.error("[billing/upgrade] gagal menaikkan plan:", err);
    return NextResponse.json(
      { error: "Maaf, gagal memproses upgrade. Coba lagi sebentar." },
      { status: 500 },
    );
  }
}
