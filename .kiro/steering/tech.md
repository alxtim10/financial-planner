# Teknis — Financial Planner

## Stack

- **Framework:** Next.js 16 (App Router), React 19, TypeScript
- **Styling:** Tailwind CSS v4 (token warna Miami blue: `var(--accent)` = biru `rgba(0,180,216,...)`)
- **AI:** `@google/genai` (streaming, runtime Node.js) — model default `gemini-flash-lite-latest`. Chatbot **data-aware** (Financial Twin): `POST /api/chat` meng-inject konteks keuangan pengguna ke `systemInstruction` (lihat `lib/ai/financialContext.ts`). **Wajib login + rate limit harian per pengguna** (`CHAT_DAILY_LIMIT`, default 30) via `lib/chat/usage.ts` + model `ChatUsage` → `429` bila habis.
- **Analitik funnel:** model `AnalyticsEvent` + `lib/analytics/*` (events kanonik, `trackEvent` server, `trackClientEvent` klien, `computeFunnel` agregasi) + `POST /api/events`. Dashboard pemilik di `/admin/analytics` (gate `isAdmin` via `ADMIN_USERNAME`; kosong = semua user login = admin saat demo).
- **Entitlement free/pro:** `User.plan` (`free`/`pro`) + `lib/billing/plan.ts` (`isPro`, `chatDailyLimit`, `PRO_FEATURES`). Pro → kuota chat `CHAT_DAILY_LIMIT_PRO` (default 500) + proyeksi `perInstrument`. Halaman `/upgrade` menampilkan tier harga ilustratif (`lib/billing/pricing.ts`, env `PRO_PRICE_MONTHLY`/`PRO_PRICE_YEARLY_PER_MONTH`); `POST /api/billing/upgrade` = STUB demo (set `pro` langsung, tanpa pembayaran — ganti payment gateway di produksi).
- **Marketplace konsultan (lead):** model `Booking` + `POST /api/bookings` (wajib login; validasi `consultantId` ke `CONSULTANTS` statis; snapshot Financial Twin opsional atas izin → hanya data user sendiri). Mencatat `consultant_booking_requested`. Konsultan tetap data statis (`lib/consultants.ts`).
- **DB:** Supabase (PostgreSQL ter-host) + Prisma ORM 6.19.3 lewat **driver adapter `@prisma/adapter-pg`** (`pg`); singleton client di `lib/db.ts`. Adapter `PrismaPg` memakai OpenSSL Node (TLS 1.3) → mengatasi gotcha TLS macOS saat runtime.
- **Auth (demo):** username + password, **tanpa dependency** (hanya Node `crypto`). Password hash **scrypt** (`lib/auth/password.ts`), session **JWT HS256** di cookie HTTP-only (`lib/auth/jwt.ts` + `lib/auth/session.ts`). Butuh env `AUTH_SECRET` (≥16 char). Akun dibuat via seed (default `demo`/`demo1234`); belum ada registrasi mandiri.
- **UI utilitas:** `lucide-react`, `react-markdown`, `remark-gfm`
- **Test:** Vitest (`npm test`). Saat ini ada `lib/smoke.test.ts`, `lib/financial/emergencyFund.test.ts`, `lib/planner/tradeoffs.test.ts` (10 test, pure unit) — belum ada PBT. `fast-check` BUKAN dependency.

## Perintah

```bash
npm run dev      # dev server (http://localhost:3000)
npm run build    # build produksi (jalankan ini untuk verifikasi setelah perubahan)
npm test         # vitest run
npm run lint     # eslint
```

## Aturan domain PENTING

