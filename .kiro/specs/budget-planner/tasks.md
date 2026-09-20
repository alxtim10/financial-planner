# Implementation Plan: Budget Planner (Planner Scope)

## Overview

Rencana implementasi menambahkan cakupan **Planner** (penganggaran alokasi berbasis preset) ke aplikasi Financial Planner. Setiap task membangun di atas task sebelumnya dan diakhiri dengan mengintegrasikan kode ke alur yang sudah ada, tanpa kode menggantung. Bahasa implementasi: **TypeScript** (mengikuti stack Next.js yang ada). Urutan mengikuti pola spec `financial-planner`: skema/tipe → logika murni (TDD) → API → UI → dashboard → checkpoint. Sub-task bertanda `*` bersifat opsional (test) dan boleh dilewati untuk MVP cepat.

## Tasks

- [x] 1. Migrasi Prisma: tambah model `BudgetPlan`
  - Tambahkan model `BudgetPlan` (id, userId String?, presetId String, baseAmount Float, mode String, manualSavingsTarget Float?, investmentContribution Float?, breakdown Json, createdAt) ke `prisma/schema.prisma` **tanpa mengubah** model yang ada.
  - Jalankan migrasi baru `prisma migrate dev --name add_budget_plan` (migrasi tambahan; **JANGAN** reset database — data cakupan Investasi harus tetap ada). Bila migrasi gagal karena izin/koneksi, laporkan ke pengguna dan tanyakan alih-alih memaksa.
  - Regenerasi Prisma Client.
  - _Requirements: 7.1, 7.6_

- [x] 2. Definisikan tipe domain Planner
  - Buat `types/planner.ts`: `PresetId`, `SavingsMode`, `BudgetCategory`, `BudgetPreset`, `BudgetLine`, `BudgetBreakdown`, `ShortfallResult`.
  - _Requirements: 3.1, 4.1, 5.1, 10.3_

- [x] 3. Modul preset & perhitungan anggaran (TDD)
  - [x] 3.1 Implementasikan `lib/planner/presets.ts`: konstanta `BUDGET_PRESETS` (3 preset: 50/30/20, 70/20/10, 80/20 dengan kategori & `isSavings`) dan `getPreset(id)` yang melempar error untuk id tidak dikenal.
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.7_
  - [x] 3.2 Implementasikan `lib/planner/budget.ts`: `computeBudget(baseAmount, presetId)` (amount = baseAmount×pct/100, guard input tidak valid), `savingsBucketAmount(breakdown)`, dan `evaluateShortfall(savingsBucketAmount, investmentContribution)`.
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 6.1, 6.2, 6.3, 6.4, 10.1_
  - [ ]* 3.3 Property test: alokasi per pos sesuai preset dan proporsi.
    - **Feature: budget-planner, Property 1: Alokasi per pos sesuai preset dan proporsi**
    - **Validates: Requirements 4.1, 4.2, 3.6**
  - [ ]* 3.4 Property test: total alokasi sama dengan jumlah dasar (toleransi pembulatan).
    - **Feature: budget-planner, Property 2: Total alokasi sama dengan jumlah dasar**
    - **Validates: Requirements 4.3**
  - [ ]* 3.5 Property test: persentase setiap preset berjumlah 100.
    - **Feature: budget-planner, Property 3: Persentase setiap preset berjumlah 100**
    - **Validates: Requirements 3.5**
  - [ ]* 3.6 Property test: penandaan kekurangan dana investasi konsisten (hasShortfall & gap).
    - **Feature: budget-planner, Property 4: Penandaan kekurangan dana investasi konsisten**
    - **Validates: Requirements 6.1, 6.2, 6.3, 6.4**
  - [ ]* 3.7 Property test: input tidak valid ditolak (baseAmount non-berhingga/negatif, preset id salah → throw).
    - **Feature: budget-planner, Property 5: Input tidak valid ditolak**
    - **Validates: Requirements 2.3, 4.5, 3.7**
  - [ ]* 3.8 Unit test tabel: nilai konstanta tiap preset (kategori & persentase per baris) + 3 preset tepat.
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 4. API route `/api/budget` (POST hitung+simpan, GET konteks awal)
  - [x] 4.1 Implementasikan `app/api/budget/route.ts` GET: `getLatestProfile()` → `defaultBaseAmount = income`, ambil `BudgetPlan` terbaru; `runtime = "nodejs"`.
    - _Requirements: 2.1, 7.3, 7.4_
  - [x] 4.2 Implementasikan `app/api/budget/route.ts` POST: validasi (preset, baseAmount≥0, mode, manualSavingsTarget≥0 → 400), `computeBudget` + `savingsBucketAmount`, mode `kombinasi` tarik `monthlyContribution` dari `InvestmentRecommendation` terbaru (0 bila tak ada), `evaluateShortfall`, persist `BudgetPlan` (snapshot investmentContribution), error DB → 500 ramah.
    - _Requirements: 2.2, 2.3, 3.7, 4.1, 5.2, 5.3, 5.4, 5.5, 6.1, 7.1, 7.2, 7.5_
  - [ ]* 4.3 Integration test: GET mengembalikan default base amount dari profil + rencana terakhir.
    - _Requirements: 2.1, 7.3_
  - [ ]* 4.4 Integration test: POST mode terpisah (contribution 0) & kombinasi (tarik + snapshot monthlyContribution; tanpa rekomendasi → 0); error DB → 500.
    - _Requirements: 5.2, 5.3, 5.5, 7.1, 7.2, 7.5_

