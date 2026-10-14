// Daftar nama event funnel kanonik. Dipakai server (pencatatan langsung di
// route) dan klien (POST /api/events) agar nama konsisten & bisa divalidasi.
//
// Funnel inti: profil → tujuan → rekomendasi → (konsultan | chat).

export const ANALYTICS_EVENTS = [
  "profile_completed", // profil finansial berhasil disimpan
  "goal_set", // Tujuan Aktif ditetapkan/diubah
  "recommendation_generated", // rekomendasi investasi dihitung
  "budget_computed", // rencana anggaran Planner dihitung
  "consultant_contact_clicked", // klik tombol "Hubungi" konsultan
  "chat_opened", // drawer chat AI dibuka
  "upgrade_clicked", // klik tombol upgrade ke Pro (uji minat)
] as const;

export type AnalyticsEventName = (typeof ANALYTICS_EVENTS)[number];

/** True bila `value` adalah nama event kanonik yang valid. */
export function isAnalyticsEvent(value: unknown): value is AnalyticsEventName {
  return typeof value === "string" && (ANALYTICS_EVENTS as readonly string[]).includes(value);
}
