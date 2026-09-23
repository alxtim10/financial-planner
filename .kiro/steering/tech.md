# Teknis — Financial Planner

## Stack

- **Framework:** Next.js 16 (App Router), React 19, TypeScript
- **Styling:** Tailwind CSS v4 (token warna Miami blue: `var(--accent)` = biru `rgba(0,180,216,...)`)
- **AI:** `@google/genai` (streaming, runtime Node.js) — model default `gemini-flash-lite-latest`
- **DB:** Supabase (PostgreSQL ter-host) + Prisma ORM 6.19.3; singleton client di `lib/db.ts`
- **UI utilitas:** `lucide-react`, `react-markdown`, `remark-gfm`
- **Test:** Vitest (`npm test`). Saat ini baru ada `lib/smoke.test.ts` — belum ada suite unit/PBT. `fast-check` BUKAN dependency.

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
- **Rekomendasi = deterministik**, bukan LLM. LLM hanya untuk chatbot naratif.
- **Format Rupiah:** `Rp ${Math.round(v).toLocaleString("id-ID")}`. Input ribuan via `lib/format/rupiahInput.ts` (`formatThousands`/`parseThousands`).

## Database & migrasi (Supabase)

- Dua koneksi (pola Supabase): `DATABASE_URL` = pooled (PgBouncer, port **6543**, `?pgbouncer=true`) untuk runtime; `DIRECT_URL` = langsung (port **5432**) untuk migrasi. Datasource Prisma: `url` + `directUrl`.
- Kredensial di `.env.local` (gitignored). Prisma CLI tidak auto-load `.env.local` — sisipkan `DATABASE_URL`/`DIRECT_URL` inline bila perlu.
- **GOTCHA macOS + TLS:** `prisma migrate deploy/dev` bisa gagal `P1011: Error opening a TLS connection` karena engine migrasi Prisma di macOS memakai Apple Secure Transport (tanpa TLS 1.3), sedangkan pooler Supabase menegosiasikan TLS 1.3. Runtime app tetap jalan normal. Fallback migrasi: pakai `psql` (OpenSSL, mendukung TLS 1.3):
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