- [x] 5. Checkpoint — pastikan logika & API hijau
  - Jalankan `npm test` (logika `lib/planner/*` hijau) dan pastikan route ter-typecheck. Tanyakan ke pengguna bila muncul pertanyaan.

- [x] 6. UI Planner end-to-end (gated) + hasil
  - [x] 6.1 Buat `components/planner/PresetPicker.tsx` (pilih 1 dari 3 preset, tampil persentase per kategori, token `--accent`) dan `components/planner/BudgetForm.tsx` (Base_Amount prefilled + timpa, pemilih Savings_Mode, Manual_Savings_Target opsional, tampil investmentContribution di kombinasi).
    - _Requirements: 2.1, 2.2, 3.6, 5.1, 5.2, 5.4, 9.1_
  - [x] 6.2 Buat `components/planner/BudgetResultCard.tsx` mengikuti pola visual `RecommendationCard`: bar proporsi, rincian per pos (Rupiah `Rp ${Math.round(v).toLocaleString("id-ID")}`), peringatan shortfall, disclaimer edukatif.
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 9.3_
  - [x] 6.3 Buat `components/planner/PlannerWizard.tsx` (client) yang merangkai PresetPicker → BudgetForm → BudgetResultCard dan wire ke `GET`/`POST /api/budget`; buat `app/planner/page.tsx` (server component) dibungkus `ProfileGate` (reuse) dengan `dynamic = "force-dynamic"`.
    - _Requirements: 1.1, 1.2, 1.3, 4.1, 8.1, 9.1_
  - [ ]* 6.4 Component test: `BudgetResultCard` menampilkan rincian per pos, bar, peringatan shortfall (saat true), dan disclaimer.
    - _Requirements: 8.1, 8.2, 8.4, 8.5_
  - [ ]* 6.5 Component/integration test: `Profile_Gate` redirect saat profil null; alur UI Planner (mock API).
    - _Requirements: 1.1, 1.2_

- [x] 7. Integrasi dashboard
  - [x] 7.1 Ubah `app/page.tsx` (minimal) untuk menambahkan tautan/kartu menuju `/planner`.
    - _Requirements: 9.2_
  - [ ]* 7.2 Component test: dashboard memuat tautan ke `/planner`.
    - _Requirements: 9.2_

- [x] 8. Checkpoint akhir — pastikan build & test hijau
  - Jalankan `npm run build` (harus bersih) dan `npm test` (semua hijau). Pastikan semua test lulus; tanyakan ke pengguna bila muncul pertanyaan.

## Delta: Proyeksi Target Tabungan Opsional (Requirements 11–12)

> **Catatan penting.** Task 1–8 di atas **sudah selesai** dan build hijau. Task 9–14 berikut adalah **penambahan inkremental** di atas implementasi yang sudah ada — mengubah/menambah berkas yang ada, bukan menulis ulang. Ikuti urutan: migrasi aditif → tipe → logika murni (TDD) → API → UI → checkpoint. Sub-task bertanda `*` bersifat opsional (test).

- [x] 9. Migrasi Prisma aditif: field proyeksi pada `BudgetPlan`
  - Tambahkan dua field **nullable** ke model `BudgetPlan` di `prisma/schema.prisma`: `savingsTargetAmount Float?` dan `savingsHorizonYears Int?`. **JANGAN** ubah kolom lain.
  - Jalankan migrasi tambahan `prisma migrate dev --name add_savings_projection` (aditif; **JANGAN** reset DB — data `BudgetPlan`/Investasi harus tetap ada). Bila migrasi gagal karena izin/koneksi, laporkan ke pengguna dan tanyakan alih-alih memaksa.
  - Regenerasi Prisma Client.
  - _Requirements: 12.7_

