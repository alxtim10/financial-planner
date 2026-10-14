import type { AnalyticsEventName } from "@/lib/analytics/events";

/**
 * Kirim event funnel dari klien ke POST /api/events. Fire-and-forget: tidak
 * menunggu/menggagalkan UX bila gagal. `keepalive` agar tetap terkirim meski
 * navigasi/berpindah tab terjadi tepat setelahnya.
 */
export function trackClientEvent(
  event: AnalyticsEventName,
  metadata?: Record<string, unknown>,
): void {
  try {
    void fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event, metadata }),
      keepalive: true,
    });
  } catch {
    /* abaikan — analitik tidak boleh mengganggu UX */
  }
}
