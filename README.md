# Financial Planner

Aplikasi web perencanaan keuangan personal yang terstruktur (Next.js App Router). Pengguna dibimbing dari kondisi keuangan mereka menuju rekomendasi alokasi investasi dan rencana anggaran yang konkret. Chatbot AI (Gemini) hadir sebagai fitur pelengkap berupa panel drawer di semua halaman.

> Dokumen arah produk yang otoritatif ada di [`dokumentasi.md`](./dokumentasi.md). File `PRD.md`, `DESIGN.md`, `REQUIREMENTS.md`, dan `TASKS.md` mendeskripsikan fitur chatbot dari fase PoC dan tetap valid untuk bagian itu saja.

## Fitur

- **Profil Finansial** — gate wajib: pemasukan bulanan, pengeluaran bulanan, dan tabungan saat ini. Tanpa profil ini, cakupan Investasi & Planner terkunci.
- **Tujuan Aktif (Active Goal)** — satu tujuan keuangan tersentralisasi (nama opsional + nominal target + jangka waktu **dalam bulan**), dikelola dari dashboard, dan dipakai bersama oleh Investasi & Planner. Tujuan aktif = baris `Goal` terbaru ("latest wins").
- **Cakupan Investasi** — dari tujuan + profil risiko (survei singkat) → rekomendasi alokasi berbasis aturan (matriks Horizon × Profil Risiko) + kontribusi bulanan (Future Value of Annuity). Angka bersifat deterministik, bukan hasil LLM.
- **Cakupan Planner (goal-driven)** — masukkan pemasukan + tujuan + jangka waktu → sistem menghitung berapa yang harus ditabung tiap bulan, lalu memecah kebutuhan/keinginan; persentase adalah **output**, bukan input. Ada peringatan kelayakan (feasibility) saat target terlalu berat.
- **Chatbot pelengkap** — konsultasi naratif berbasis Gemini (streaming) via drawer geser dari kanan, tersedia di semua halaman.

Investasi & Planner **memprefill** target/jangka waktu dari Tujuan Aktif; pengguna boleh menimpa nilai sebagai skenario satu kali tanpa mengubah tujuan tersimpan.

## Stack Teknologi

- **Framework:** Next.js 16 (App Router), React 19, TypeScript
- **Styling:** Tailwind CSS v4
- **Database:** Supabase (PostgreSQL ter-host) + Prisma ORM (`prisma`, `@prisma/client`)
- **AI:** `@google/genai` (streaming, runtime Node.js)
- **UI utilitas:** `lucide-react`, `react-markdown`, `remark-gfm`
- **Test runner:** Vitest (logika murni `lib/*`, sebagian dengan property-based testing via `fast-check`)

## Prasyarat

