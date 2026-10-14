# Struktur — Financial Planner

## Layout

```text
app/
  api/
    auth/login/route.ts      # POST login (set cookie JWT); logout/route.ts POST (hapus cookie)
    profile/route.ts         # POST/GET Financial_Profile (userId dari session)
    goal/route.ts            # POST/GET Goal (Tujuan Aktif); horizonMonths (userId dari session)
    recommendation/route.ts  # POST rekomendasi investasi (rule-based) + selectedInstruments opsional
    budget/route.ts          # GET konteks Planner + prefill goal; POST hitung+simpan (+ trade-offs bila tak layak)
    chat/route.ts            # streaming Gemini + Financial Twin; wajib login + rate limit harian (ChatUsage)
    events/route.ts          # POST event funnel dari klien (401/400/204); userId dari session
    billing/upgrade/route.ts # POST STUB demo upgrade ke Pro (tanpa pembayaran; set plan=pro)
    bookings/route.ts        # POST lead konsultasi (wajib login; validasi consultantId; snapshot opsional)
  login/page.tsx             # halaman login (auth demo); redirect ke / bila sudah login
  upgrade/page.tsx           # halaman upgrade Pro (benefit + UpgradeButton); redirect /login bila belum login
  admin/analytics/page.tsx   # dashboard funnel (pemilik); gate getCurrentUserId + isAdmin
  page.tsx                   # dashboard (server): profil + ActiveGoalCard + CTA + nav + logout; redirect /login bila belum login
  profile/page.tsx           # form profil
  investment/page.tsx        # wizard Investasi
  planner/page.tsx           # wizard Planner
  consultants/page.tsx       # daftar konsultan keuangan (view-only, statis)
  layout.tsx                 # root layout + ChatDrawer (semua halaman)
components/
  auth/        LoginForm.tsx, LogoutButton.tsx
  billing/     UpgradeButton.tsx, PricingCards.tsx
  goal/        ActiveGoalCard.tsx, GoalEditor.tsx
  investment/  GoalForm.tsx, RiskSurvey.tsx, RecommendationCard.tsx, InvestmentWizard.tsx
  planner/     BudgetForm.tsx, BudgetResultCard.tsx, PlannerWizard.tsx, TradeOffCards.tsx, PresetPicker.tsx(pensiun)
  profile/     ProfileForm.tsx, ProfileGate.tsx, EmergencyFundCard.tsx
  consultant/  ConsultantCard.tsx, ContactButton.tsx, BookingRequest.tsx
  Chat*.tsx    ChatDrawer, ChatInterface, MessageBubble
lib/
  db.ts                # Prisma singleton (driver adapter PrismaPg/pg)
  auth/                password.ts (scrypt), jwt.ts (HS256), session.ts (cookie: getCurrentUserId/requireUserId/set/clear)
  analytics/           events.ts (nama kanonik + isAnalyticsEvent), track.ts (server trackEvent), client.ts (klien trackClientEvent), funnel.ts (computeFunnel agregasi, pure)
  billing/             plan.ts (entitlement free/pro: isPro/normalizePlan/chatDailyLimit/PRO_FEATURES), pricing.ts (tier harga uji minat)
  chat/                usage.ts (rate limit harian per plan: getUsageStatus(userId,plan)/incrementUsage)
  goal.ts              # getActiveGoal(userId) — baris Goal terbaru milik user
  profileGate.ts       # getLatestProfile(userId)
  consultants.ts       # data statis konsultan + buildContactHref/contactLabel (pure)
  prompt.ts            # system prompt chatbot
  ai/                  financialContext.ts — getFinancialTwinContext() (konteks chat data-aware)
  financial/           emergencyFund.ts (pure) + emergencyFund.test.ts
  investment/          allocation.ts (+ applyInstrumentPreference, pure+test), projection.ts, riskScoring.ts  (pure)
  planner/             goalBudget.ts + tradeoffs.ts (AKTIF, pure) ; presets.ts/budget.ts/savingsProjection.ts (PENSIUN)
  format/rupiahInput.ts
types/                 finance.ts, planner.ts, chat.ts, usp.ts (dana darurat + trade-off + Financial Twin), consultant.ts
prisma/                schema.prisma + migrations/
```

## Aturan penempatan