- **Satuan jangka waktu = BULAN.** Field `Goal.horizonMonths` dan `BudgetPlan.savingsHorizonMonths`. API pakai `horizonMonths`; `GET /api/budget` mengembalikan `goalHorizonMonths`. JANGAN pakai `horizonYears` (sudah dimigrasi ×12 lewat `horizon_years_to_months`).
- **Ambang bucket alokasi (bulan):** `<24` → `<2`, `24..60` inklusif → `2-5`, `>60` → `>5`. Setara aturan tahun lama (`getAllocation`/`bucketHorizon` di `lib/investment/allocation.ts`).
- **Kalkulasi murni:** FV-of-annuity `n = horizonMonths` langsung (tanpa ×12), `i = annualReturn / 12`. Lihat `lib/investment/projection.ts` & `lib/planner/goalBudget.ts` (`monthsN = horizonMonths`).
- **Proyeksi detail Investasi:** `projectInvestment` (`lib/investment/projection.ts`) menurunkan `futureValue` (PV tumbuh + anuitas PMT), `totalContributed` (= PV + PMT×n), `totalGrowth` (= FV − contributed), dan `perInstrument[]` (porsi setoran bulanan via largest-remainder + return per instrumen). Return per instrumen dari `categoryReturn` (`allocation.ts`, sumber tunggal `CATEGORY_DEFAULT_RETURN`), fallback ke return portofolio gabungan. Deterministik, bukan LLM. `POST /api/recommendation` mengembalikan `projection` (field lama `riskProfile`/`composition`/`annualReturn`/`monthlyContribution` tetap ada — backward-compatible).
- **Rekomendasi = deterministik**, bukan LLM. LLM hanya untuk chatbot naratif (yang kini diberi konteks data via Financial Twin — angka tetap dihitung pure function, bukan LLM).
- **Survei risiko:** 5 pertanyaan wajib, bobot 1–3 (skor 5–15). Ambang `scoreRisk` (`lib/investment/riskScoring.ts`): `≤8` Konservatif, `9–12` Moderat, `≥13` Agresif (`CONSERVATIVE_MAX=8`, `MODERATE_MAX=12`).
- **Pilihan instrumen (opsional):** pertanyaan ke-6 survei multi-pilih dari kategori kanonik (`INSTRUMENT_CATEGORIES` di `allocation.ts`: `RDPU`, `Deposito/SBN`, `Emas`, `Saham/Indeks`, `RDPT`). Kosong → sistem menentukan alokasi penuh via matriks. Ada pilihan → `applyInstrumentPreference` memfilter komposisi matriks ke kategori terpilih, menormalisasi persentase ke 100 (largest-remainder) + recompute `annualReturn` tertimbang. Deterministik, tetap bukan LLM.
- **Dana darurat (bulan):** rasio `coverage = currentSavings / expense`. Tier: `<3` → `VULNERABLE`, `3..6` inklusif → `ADEQUATE`, `>6` → `STRONG`. Target ideal 6 bulan pengeluaran. Pure function `evaluateEmergencyFund` di `lib/financial/emergencyFund.ts`.
- **Trade-off Planner:** saat `feasibility.severity !== "ok"`, `computeTradeOffs` (`lib/planner/tradeoffs.ts`) menyusun ≤3 opsi: `EXTEND_HORIZON`, `REDUCE_TARGET`, `REDUCE_WANTS`. Hasil masuk ke `GoalBudgetResult.tradeOffs` (opsional).
- **Format Rupiah:** `Rp ${Math.round(v).toLocaleString("id-ID")}`. Input ribuan via `lib/format/rupiahInput.ts` (`formatThousands`/`parseThousands`).
- **Rate limit chat:** hitungan di DB (`ChatUsage`, unik `(userId, day)` dengan `day` = `"YYYY-MM-DD"` UTC), BUKAN in-memory. `getUsageStatus` cek sebelum panggil Gemini; `incrementUsage` (+1) HANYA setelah stream berhasil dimulai (init gagal tak memakan kuota), fire-and-forget. `CHAT_DAILY_LIMIT ≤ 0`/invalid → default 30.
- **Analitik:** nama event hanya dari daftar kanonik `ANALYTICS_EVENTS` (`lib/analytics/events.ts`); `/api/events` tolak nama non-kanonik (`400`). Pencatatan fire-and-forget (`trackEvent`/`trackClientEvent`) — JANGAN sampai menggagalkan alur bisnis/UX. Event ter-scope `userId` dari session. Agregasi dashboard = pure function `computeFunnel` (`lib/analytics/funnel.ts`), tanpa I/O; akses dibatasi `isAdmin` (`lib/auth/session.ts`).
- **Entitlement:** gating fitur HANYA lewat `lib/billing/plan.ts` (`isPro`/`chatDailyLimit`) — jangan hardcode cek `plan === "pro"` tersebar. Perubahan `plan` di DB WAJIB sisi server terverifikasi; `/api/billing/upgrade` kini stub demo, GANTI dengan callback payment gateway sebelum produksi (jangan percaya klien). Harga = `lib/billing/pricing.ts` (ilustratif, env-tunable).
- **Booking konsultan:** `consultantId` WAJIB divalidasi ke daftar statis `CONSULTANTS`. Snapshot Financial Twin hanya disertakan bila pengguna memberi izin (`includeSnapshot`), dan hanya memuat data milik pengguna sendiri (`getLatestProfile(userId)`/`getActiveGoal(userId)`).

