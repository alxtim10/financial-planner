import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getCurrentUserId } from "@/lib/auth/session";
import { getLatestProfile } from "@/lib/profileGate";
import { getActiveGoal } from "@/lib/goal";
import { trackEvent } from "@/lib/analytics/track";
import { CONSULTANTS } from "@/lib/consultants";

export const runtime = "nodejs";

interface BookingBody {
  consultantId?: unknown;
  message?: unknown;
  includeSnapshot?: unknown;
}

const MAX_MESSAGE = 1000;

/**
 * POST /api/bookings — kirim permintaan konsultasi (lead) ke konsultan.
 *
 * Konsultan sendiri masih data statis (`lib/consultants.ts`); yang disimpan di
 * sini adalah LEAD-nya (`Booking`), ter-scope `userId` dari session.
 *
 * Body: { consultantId, message?, includeSnapshot? }
 * - `consultantId` wajib & harus cocok dengan daftar statis (→ 400 bila tidak).
 * - `message` opsional (dipangkas ke 1000 char).
 * - `includeSnapshot` true → sertakan ringkasan Financial Twin (profil + tujuan)
 *   ATAS IZIN pengguna. Hanya data milik pengguna sendiri yang disertakan.
 *
 * Tanpa login → 401. Sukses → 201 { id, status }.
 */
export async function POST(req: Request) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Silakan login terlebih dahulu." }, { status: 401 });
  }

  let body: BookingBody;
  try {
    body = (await req.json()) as BookingBody;
  } catch {
    return NextResponse.json({ error: "Permintaan tidak valid." }, { status: 400 });
  }

  const { consultantId, message, includeSnapshot } = body ?? {};

  if (typeof consultantId !== "string" || !CONSULTANTS.some((c) => c.id === consultantId)) {
    return NextResponse.json({ error: "Konsultan tidak dikenal." }, { status: 400 });
  }

  const trimmedMessage =
    typeof message === "string" && message.trim() !== ""
      ? message.trim().slice(0, MAX_MESSAGE)
      : null;

  // Snapshot Financial Twin opsional (atas izin). Hanya data milik pengguna.
  let snapshot: Prisma.InputJsonValue | undefined;
  if (includeSnapshot === true) {
    const [profile, goal] = await Promise.all([
      getLatestProfile(userId),
      getActiveGoal(userId),
    ]);
    snapshot = {
      profile: profile
        ? { income: profile.income, expense: profile.expense, currentSavings: profile.currentSavings }
        : null,
      goal: goal
        ? { name: goal.name, targetAmount: goal.targetAmount, horizonMonths: goal.horizonMonths }
        : null,
    };
  }

  try {
    const booking = await prisma.booking.create({
      data: {
        userId,
        consultantId,
        message: trimmedMessage,
        snapshot,
      },
    });

    await trackEvent(userId, "consultant_booking_requested", {
      consultantId,
      withSnapshot: includeSnapshot === true,
    });

    return NextResponse.json({ id: booking.id, status: booking.status }, { status: 201 });
  } catch (err) {
    console.error("[bookings] gagal menyimpan permintaan konsultasi:", err);
    return NextResponse.json(
      { error: "Maaf, gagal mengirim permintaan konsultasi. Coba lagi sebentar." },
      { status: 500 },
    );
  }
}