- [x] 10. Tambah tipe proyeksi ke `types/planner.ts`
  - Tambahkan (tanpa mengubah tipe lama): `SavingsProjectionDirection` (`"none" | "time-to-goal" | "required-monthly"`), `MonthsToReachResult` (`reachable`, `months`), dan `SavingsProjection` (direction, targetAmount, horizonYears, monthlySavingRate, annualReturn, reachable, months, years, requiredMonthly, allocationSufficient, monthlyGap).
  - _Requirements: 11.1, 11.3, 11.4, 12.8_

- [x] 11. Modul proyeksi murni `lib/planner/savingsProjection.ts` (TDD)
  - [x] 11.1 Implementasikan `savingsProjection.ts` (impor tipe saja dari `@/types/planner`): `monthsToReachTarget({ targetAmount, monthlySaving, annualReturn })` (Arah A: tanpa bunga `ceil(target/monthlySaving)`; berpertumbuhan `n = ln(1 + target×i/monthlySaving)/ln(1+i)` lalu `ceil`; `monthlySaving<=0` tanpa pertumbuhan → `{ reachable:false, months:null }`) dan `requiredMonthlySaving({ targetAmount, horizonYears, annualReturn })` (Arah B: tanpa bunga `target/(horizon×12)`; berpertumbuhan `PMT = target×i/((1+i)^n − 1)`; clamp min 0). Pasang guard input (target berhingga>0, horizon bulat>0, annualReturn berhingga≥0, monthlySaving berhingga≥0).
    - _Requirements: 11.6, 12.1, 12.3, 12.4, 12.5, 12.6_
  - [ ]* 11.2 Property test: Required_Monthly_Saving mencapai target (round-trip FV annuity, annualReturn≥0).
    - **Feature: budget-planner, Property 6: Required_Monthly_Saving mencapai target (round-trip FV annuity)**
    - **Validates: Requirements 11.4, 12.1, 12.3, 12.4**
  - [ ]* 11.3 Property test: konsistensi Time_To_Goal (`months` batas naik/turun akumulasi).
    - **Feature: budget-planner, Property 7: Konsistensi Time_To_Goal (monthsToReachTarget)**
    - **Validates: Requirements 11.3, 12.1, 12.3, 12.4**
  - [ ]* 11.4 Property test: laju tabungan nol tanpa pertumbuhan → tidak akan tercapai (reachable=false, months=null); nilai besar dikembalikan apa adanya.
    - **Feature: budget-planner, Property 8: Laju tabungan nol tanpa pertumbuhan → tidak akan tercapai**
    - **Validates: Requirements 12.5, 12.6**
  - [ ]* 11.5 Property test: input proyeksi tidak valid ditolak (target bukan berhingga>0, horizon bukan bulat>0, annualReturn bukan berhingga≥0 → throw).
    - **Feature: budget-planner, Property 9: Input proyeksi tidak valid ditolak**
    - **Validates: Requirements 11.7, 11.8**

- [x] 12. Extend API `POST /api/budget` — orkestrasi proyeksi
  - [x] 12.1 Tambahkan penerimaan & validasi field opsional `savingsTargetAmount` (bila ada: berhingga > 0 → 400 bila tidak) dan `savingsHorizonYears` (bila ada: `Number.isInteger` & > 0 → 400 bila tidak) di `app/api/budget/route.ts`. Pada mode `kombinasi`, ambil `annualReturn` dari `InvestmentRecommendation` terbaru (0 bila tak ada) sebagai `Growth_Rate`; mode `terpisah` → `Growth_Rate = 0`. Bila `savingsTargetAmount` ada, panggil `monthsToReachTarget` (Arah A, tanpa horizon) atau `requiredMonthlySaving` + banding `savingsBucketAmount` (Arah B, dengan horizon), susun objek `savingsProjection`; bila tidak ada → `savingsProjection: null`. Persist `savingsTargetAmount`/`savingsHorizonYears` ke `BudgetPlan`. Sertakan `savingsProjection` di respons 200.
    - _Requirements: 11.2, 11.3, 11.4, 11.5, 11.7, 11.8, 12.2, 12.3, 12.4, 12.6, 12.7, 12.8_
  - [ ]* 12.2 Integration test: tanpa target → savingsProjection null; Arah A (target tanpa horizon); Arah B (target + horizon) cukup vs kurang; kombinasi memakai annualReturn rekomendasi; validasi target/horizon → 400; persistensi field baru (ada vs NULL).
    - _Requirements: 11.2, 11.7, 11.8, 12.3, 12.7_