- Node.js 20+ dan npm
- Proyek Supabase (PostgreSQL ter-host) — ambil connection string dari dashboard
- API key Google Gemini ([Google AI Studio](https://aistudio.google.com/))

## Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Konfigurasi environment**

   Salin `.env.example` menjadi `.env.local`, lalu isi nilainya:
   ```bash
   cp .env.example .env.local
   ```
   - `GEMINI_API_KEY` — key dari Google AI Studio (jangan pakai prefix `NEXT_PUBLIC_`).
   - `GEMINI_MODEL` — opsional, default `gemini-flash-lite-latest` (alternatif `gemini-flash-latest`).
   - `DATABASE_URL` — koneksi Supabase **pooled** (PgBouncer, port `6543`, akhiri `?pgbouncer=true&sslmode=require&uselibpqcompat=true`); dipakai runtime aplikasi melalui driver adapter `@prisma/adapter-pg`.
   - `DIRECT_URL` — koneksi Supabase **langsung** (port `5432`); dipakai Prisma untuk migrasi.

   Ambil kedua string koneksi dari Supabase Dashboard → **Project Settings → Database → Connection string**.

3. **Siapkan database**

   Database sudah tersedia di Supabase, jadi cukup terapkan migrasi Prisma (membuat tabel):
   ```bash
   npx prisma migrate deploy
   ```
   Untuk pengembangan lokal (membuat migrasi baru saat skema berubah), gunakan `npx prisma migrate dev`.
   Prisma CLI tidak selalu memuat `.env.local` otomatis; bila perlu, sisipkan URL inline:
   ```bash
   DATABASE_URL="<pooled-url>" DIRECT_URL="<direct-url>" npx prisma migrate deploy
   ```

   > **Catatan macOS + Supabase (TLS).** Pooler Supabase hanya menerima **TLS 1.3**, sedangkan engine native Prisma di macOS memakai Apple Secure Transport yang berhenti di TLS 1.2. Karena itu **runtime** memakai driver adapter `@prisma/adapter-pg` (`pg` → OpenSSL Node, mendukung TLS 1.3); lihat `lib/db.ts`. *Schema/migration engine* Prisma tetap memakai Apple Secure Transport sehingga `prisma migrate deploy/dev` bisa gagal dengan `P1011: Error opening a TLS connection`. Bila ini terjadi, terapkan skema lewat `psql` (yang memakai OpenSSL) sebagai fallback:
   > ```bash
   > # generate SQL skema penuh (offline, tanpa koneksi DB)
   > npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script > schema.sql
   > # terapkan via psql (mendukung TLS 1.3)
   > psql "<direct-url>?sslmode=require" -f schema.sql
   > ```

## Menjalankan

```bash
npm run dev      # server pengembangan (http://localhost:3000)
npm run build    # build produksi
npm run start    # jalankan hasil build produksi
npm test         # jalankan test (vitest)
npm run lint     # lint
```

> Setelah menjalankan migrasi Prisma baru, **restart** server `npm run dev` agar Prisma Client yang diregenerasi termuat.

## Struktur Proyek

```text
app/
  api/            # route: profile, goal, recommendation, budget, chat
  investment/     # cakupan Investasi (goal > survei > rekomendasi)
  planner/        # cakupan Planner (goal-driven)
  profile/        # form profil finansial
  page.tsx        # dashboard (kartu Tujuan Aktif + navigasi)
  layout.tsx      # root layout + ChatDrawer
components/
  goal/           # ActiveGoalCard, GoalEditor
  investment/     # GoalForm, RiskSurvey, RecommendationCard, InvestmentWizard
  planner/        # BudgetForm, BudgetResultCard, PlannerWizard
  Chat*.tsx       # drawer + interface chatbot
lib/
  db.ts           # Prisma singleton
  goal.ts         # getActiveGoal()
  profileGate.ts  # getLatestProfile()
  investment/     # allocation, projection, riskScoring (pure functions)
  planner/        # goalBudget (aktif); presets/budget/savingsProjection (dipensiunkan)
  format/         # rupiahInput
prisma/           # schema + migrations
```

## Dokumentasi

| Dokumen | Isi |
|---|---|
| [`dokumentasi.md`](./dokumentasi.md) | Arah produk keseluruhan (otoritatif). |
| [`CARA-HITUNG.md`](./CARA-HITUNG.md) | Penjelasan ramah-awam untuk perhitungan (dana darurat, anggaran, trade-off, investasi). |
| [`RUMUS.md`](./RUMUS.md) | Kumpulan rumus perhitungan seluruh modul (`lib/*`) + validasi API (versi teknis). |
| `.kiro/specs/financial-planner/` | Spesifikasi formal cakupan Investasi (requirements, design, tasks). |
| `.kiro/specs/budget-planner/` | Spesifikasi formal cakupan Planner. |
| `.kiro/specs/active-goal/` | Spesifikasi formal Tujuan Aktif tersentralisasi. |
| `PRD.md`, `DESIGN.md`, `REQUIREMENTS.md`, `TASKS.md` | Fitur chatbot pelengkap (fase PoC). |

## Catatan

- Rekomendasi angka (alokasi & kontribusi) bersifat **rule-based dan deterministik**, bukan hasil LLM. Chatbot AI hanya untuk konsultasi naratif.
- Field `userId` (nullable) sudah ada di semua model sebagai placeholder autentikasi masa depan; MVP tidak memakai auth.
- Aplikasi ini bersifat edukatif dan bukan nasihat keuangan profesional.
