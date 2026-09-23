# Struktur — Financial Planner

## Layout

```text
app/
  api/
    profile/route.ts         # POST/GET Financial_Profile
    goal/route.ts            # POST/GET Goal (Tujuan Aktif); horizonMonths
    recommendation/route.ts  # POST rekomendasi investasi (rule-based)
    budget/route.ts          # GET konteks Planner + prefill goal; POST hitung+simpan
    chat/route.ts            # proxy streaming Gemini (PoC, tak berubah)
  page.tsx                   # dashboard (server): profil + ActiveGoalCard + CTA + nav
  profile/page.tsx           # form profil
  investment/page.tsx        # wizard Investasi
  planner/page.tsx           # wizard Planner
  layout.tsx                 # root layout + ChatDrawer (semua halaman)
components/
  goal/        ActiveGoalCard.tsx, GoalEditor.tsx
  investment/  GoalForm.tsx, RiskSurvey.tsx, RecommendationCard.tsx, InvestmentWizard.tsx
  planner/     BudgetForm.tsx, BudgetResultCard.tsx, PlannerWizard.tsx, PresetPicker.tsx(pensiun)
  profile/     ProfileForm.tsx, ProfileGate.tsx
  Chat*.tsx    ChatDrawer, ChatInterface, MessageBubble
lib/
  db.ts                # Prisma singleton
  goal.ts              # getActiveGoal() — baris Goal terbaru
  profileGate.ts       # getLatestProfile()
  prompt.ts            # system prompt chatbot
  investment/          allocation.ts, projection.ts, riskScoring.ts  (pure)
  planner/             goalBudget.ts (AKTIF) ; presets.ts/budget.ts/savingsProjection.ts (PENSIUN)
  format/rupiahInput.ts
types/                 finance.ts, planner.ts, chat.ts
prisma/                schema.prisma + migrations/
```

## Aturan penempatan

- **Logika bisnis baru** → pure function di `lib/<scope>/`, uji-able tanpa DB/UI, hanya impor tipe dari `@/types/*`.
- **Endpoint** → `app/api/<name>/route.ts`, `export const runtime = "nodejs"`, validasi input → 400, error DB → 500 (pesan ramah ID).
- **Komponen UI** → `components/<scope>/`; client component untuk form/interaktif; token Miami blue.
- **Model data** → `prisma/schema.prisma`; migrasi lewat folder `prisma/migrations/` (di macOS terapkan via `psql`, lihat tech.md).

## Alur data inti

- Dashboard (`app/page.tsx`, server) baca `getLatestProfile()` + `getActiveGoal()` → render.
- Investasi: `InvestmentWizard` fetch `GET /api/goal` (prefill) → `GoalForm` → `RiskSurvey` → `POST /api/recommendation` (`getAllocation` + `calculateMonthlyContribution`) → `RecommendationCard`.
- Planner: `PlannerWizard` fetch `GET /api/budget` (prefill dari Tujuan Aktif) → `BudgetForm` → `POST /api/budget` (`computeGoalBudget`) → `BudgetResultCard`.
- Goal dibuat **hanya** dari dashboard (`GoalEditor` → `POST /api/goal`). Investasi/Planner hanya prefill + override satu kali (tidak buat Goal baru).

## Modul pensiun (jangan dipakai untuk fitur goal-driven)

`lib/planner/presets.ts`, `lib/planner/budget.ts`, `lib/planner/savingsProjection.ts`, `components/planner/PresetPicker.tsx` — dipertahankan di repo tapi tidak dipakai alur aktif. Kolom `BudgetPlan.manualSavingsTarget`/`includeSavings`/`investmentContribution` juga deprecated.
