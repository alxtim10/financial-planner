# Struktur — Financial Planner

## Layout

```text
app/
  api/
    profile/route.ts         # POST/GET Financial_Profile
    goal/route.ts            # POST/GET Goal (Tujuan Aktif); horizonMonths
    recommendation/route.ts  # POST rekomendasi investasi (rule-based) + selectedInstruments opsional
    budget/route.ts          # GET konteks Planner + prefill goal; POST hitung+simpan (+ trade-offs bila tak layak)
    chat/route.ts            # streaming Gemini + inject Financial Twin (getFinancialTwinContext)
  page.tsx                   # dashboard (server): profil + ActiveGoalCard + CTA + nav
  profile/page.tsx           # form profil
  investment/page.tsx        # wizard Investasi
  planner/page.tsx           # wizard Planner
  consultants/page.tsx       # daftar konsultan keuangan (view-only, statis)
  layout.tsx                 # root layout + ChatDrawer (semua halaman)
components/
  goal/        ActiveGoalCard.tsx, GoalEditor.tsx
  investment/  GoalForm.tsx, RiskSurvey.tsx, RecommendationCard.tsx, InvestmentWizard.tsx
  planner/     BudgetForm.tsx, BudgetResultCard.tsx, PlannerWizard.tsx, TradeOffCards.tsx, PresetPicker.tsx(pensiun)
  profile/     ProfileForm.tsx, ProfileGate.tsx, EmergencyFundCard.tsx
  consultant/  ConsultantCard.tsx
  Chat*.tsx    ChatDrawer, ChatInterface, MessageBubble
lib/
  db.ts                # Prisma singleton (driver adapter PrismaPg/pg)
  goal.ts              # getActiveGoal() — baris Goal terbaru
  profileGate.ts       # getLatestProfile()
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
- **Endpoint** → `app/api/<name>/route.ts`, `export const runtime = "nodejs"`, validasi input → 400, error DB → 500 (pesan ramah ID).
- **Komponen UI** → `components/<scope>/`; client component untuk form/interaktif; token Miami blue.
- **Model data** → `prisma/schema.prisma`; migrasi lewat folder `prisma/migrations/` (di macOS terapkan via `psql`, lihat tech.md).

## Alur data inti

- Dashboard (`app/page.tsx`, server) baca `getLatestProfile()` + `getActiveGoal()` → render + `EmergencyFundCard` (evaluasi dana darurat dari profil).
- Investasi: `InvestmentWizard` fetch `GET /api/goal` (prefill) → `GoalForm` → `RiskSurvey` (5 pertanyaan risiko + 1 pertanyaan instrumen opsional) → `POST /api/recommendation` (`getAllocation` → `applyInstrumentPreference` → `calculateMonthlyContribution`) → `RecommendationCard`. Pilihan instrumen kosong = sistem menentukan; ada pilihan = komposisi difilter+dinormalisasi ke instrumen terpilih.
- Planner: `PlannerWizard` fetch `GET /api/budget` (prefill dari Tujuan Aktif) → `BudgetForm` → `POST /api/budget` (`computeGoalBudget`) → `BudgetResultCard`. Bila `feasibility.severity !== "ok"`, API ikut mengisi `tradeOffs` (`computeTradeOffs`) → `TradeOffCards` (terapkan satu klik, override form).
- Chat: `ChatInterface` → `POST /api/chat` → `getFinancialTwinContext()` merangkai data pengguna terkini (profil, goal, risiko, rekomendasi, budget, dana darurat) ke `systemInstruction` Gemini.
- Goal dibuat **hanya** dari dashboard (`GoalEditor` → `POST /api/goal`). Investasi/Planner hanya prefill + override satu kali (tidak buat Goal baru).

## Modul pensiun (jangan dipakai untuk fitur goal-driven)

`lib/planner/presets.ts`, `lib/planner/budget.ts`, `lib/planner/savingsProjection.ts`, `components/planner/PresetPicker.tsx` — dipertahankan di repo tapi tidak dipakai alur aktif. Kolom `BudgetPlan.manualSavingsTarget`/`includeSavings`/`investmentContribution` juga deprecated.
