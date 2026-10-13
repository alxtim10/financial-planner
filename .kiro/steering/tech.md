# Teknis — Financial Planner

## Stack

- **Framework:** Next.js 16 (App Router), React 19, TypeScript
- **Styling:** Tailwind CSS v4 (token warna Miami blue: `var(--accent)` = biru `rgba(0,180,216,...)`)
- **AI:** `@google/genai` (streaming, runtime Node.js) — model default `gemini-flash-lite-latest`. Chatbot **data-aware** (Financial Twin): `POST /api/chat` meng-inject konteks keuangan pengguna ke `systemInstruction` (lihat `lib/ai/financialContext.ts`).
- **DB:** Supabase (PostgreSQL ter-host) + Prisma ORM 6.19.3 lewat **driver adapter `@prisma/adapter-pg`** (`pg`); singleton client di `lib/db.ts`. Adapter `PrismaPg` memakai OpenSSL Node (TLS 1.3) → mengatasi gotcha TLS macOS saat runtime.
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

## Konvensi kode

- Logika bisnis = pure functions di `lib/` (tanpa I/O/UI/DB), hanya impor tipe dari `@/types/*`. API route memanggilnya.
- Semua model Prisma punya `userId String?` (placeholder auth, MVP tanpa auth).
- Error API → pesan ramah Bahasa Indonesia, tanpa detail internal. Validasi input di server (400) dan mirror di klien.
- Tulis kode & dokumen dalam **Bahasa Indonesia**.
