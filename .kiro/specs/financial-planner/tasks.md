# Implementation Plan: Financial Planner (Investment Scope MVP)

## Overview

Rencana implementasi mengubah aplikasi dari PoC chatbot menjadi perencana keuangan terstruktur (cakupan Investasi) dengan chatbot sebagai fitur pelengkap berbentuk drawer. Setiap task membangun di atas task sebelumnya dan diakhiri dengan mengintegrasikan kode ke alur yang sudah ada, tanpa kode menggantung. Bahasa implementasi: **TypeScript** (mengikuti stack Next.js yang ada). Logika investasi murni ditulis dengan pendekatan TDD. Sub-task bertanda `*` bersifat opsional (test) dan boleh dilewati untuk MVP cepat.

## Tasks

- [x] 1. Finalisasi dokumentasi arah produk baru
  - Tulis `dokumentasi.md` di root sebagai dokumen otoritatif (overview produk, arsitektur + mermaid, model data, matriks alokasi, rumus FV annuity + contoh, detail Investment MVP, roadmap Planner & integrasi chatbot, asumsi `DATABASE_URL`).
  - Tambahkan catatan pengarah di puncak `PRD.md`, `DESIGN.md`, `REQUIREMENTS.md`, `TASKS.md` yang menjelaskan dokumen tersebut mendeskripsikan fitur chatbot pelengkap dan menunjuk ke `dokumentasi.md`.
  - _Requirements: 9.3_

- [x] 2. Setup Prisma + PostgreSQL lokal + Vitest
  - Buat database `financial_planner` lewat `createdb financial_planner` atau `psql`; set `DATABASE_URL="postgresql://alxtim@localhost:5432/financial_planner"` di `.env.local` dan `.env.example`. Jika `createdb` gagal karena izin/koneksi, laporkan ke pengguna dan tanyakan alih-alih memaksa.
  - Install `prisma`, `@prisma/client`, dan devDependency `vitest` (+ konfigurasi `vitest.config.ts` dan script `test`).
  - Buat `prisma/schema.prisma` dengan model `FinancialProfile`, `Goal`, `RiskAssessment`, `InvestmentRecommendation` (masing-masing dengan field `userId` nullable).
  - Buat `lib/db.ts` sebagai Prisma Client singleton (aman terhadap hot reload dev).
  - Jalankan migrasi awal (`prisma migrate dev`) dan tambahkan seed sederhana.
  - _Requirements: 7.1, 7.2, 7.4, 1.5, 2.5, 3.5, 5.6_

- [x] 3. Mesin aturan alokasi investasi (TDD)
  - [x] 3.1 Definisikan tipe domain di `types/finance.ts` (`RiskProfile`, `HorizonBucket`, `AllocationSlice`, `Allocation`, `Goal`, `ProjectionInput`).
    - _Requirements: 4.1_
  - [x] 3.2 Implementasikan `lib/investment/allocation.ts`: `bucketHorizon(horizonYears)` dan `getAllocation(horizonYears, riskProfile)` sesuai Allocation_Matrix; lempar error untuk input tidak valid.
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 4.10_
  - [ ]* 3.3 Property test: komposisi selalu berjumlah 100%.
    - **Feature: financial-planner, Property 1: Komposisi alokasi selalu berjumlah 100%**
    - **Validates: Requirements 4.10**
  - [ ]* 3.4 Property test: pemetaan (horizon, risk) sesuai matriks.
    - **Feature: financial-planner, Property 2: Horizon dan Risk_Profile terpetakan sesuai matriks**
    - **Validates: Requirements 4.1, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8**
  - [ ]* 3.5 Property test: horizon < 2 tahun mengabaikan Risk_Profile.
    - **Feature: financial-planner, Property 3: Horizon pendek mengabaikan Risk_Profile**
    - **Validates: Requirements 4.2**
  - [ ]* 3.6 Property test: klasifikasi bucket konsisten di batas 2 dan 5.
    - **Feature: financial-planner, Property 4: Klasifikasi bucket horizon konsisten di batas**
    - **Validates: Requirements 2.2, 4.2, 4.3, 4.6**
  - [ ]* 3.7 Property test: input tidak valid ditolak (throw).
    - **Feature: financial-planner, Property 9: Input tidak valid ditolak**
    - **Validates: Requirements 4.9**
  - [ ]* 3.8 Unit test tabel: satu contoh per baris matriks (7 sel).
    - _Requirements: 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8_

