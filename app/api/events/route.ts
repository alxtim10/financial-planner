import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth/session";
import { isAnalyticsEvent } from "@/lib/analytics/events";
import { trackEvent } from "@/lib/analytics/track";

export const runtime = "nodejs";

interface EventBody {
  event?: unknown;
  metadata?: unknown;
}

/**
 * POST /api/events — catat satu event funnel dari klien.
 * Body: { event: <nama kanonik>, metadata?: object }.
 * - Tanpa login → 401.
 * - Nama event tidak dikenal → 400.
 * - Sukses → 204 (tanpa body). Pencatatan tak boleh memblokir UX.
 */
export async function POST(req: Request) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Silakan login terlebih dahulu." }, { status: 401 });
  }

  let body: EventBody;
  try {
    body = (await req.json()) as EventBody;
  } catch {
    return NextResponse.json({ error: "Permintaan tidak valid." }, { status: 400 });
  }

  if (!isAnalyticsEvent(body?.event)) {
    return NextResponse.json({ error: "Nama event tidak dikenal." }, { status: 400 });
  }

  const metadata =
    body.metadata && typeof body.metadata === "object" && !Array.isArray(body.metadata)
      ? (body.metadata as Record<string, unknown>)
      : undefined;

  await trackEvent(userId, body.event, metadata);

  return new NextResponse(null, { status: 204 });
}