- [x] 13. Extend UI Planner — form & hasil proyeksi
  - [x] 13.1 Extend `components/planner/BudgetForm.tsx`: tambahkan input opsional `Savings_Target_Amount` (Rupiah) dan `Savings_Horizon` (tahun) dengan hint Arah A vs B, validasi lapisan form (target diisi → > 0; horizon diisi → bilangan bulat > 0), dan teruskan `savingsTargetAmount`/`savingsHorizonYears` ke `onSubmit`. Perbarui `PlannerWizard.tsx` untuk mengirim field ini ke POST dan meneruskan `savingsProjection` ke hasil.
    - _Requirements: 11.1, 12.9_
  - [x] 13.2 Extend `components/planner/BudgetResultCard.tsx`: render panel `Savings_Projection` bila tidak null — Arah A "tercapai dalam ~X bulan (~Y tahun)"; Arah B "butuh Rp .../bulan" + badge alokasi preset cukup/kurang Rp ...; status "tidak akan tercapai dengan alokasi saat ini" saat `reachable=false`; nilai berhingga besar apa adanya. Pertahankan format Rupiah `Rp ${Math.round(v).toLocaleString("id-ID")}` dan gaya Miami blue.
    - _Requirements: 12.5, 12.6, 12.8, 12.9_
  - [ ]* 13.3 Component test: `BudgetResultCard` menampilkan Arah A, Arah B (cukup & kurang), dan status "tidak akan tercapai"; `BudgetForm` menampilkan kedua field opsional dengan hint.
    - _Requirements: 11.1, 12.5, 12.6, 12.8_

- [x] 14. Checkpoint delta — pastikan build & test hijau
  - Jalankan `npm run build` (harus bersih) dan `npm test` (logika `savingsProjection` + suite lama hijau). Pastikan semua test lulus; tanyakan ke pengguna bila muncul pertanyaan.

## Notes

- Task bertanda `*` bersifat opsional (test) dan dapat dilewati untuk MVP cepat.
- Setiap task merujuk requirement spesifik untuk keterlacakan.
- Property test hanya untuk logika murni `lib/planner/*` (min. 100 iterasi, library PBT `fast-check`); API/DB/UI diuji dengan integration/component test.
- Migrasi Task 1 bersifat **tambahan** — jangan reset database (data cakupan Investasi harus tetap ada).
- Pembulatan Rupiah hanya di lapisan tampilan; `computeBudget` mempertahankan presisi agar total pos sama dengan `Base_Amount`.
- Setiap property test menyertakan tag `Feature: budget-planner, Property {n}: {teks}` dan merujuk properti pada `design.md`.
- **Delta (Task 9–14):** dibangun di atas implementasi yang sudah hijau; migrasi Task 9 bersifat **aditif nullable** — jangan reset DB. `savingsProjection.ts` tetap murni (impor tipe saja). Nilai berhingga besar ditampilkan apa adanya; hanya laju tabungan nol tanpa pertumbuhan yang jadi status "tidak akan tercapai".

## Task Dependency Graph

Wave 0–8 adalah alokasi (Task 1–8, sudah selesai). Wave 9–13 adalah delta proyeksi target tabungan (Task 9–14); wave delta hanya berjalan setelah wave alokasi selesai dan mengikuti urutan migrasi → tipe → logika murni → API → UI, dengan test setelah kode yang diujinya.

```json
{
  "waves": [
    { "id": 0, "tasks": ["1", "2"] },
    { "id": 1, "tasks": ["3.1"] },
    { "id": 2, "tasks": ["3.2"] },
    { "id": 3, "tasks": ["3.3", "3.4", "3.5", "3.6", "3.7", "3.8"] },
    { "id": 4, "tasks": ["4.1", "4.2"] },
    { "id": 5, "tasks": ["4.3", "4.4"] },
    { "id": 6, "tasks": ["6.1", "6.2"] },
    { "id": 7, "tasks": ["6.3", "7.1"] },
    { "id": 8, "tasks": ["6.4", "6.5", "7.2"] },
    { "id": 9, "tasks": ["9", "10"] },
    { "id": 10, "tasks": ["11.1"] },
    { "id": 11, "tasks": ["11.2", "11.3", "11.4", "11.5", "12.1"] },
    { "id": 12, "tasks": ["12.2", "13.2"] },
    { "id": 13, "tasks": ["13.1"] },
    { "id": 14, "tasks": ["13.3"] }
  ]
}
```