- [x] 4. Kalkulator kontribusi bulanan (TDD)
  - [x] 4.1 Implementasikan `lib/investment/projection.ts`: `calculateMonthlyContribution(input)` dengan rumus FV annuity, fallback linear saat `i = 0`, dan clamp minimum 0.
    - _Requirements: 5.1, 5.2, 5.3, 5.4_
  - [ ]* 4.2 Property test: round-trip finansial (anuitas hasil menghasilkan FV ~= target saat i > 0).
    - **Feature: financial-planner, Property 6: Kontribusi bulanan mencapai target (round-trip finansial)**
    - **Validates: Requirements 5.1, 5.2**
  - [ ]* 4.3 Property test: fallback linear saat return nol.
    - **Feature: financial-planner, Property 7: Fallback linear saat return nol**
    - **Validates: Requirements 5.3**
  - [ ]* 4.4 Property test: kontribusi bulanan tidak pernah negatif.
    - **Feature: financial-planner, Property 8: Kontribusi bulanan tidak pernah negatif**
    - **Validates: Requirements 5.4**
  - [ ]* 4.5 Unit test: angka yang diverifikasi manual + input tidak valid.
    - _Requirements: 5.1, 5.3_

- [x] 5. Skoring risiko + API routes profile/goal/recommendation
  - [x] 5.1 Implementasikan `lib/investment/riskScoring.ts`: `scoreRisk(answers)` → `{ score, profile }` via ambang batas tetap.
    - _Requirements: 3.1, 3.2, 3.3_
  - [ ]* 5.2 Property test: Risk_Profile hasil skoring selalu valid dan monoton.
    - **Feature: financial-planner, Property 5: Risk_Profile hasil skoring selalu valid**
    - **Validates: Requirements 3.2, 3.3**
  - [x] 5.3 Implementasikan `app/api/profile/route.ts` (POST/GET) dengan validasi non-negatif dan persist via `lib/db.ts`.
    - _Requirements: 1.1, 1.2, 7.1, 7.3_
  - [x] 5.4 Implementasikan `app/api/goal/route.ts` (POST/GET) dengan validasi `targetAmount > 0`, `horizonYears > 0`.
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 7.1_
  - [x] 5.5 Implementasikan `app/api/recommendation/route.ts` (POST): gabungkan `scoreRisk` → `getAllocation` → `calculateMonthlyContribution`, persist `RiskAssessment` + `InvestmentRecommendation`, tangani error DB (HTTP 500 ramah).
    - _Requirements: 3.4, 4.1, 5.1, 5.5, 7.1, 7.3_
  - [ ]* 5.6 Integration test alur route recommendation (skoring→alokasi→proyeksi→persist).
    - _Requirements: 3.4, 5.5_

- [x] 6. UI onboarding Financial Profile + gate
  - [x] 6.1 Buat `components/profile/ProfileForm.tsx` dan `app/profile/page.tsx` (income, expense, currentSavings → `POST /api/profile`).
    - _Requirements: 1.1, 1.2, 6.3_
  - [x] 6.2 Implementasikan Profile_Gate yang memblokir `/investment` bila `GET /api/profile` mengembalikan null (redirect ke `/profile`).
    - _Requirements: 1.3, 1.4_
  - [ ]* 6.3 Component test ProfileForm + gate (redirect saat profil null).
    - _Requirements: 1.3, 1.4_