## Database & migrasi (Supabase)

- Dua koneksi (pola Supabase): `DATABASE_URL` = pooled (PgBouncer, port **6543**, `?pgbouncer=true`) untuk runtime; `DIRECT_URL` = langsung (port **5432**) untuk migrasi. Datasource Prisma: `url` + `directUrl`.
- Kredensial di `.env.local` (gitignored). Prisma CLI tidak auto-load `.env.local` — sisipkan `DATABASE_URL`/`DIRECT_URL` inline bila perlu.
- **GOTCHA macOS + TLS:** `prisma migrate deploy/dev` bisa gagal `P1011: Error opening a TLS connection` karena engine migrasi Prisma di macOS memakai Apple Secure Transport (tanpa TLS 1.3), sedangkan pooler Supabase menegosiasikan TLS 1.3. **Runtime app TIDAK terdampak**: `lib/db.ts` kini pakai driver adapter `PrismaPg` (OpenSSL Node, TLS 1.3). Yang masih terdampak hanya CLI migrasi Prisma. Fallback migrasi: pakai `psql` (OpenSSL, mendukung TLS 1.3):
  ```bash
  npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script > schema.sql
  psql "<direct-url>?sslmode=require" -f schema.sql
  # lalu catat di _prisma_migrations bila perlu agar Prisma konsisten
  ```
- **Setelah migrasi apa pun:** regenerasi client (`npx prisma generate`) dan **restart `npm run dev`** agar client baru termuat (kalau tidak, POST bisa 500 / kolom baru tak terbaca).
- **Seed (`npm run db:seed` → `prisma/seed.ts`):** buat akun demo (`SEED_USERNAME`/`SEED_PASSWORD`, default `demo`/`demo1234`) + adopsi baris `userId = null` ke akun itu. Seed **harus pakai `PrismaPg` adapter** (seperti `lib/db.ts`), bukan `new PrismaClient()` polos — kalau tidak kena `P1011` TLS macOS. `prisma.config.ts` memuat `.env.local` & mendefinisikan perintah seed.

## Konvensi kode

- Logika bisnis = pure functions di `lib/` (tanpa I/O/UI/DB), hanya impor tipe dari `@/types/*`. API route memanggilnya.
- Model data keuangan punya `userId String?` (kolom DB tetap nullable), tetapi **runtime WAJIB mengisi `userId` dari session** (`getCurrentUserId()`), **bukan dari body**. Semua pembacaan difilter `where: { userId }` — tak ada state global antar-pengguna. `getLatestProfile(userId)`/`getActiveGoal(userId)` menerima `userId`.
- **Auth guard:** API tanpa session → `401` (pesan ramah ID); halaman server (`app/page.tsx`, `/profile`, `ProfileGate` untuk `/investment` & `/planner`) redirect ke `/login`. `userId` di body request diabaikan/dihapus.
- Error API → pesan ramah Bahasa Indonesia, tanpa detail internal. Validasi input di server (400) dan mirror di klien.
- Tulis kode & dokumen dalam **Bahasa Indonesia**.
