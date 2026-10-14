import { ANALYTICS_EVENTS, type AnalyticsEventName } from "@/lib/analytics/events";

// Agregasi funnel — pure function (tanpa I/O/UI/DB). Menerima baris event
// minimal (userId + event) dan menghitung metrik untuk dashboard pemilik.

/** Baris event minimal yang dibutuhkan agregasi. */
export interface FunnelEventRow {
  userId: string;
  event: string;
}

/** Satu tahap funnel: jumlah pengguna unik + konversi dari tahap sebelumnya. */
export interface FunnelStage {
  event: AnalyticsEventName;
  label: string;
  uniqueUsers: number;
  /** Rasio pengguna unik tahap ini ÷ tahap sebelumnya (0..1). null untuk tahap pertama. */
  conversionFromPrev: number | null;
}

export interface FunnelReport {
  /** Tahap funnel utama, berurutan. */
  stages: FunnelStage[];
  /** Jumlah pengguna unik yang memicu event "niat" (di luar funnel linear). */
  intent: {
    budgetComputedUsers: number;
    consultantClickedUsers: number;
    consultantBookingUsers: number;
    chatOpenedUsers: number;
    upgradeClickedUsers: number;
  };
  /** Total kejadian (bukan unik) per nama event. */
  totalsByEvent: Record<AnalyticsEventName, number>;
  /** Total pengguna unik yang punya minimal satu event apa pun. */
  totalUsers: number;
}

/** Label ramah untuk tiap tahap funnel. */
const STAGE_LABELS: Record<AnalyticsEventName, string> = {
  profile_completed: "Profil selesai",
  goal_set: "Tujuan ditetapkan",
  recommendation_generated: "Rekomendasi dibuat",
  budget_computed: "Anggaran dihitung",
  consultant_contact_clicked: "Klik kontak konsultan",
  consultant_booking_requested: "Minta konsultasi (lead)",
  chat_opened: "Chat dibuka",
  upgrade_clicked: "Klik upgrade Pro",
};

/** Urutan tahap funnel linear inti. */
const CORE_FUNNEL: AnalyticsEventName[] = [
  "profile_completed",
  "goal_set",
  "recommendation_generated",
];

/**
 * Hitung metrik funnel dari daftar baris event.
 *
 * - `uniqueUsers` per event = jumlah `userId` berbeda yang pernah memicunya.
 * - `conversionFromPrev` = uniqueUsers tahap ini ÷ tahap sebelumnya (0 bila
 *   pembagi 0; `null` untuk tahap pertama).
 * - `totalsByEvent` = jumlah kejadian mentah per event.
 */
export function computeFunnel(rows: readonly FunnelEventRow[]): FunnelReport {
  // Kumpulkan set userId unik per event + total kejadian per event.
  const usersByEvent = new Map<string, Set<string>>();
  const totalsByEvent = {} as Record<AnalyticsEventName, number>;
  for (const name of ANALYTICS_EVENTS) totalsByEvent[name] = 0;

  const allUsers = new Set<string>();

  for (const row of rows) {
    if (!row || typeof row.userId !== "string" || typeof row.event !== "string") continue;
    allUsers.add(row.userId);

    if ((ANALYTICS_EVENTS as readonly string[]).includes(row.event)) {
      totalsByEvent[row.event as AnalyticsEventName] += 1;
    }

    let set = usersByEvent.get(row.event);
    if (!set) {
      set = new Set<string>();
      usersByEvent.set(row.event, set);
    }
    set.add(row.userId);
  }

  const uniqueOf = (event: AnalyticsEventName): number =>
    usersByEvent.get(event)?.size ?? 0;

  const stages: FunnelStage[] = CORE_FUNNEL.map((event, i) => {
    const uniqueUsers = uniqueOf(event);
    let conversionFromPrev: number | null = null;
    if (i > 0) {
      const prev = uniqueOf(CORE_FUNNEL[i - 1]);
      conversionFromPrev = prev > 0 ? uniqueUsers / prev : 0;
    }
    return { event, label: STAGE_LABELS[event], uniqueUsers, conversionFromPrev };
  });

  return {
    stages,
    intent: {
      budgetComputedUsers: uniqueOf("budget_computed"),
      consultantClickedUsers: uniqueOf("consultant_contact_clicked"),
      consultantBookingUsers: uniqueOf("consultant_booking_requested"),
      chatOpenedUsers: uniqueOf("chat_opened"),
      upgradeClickedUsers: uniqueOf("upgrade_clicked"),
    },
    totalsByEvent,
    totalUsers: allUsers.size,
  };
}

/** Format rasio 0..1 menjadi persen ramah tampilan (mis. 0.5 → "50%"). */
export function formatPercent(ratio: number | null): string {
  if (ratio === null) return "—";
  return `${Math.round(ratio * 100)}%`;
}