- [x] 7. UI Investment scope end-to-end + dashboard
  - [x] 7.1 Buat `components/investment/GoalForm.tsx`, `RiskSurvey.tsx`, `RecommendationCard.tsx` dan rangkai di `app/investment/page.tsx` (Goal → Survei → Rekomendasi), wire ke `/api/goal` & `/api/recommendation`.
    - _Requirements: 2.1, 3.1, 4.1, 5.1, 6.1, 6.2_
  - [x] 7.2 Ubah `app/page.tsx` menjadi dashboard dengan tautan ke Profile & Investment dan ringkasan status.
    - _Requirements: 1.4_
  - [ ]* 7.3 Component test RecommendationCard menampilkan komposisi, estimasi return, kontribusi bulanan, dan disclaimer.
    - _Requirements: 6.1, 6.2_
  - [ ]* 7.4 Integration test alur UI investment end-to-end (mock API).
    - _Requirements: 2.1, 4.1, 5.1, 6.1_

- [x] 8. Kemas ulang chatbot menjadi drawer geser dari kanan
  - [x] 8.1 Buat `components/ChatDrawer.tsx` yang membungkus `ChatInterface` tanpa mengubah logikanya; kelola state buka/tutup via context/client wrapper.
    - _Requirements: 8.2, 8.4_
  - [x] 8.2 Pindahkan mount ke `app/layout.tsx` dengan tombol ikon lucide-react di sudut kanan atas (tersedia di semua halaman); transisi `translate-x`, backdrop, tutup via X/backdrop/Escape.
    - _Requirements: 8.1, 8.2, 8.3, 8.5_
  - [ ]* 8.3 Component test: toggle buka/tutup, Escape menutup, pengiriman tetap `POST /api/chat`, a11y dasar (`role="dialog"`, `aria-modal`).
    - _Requirements: 8.2, 8.3, 8.4, 8.5_

- [x] 9. Finalisasi & fondasi roadmap
  - [x] 9.1 Pastikan modul `lib/investment/*` dapat diimpor independen (tanpa dependensi UI/API/DB); dokumentasikan di `dokumentasi.md` kontrak data yang akan dikonsumsi Planner (Monthly_Contribution) dan Chatbot (konteks profil + rekomendasi) di masa depan.
    - _Requirements: 9.1, 9.2, 9.3_
  - [ ]* 9.2 Test importabilitas modul `lib/investment/*` secara independen.
    - _Requirements: 9.2_

- [x] 10. Checkpoint akhir — pastikan build & test hijau
  - Jalankan `npm run build` (harus bersih) dan `npm test` (semua hijau). Pastikan semua test lulus; tanyakan ke pengguna bila muncul pertanyaan.

## Notes

- Task bertanda `*` bersifat opsional (test) dan dapat dilewati untuk MVP cepat.
- Setiap task merujuk requirement spesifik untuk keterlacakan.
- Property test hanya untuk logika murni `lib/investment/*` (min. 100 iterasi, library PBT seperti `fast-check`); UI/API/DB diuji dengan integration/component test.
- Fitur Planner dan integrasi chatbot-ke-data adalah **roadmap** — hanya dicatat di `dokumentasi.md`, tidak diimplementasikan.
- Setiap property test menyertakan tag `Feature: financial-planner, Property {n}: {teks}` dan merujuk properti pada `design.md`.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["3.1"] },
    { "id": 1, "tasks": ["3.2", "4.1", "5.1"] },
    { "id": 2, "tasks": ["3.3", "3.4", "3.5", "3.6", "3.7", "3.8", "4.2", "4.3", "4.4", "4.5", "5.2", "5.3", "5.4"] },
    { "id": 3, "tasks": ["5.5", "6.1"] },
    { "id": 4, "tasks": ["5.6", "6.2", "7.1", "8.1"] },
    { "id": 5, "tasks": ["6.3", "7.2", "8.2", "9.1"] },
    { "id": 6, "tasks": ["7.3", "7.4", "8.3", "9.2"] }
  ]
}
```
