import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import type { AnalyticsEventName } from "@/lib/analytics/events";

/**
 * Catat satu event analitik untuk `userId`. Fire-and-forget: kegagalan
 * pencatatan TIDAK boleh menggagalkan alur bisnis utama (hanya di-log).
 */
export async function trackEvent(
  userId: string,
  event: AnalyticsEventName,
  metadata?: Record<string, unknown>,
): Promise<void> {
  try {
    await prisma.analyticsEvent.create({
      data: {
        userId,
        event,
        metadata: metadata ? (metadata as Prisma.InputJsonValue) : undefined,
      },
    });
  } catch (err) {
    console.error(`[analytics] gagal mencatat event "${event}":`, err);
  }
}