- **Logika bisnis baru** → pure function di `lib/<scope>/`, uji-able tanpa DB/UI, hanya impor tipe dari `@/types/*`.
- **Endpoint** → `app/api/<name>/route.ts`, `export const runtime = "nodejs"`, validasi input → 400, error DB → 500 (pesan ramah ID). Endpoint data wajib ambil `userId` via `getCurrentUserId()` (401 bila null); JANGAN percaya `userId` dari body.
- **Komponen UI** → `components/<scope>/`; client component untuk form/interaktif; token Miami blue.
- **Model data** → `prisma/schema.prisma`; migrasi lewat folder `prisma/migrations/` (di macOS terapkan via `psql`, lihat tech.md).
- **Auth** → helper di `lib/auth/*` (jangan duplikasi hashing/JWT di tempat lain); halaman/route yang butuh identitas pakai `getCurrentUserId()`/`requireUserId()`.
- **Analitik** → event baru WAJIB didaftarkan di `lib/analytics/events.ts` (nama kanonik) dulu; server pakai `trackEvent`, klien pakai `trackClientEvent` → `POST /api/events`. Semua pencatatan fire-and-forget. Agregasi/metrik dashboard = pure function di `lib/analytics/funnel.ts`.
- **Halaman admin** → di bawah `app/admin/*`, gate `getCurrentUserId()` (→ `/login`) + `isAdmin(username)` (→ `/`). Bukan fitur end-user.
- **Rate limit chat** → logika di `lib/chat/usage.ts` (DB-backed `ChatUsage`); jangan simpan kuota in-memory.
- **Entitlement** → gating fitur lewat `lib/billing/plan.ts` (`isPro`/`chatDailyLimit`), jangan sebar cek `plan` manual. Perubahan plan hanya sisi server; `/api/billing/upgrade` masih stub demo (ganti payment gateway di produksi). Harga di `lib/billing/pricing.ts`.
- **Booking konsultan** → lead disimpan via `POST /api/bookings` (model `Booking`), `consultantId` divalidasi ke `CONSULTANTS`; snapshot hanya atas izin + data user sendiri. Konsultan tetap statis di `lib/consultants.ts`.

## Alur data inti

- **Login (gate auth):** tanpa session, halaman server redirect ke `/login` dan API data balas `401`. `userId` selalu dari cookie session (`getCurrentUserId()`), tidak pernah dari body.
- Dashboard (`app/page.tsx`, server) redirect `/login` bila belum login, lalu baca `getLatestProfile(userId)` + `getActiveGoal(userId)` → render + `EmergencyFundCard` (evaluasi dana darurat dari profil) + `LogoutButton`.
- Investasi: `InvestmentWizard` fetch `GET /api/goal` (prefill) → `GoalForm` → `RiskSurvey` (5 pertanyaan risiko + 1 pertanyaan instrumen opsional) → `POST /api/recommendation` (`getAllocation` → `applyInstrumentPreference` → `calculateMonthlyContribution`) → `RecommendationCard`. Pilihan instrumen kosong = sistem menentukan; ada pilihan = komposisi difilter+dinormalisasi ke instrumen terpilih.
- Planner: `PlannerWizard` fetch `GET /api/budget` (prefill dari Tujuan Aktif) → `BudgetForm` → `POST /api/budget` (`computeGoalBudget`) → `BudgetResultCard`. Bila `feasibility.severity !== "ok"`, API ikut mengisi `tradeOffs` (`computeTradeOffs`) → `TradeOffCards` (terapkan satu klik, override form).
- Chat: `ChatInterface` → `POST /api/chat` (wajib login; cek kuota `ChatUsage` → `429` bila habis) → `getFinancialTwinContext()` merangkai data pengguna terkini (profil, goal, risiko, rekomendasi, budget, dana darurat) ke `systemInstruction` Gemini; `incrementUsage` setelah stream mulai.
- Analitik: event funnel dicatat di route data (server: `profile_completed`/`goal_set`/`recommendation_generated`/`budget_computed`/`consultant_booking_requested`) dan dari klien via `POST /api/events` (`consultant_contact_clicked`, `chat_opened`, `upgrade_clicked`).
- Konsultan: `/consultants` (statis) → tiap `ConsultantCard` punya `BookingRequest` (`POST /api/bookings` → lead `Booking` + event) + `ContactButton` (kanal eksternal). Upgrade: `/upgrade` (`PricingCards` + `UpgradeButton` → `POST /api/billing/upgrade`).
- Goal dibuat **hanya** dari dashboard (`GoalEditor` → `POST /api/goal`). Investasi/Planner hanya prefill + override satu kali (tidak buat Goal baru).

## Modul pensiun (jangan dipakai untuk fitur goal-driven)

`lib/planner/presets.ts`, `lib/planner/budget.ts`, `lib/planner/savingsProjection.ts`, `components/planner/PresetPicker.tsx` — dipertahankan di repo tapi tidak dipakai alur aktif. Kolom `BudgetPlan.manualSavingsTarget`/`includeSavings`/`investmentContribution` juga deprecated.
