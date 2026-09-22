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

## Delta 2: Opsi Sertakan Tabungan Saat Ini / Present Value (Requirements 13–14)

> **Catatan penting.** Task 1–14 di atas **sudah selesai** dan build hijau. Task 15–20 berikut adalah **penambahan inkremental** di atas proyeksi target tabungan yang sudah ada — menambah parameter `presentValue` opsional (default 0) dan toggle `Include_Savings`, tanpa menulis ulang. Default toggle **mati** → perilaku from-zero yang sudah teruji tetap identik (dijaga Property 10). Urutan: migrasi aditif → tipe → logika murni (TDD) → API → UI → checkpoint. Sub-task bertanda `*` bersifat opsional (test).

- [ ] 15. Migrasi Prisma aditif: field `includeSavings` pada `BudgetPlan`
  - Tambahkan satu field **nullable** ke model `BudgetPlan` di `prisma/schema.prisma`: `includeSavings Boolean?`. **JANGAN** ubah kolom lain.
  - Jalankan migrasi tambahan `prisma migrate dev --name add_include_savings` (aditif; **JANGAN** reset DB — data `BudgetPlan`/Investasi harus tetap ada). Bila migrasi gagal karena izin/koneksi, laporkan ke pengguna dan tanyakan alih-alih memaksa.
  - Regenerasi Prisma Client.
  - _Requirements: 14.3_

- [ ] 16. Extend tipe proyeksi di `types/planner.ts` (present value)
  - Tambahkan (tanpa menghapus field lama): pada `MonthsToReachResult` tambahkan `alreadyReached: boolean`; pada `SavingsProjection` tambahkan `includeSavings: boolean`, `presentValue: number`, `alreadyReached: boolean`.
  - _Requirements: 13.6, 14.4_

- [ ] 17. Extend modul murni `lib/planner/savingsProjection.ts` — parameter `presentValue` (TDD)
  - [ ] 17.1 Tambahkan parameter opsional `presentValue?: number` (default 0) ke `monthsToReachTarget` dan `requiredMonthlySaving`. Terapkan rumus PV-aware: cek awal `PV >= targetAmount` → Arah A `{ reachable:true, months:0, alreadyReached:true }`, Arah B `0`. Arah A tanpa bunga `ceil(max(0, target − PV)/monthlySaving)`; dengan bunga `n = ln((target·i + monthlySaving)/(PV·i + monthlySaving))/ln(1+i)`. Arah B tanpa bunga `(target − PV)/n`; dengan bunga `PMT = (target − PV·(1+i)^n)·i/((1+i)^n − 1)`, clamp min 0. Pertahankan cabang laju-nol tanpa pertumbuhan (`monthlySaving<=0` & `PV<target`) → `{ reachable:false, months:null, alreadyReached:false }`. Tambahkan guard `presentValue` berhingga ≥ 0. Set `alreadyReached:false` pada hasil non-already-reached agar tipe konsisten.
    - _Requirements: 13.2, 13.4, 13.5, 13.6, 13.7, 13.8, 13.9_
  - [ ]* 17.2 Property test: `presentValue = 0` mereproduksi hasil from-zero (ekuivalensi terhadap perilaku lama).
    - **Feature: budget-planner, Property 10: presentValue = 0 mereproduksi hasil from-zero (ekuivalensi)**
    - **Validates: Requirements 13.2**
  - [ ]* 17.3 Property test: Required_Monthly_Saving dengan saldo awal mencapai target (round-trip FV annuity + PV).
    - **Feature: budget-planner, Property 11: Required_Monthly_Saving dengan saldo awal mencapai target (round-trip FV annuity + PV)**
    - **Validates: Requirements 13.5**
  - [ ]* 17.4 Property test: konsistensi Time_To_Goal dengan saldo awal (`months` batas naik/turun akumulasi + PV).
    - **Feature: budget-planner, Property 12: Konsistensi Time_To_Goal dengan saldo awal (monthsToReachTarget + PV)**
    - **Validates: Requirements 13.4**
  - [ ]* 17.5 Property test: `presentValue ≥ target` → sudah tercapai (Arah A `months 0`/`alreadyReached`; Arah B `0`).
    - **Feature: budget-planner, Property 13: presentValue ≥ target → sudah tercapai (Arah A & B)**
    - **Validates: Requirements 13.6**
  - [ ]* 17.6 Property test: guard `presentValue` tidak valid ditolak (perluasan Property 9: presentValue bukan berhingga ≥ 0 → throw).
    - **Feature: budget-planner, Property 9: Input proyeksi tidak valid ditolak**
    - **Validates: Requirements 13.9**

- [ ] 18. Extend API `/api/budget` — orkestrasi present value
  - [ ] 18.1 Extend `GET /api/budget`: sertakan `currentSavings = profile?.currentSavings ?? null` pada respons di samping `defaultBaseAmount`.
    - _Requirements: 14.5_
  - [ ] 18.2 Extend `POST /api/budget`: terima field opsional `includeSavings` (boolean, default `false`). Bila `savingsTargetAmount` ada, hitung `presentValue = includeSavings ? (profile?.currentSavings ?? 0) : 0` (reuse profil yang sudah diambil), teruskan `presentValue` ke `monthsToReachTarget`/`requiredMonthlySaving`; sertakan `includeSavings`, `presentValue`, `alreadyReached` pada objek `savingsProjection`; persist `includeSavings` ke `BudgetPlan`. Tangani `includeSavings` secara defensif meski tanpa target (diabaikan bila `savingsProjection` null).
    - _Requirements: 14.1, 14.2, 14.3, 14.4_
  - [ ]* 18.3 Integration test: `includeSavings=true` memakai `currentSavings` sbg PV (proyeksi memperhitungkan saldo awal); `false`/tanpa → PV 0 (identik from-zero); `PV ≥ target` → `alreadyReached true`; persist `includeSavings` (ada vs NULL); `GET` kembalikan `currentSavings`.
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5_

- [ ] 19. Extend UI Planner — toggle Include_Savings & tampilan hasil
  - [ ] 19.1 Extend `PlannerWizard.tsx`: baca `currentSavings` dari respons `GET /api/budget`, teruskan ke `BudgetForm`; kirim `includeSavings` pada body `POST`. Extend `BudgetForm.tsx`: tambahkan toggle/checkbox "Sertakan tabungan saat ini (Rp …)" yang tampil **hanya** saat `Savings_Target_Amount` diisi & `currentSavings > 0`, default tidak dicentang, teruskan `includeSavings` ke `onSubmit`.
    - _Requirements: 14.6_
  - [ ] 19.2 Extend `BudgetResultCard.tsx`: bila `savingsProjection.includeSavings`, tampilkan catatan "termasuk tabungan saat ini Rp … sebagai saldo awal"; bila `savingsProjection.alreadyReached`, tampilkan status "sudah tercapai" (Arah A/B) alih-alih perhitungan biasa; selain itu Arah A/B mencerminkan sisa target yang berkurang. Pertahankan format Rupiah & gaya Miami blue.
    - _Requirements: 13.6, 14.7_
  - [ ]* 19.3 Component test: toggle `Include_Savings` muncul saat target diisi & `currentSavings>0` (dan tidak muncul sebaliknya); `BudgetResultCard` menampilkan catatan saldo awal saat `includeSavings` dan status "sudah tercapai" saat `alreadyReached`.
    - _Requirements: 14.6, 14.7_

- [ ] 20. Checkpoint delta 2 — pastikan build & test hijau
  - Jalankan `npm run build` (harus bersih) dan `npm test` (logika `savingsProjection` PV-aware + suite lama hijau). Pastikan semua test lulus; tanyakan ke pengguna bila muncul pertanyaan.

## Delta 3: Preset Penganggaran Kustom / Custom (Requirements 15–16)

> **Catatan penting.** Task 1–20 di atas adalah iterasi sebelumnya. Task 21–26 berikut adalah **penambahan inkremental** (Delta 3) yang menambah opsi preset keempat **Custom** (tiga kategori tetap Kebutuhan/Keinginan/Ditabung dengan persentase yang ditentukan pengguna, harus berjumlah tepat 100; Ditabung = Savings_Bucket). **TIDAK ADA migrasi Prisma untuk Delta 3** — `BudgetPlan.presetId` sudah kolom `String` bebas dan `breakdown` sudah `Json`, jadi penanda `presetId "custom"` + breakdown implisit sudah cukup. Urutan: tipe → logika murni (TDD) → API → UI → checkpoint. Sub-task bertanda `*` bersifat opsional (test).

- [ ] 21. Extend tipe domain Planner untuk Custom (`types/planner.ts`)
  - Perluas `PresetId` menjadi `"50/30/20" | "70/20/10" | "80/20" | "custom"` (tanpa menghapus nilai lama). Tambahkan `CustomAllocation { kebutuhan: number; keinginan: number; ditabung: number }`. Sesuaikan `BUDGET_PRESETS` menjadi `Record<Exclude<PresetId, "custom">, BudgetPreset>` agar record tetap 3 preset tetap.
  - _Requirements: 15.1_

- [ ] 22. Extend modul murni `lib/planner/presets.ts` + `budget.ts` untuk Custom (TDD)
  - [ ] 22.1 Extend `lib/planner/presets.ts`: tambahkan `buildCustomPreset(pct: CustomAllocation): BudgetPreset` (id `"custom"`, label `"Custom"`, kategori tetap Kebutuhan/Keinginan/Ditabung dengan `isSavings` masing-masing false/false/true, persentase dari `pct`; guard tiap persentase berhingga ≥ 0 → throw, dan `abs(sum − 100) < 1e-9` → throw bila gagal). Pastikan `getPreset` melempar untuk id `"custom"`/tak dikenal. Impor tipe saja dari `@/types/planner`.
    - _Requirements: 15.2, 15.3, 15.4, 15.7, 15.8, 15.9_
  - [ ] 22.2 Extend `lib/planner/budget.ts`: tambahkan `computeBudgetFromPreset(baseAmount, preset)` murni (amount = baseAmount×pct/100 per kategori; `breakdown.presetId = preset.id`; guard baseAmount berhingga ≥ 0) dan ubah `computeBudget(baseAmount, presetId)` agar mendelegasi ke `computeBudgetFromPreset(baseAmount, getPreset(presetId))` untuk preset tetap (perilaku tetap tidak berubah).
    - _Requirements: 15.5, 15.6, 15.9_
  - [ ]* 22.3 Property test: `buildCustomPreset` menghasilkan struktur kategori tetap yang benar (id/label, tiga kategori, isSavings, pemetaan persentase).
    - **Feature: budget-planner, Property 14: buildCustomPreset menghasilkan struktur kategori tetap yang benar**
    - **Validates: Requirements 15.2, 15.3, 15.4**
  - [ ]* 22.4 Property test: `computeBudgetFromPreset` mengonservasi jumlah dasar (sum lines ~= baseAmount; amount = base×pct/100; presetId = preset.id) untuk preset tetap & custom.
    - **Feature: budget-planner, Property 15: computeBudgetFromPreset mengonservasi jumlah dasar**
    - **Validates: Requirements 15.5, 15.6**
  - [ ]* 22.5 Property test: `Custom_Allocation` tidak valid ditolak (persentase bukan berhingga ≥ 0, atau `abs(sum − 100) ≥ 1e-9` → throw).
    - **Feature: budget-planner, Property 16: Custom_Allocation tidak valid ditolak**
    - **Validates: Requirements 15.7, 15.8**
  - [ ]* 22.6 Unit test: `"custom"` adalah opsi `presetId` yang sah (contoh); `getPreset("custom")` melempar.
    - _Requirements: 15.1, 15.9_

- [ ] 23. Extend API `POST /api/budget` — jalur Custom
  - [ ] 23.1 Extend `app/api/budget/route.ts` POST: perluas validasi `presetId` agar menerima `"custom"` (Req 16.6); terima field opsional `customAllocation`. WHERE `presetId === "custom"`: wajibkan `customAllocation` (else 400, Req 16.2), validasi tiap persentase berhingga ≥ 0 dan `abs(sum − 100) < 1e-9` (else 400, Req 16.3), lalu `preset = buildCustomPreset(customAllocation)` dan `breakdown = computeBudgetFromPreset(baseAmount, preset)`. WHERE preset tetap: pertahankan `computeBudget(baseAmount, presetId)` (abaikan `customAllocation`, Req 16.5). Lanjutkan shortfall + proyeksi target tabungan seperti biasa. Persist `presetId` apa adanya (`"custom"`) + `breakdown` Json — **tanpa kolom baru / migrasi** (Req 16.7).
    - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5, 16.6, 16.7_
  - [ ]* 23.2 Integration test: custom valid → 200 (breakdown custom, label "Custom", + savingsProjection bila ada target); custom tanpa `customAllocation` → 400; custom sum≠100/negatif → 400; preset tetap + customAllocation nyasar → hasil identik tanpa customAllocation; persist presetId "custom" + breakdown (tanpa migrasi).
    - _Requirements: 16.2, 16.3, 16.4, 16.5, 16.7_

- [ ] 24. Extend UI PresetPicker — kartu Custom + input persentase
  - [ ] 24.1 Extend `components/planner/PresetPicker.tsx`: tambahkan kartu keempat "Custom"; WHEN dipilih, tampilkan tiga input persentase (Kebutuhan, Keinginan, Ditabung) + indikator total berjalan yang menandai ketika total ≠ 100. Tandai kartu terpilih dengan token `--accent`.
    - _Requirements: 16.8, 16.9_

- [ ] 25. Extend UI form/wizard — kirim customAllocation + validasi klien
  - [ ] 25.1 Extend `components/planner/BudgetForm.tsx` + `components/planner/PlannerWizard.tsx`: saat preset custom aktif, kumpulkan tiga persentase dan teruskan sebagai `customAllocation` pada body `POST`. Validasi sisi klien: tiap persentase `0..100` berhingga dan jumlah tepat 100 (toleransi epsilon); WHILE total ≠ 100, cegah/nonaktifkan submit dan tandai kondisinya. Untuk preset tetap, jangan kirim `customAllocation` (perilaku tidak berubah). `BudgetResultCard` tidak perlu diubah — sudah merender breakdown custom (label "Custom") apa adanya (Req 16.10).
    - _Requirements: 16.1, 16.9, 16.10_
  - [ ]* 25.2 Component test: `PresetPicker` menampilkan kartu Custom & tiga input + indikator total (muncul saat custom, tidak saat preset tetap); total ≠ 100 mencegah submit dan menandai, total = 100 mengizinkan; `BudgetResultCard` merender breakdown `presetId "custom"` dengan label "Custom".
    - _Requirements: 16.8, 16.9, 16.10_

- [ ] 26. Checkpoint delta 3 — pastikan build & test hijau
  - Jalankan `npm run build` (harus bersih) dan `npm test` (logika Custom `buildCustomPreset`/`computeBudgetFromPreset` + suite lama hijau). Pastikan semua test lulus; tanyakan ke pengguna bila muncul pertanyaan.

## Iterasi Goal-Driven (Requirements 17–21) — OTORITATIF

> **Pivot arah Planner.** Task 27–32 berikut menerapkan **model goal-driven** yang **menggantikan** arah preset/persentase (Task 1–26 disuperseksi). Alur baru: pengguna memberi `monthlyIncome`, `targetAmount`, `horizonYears` (dan profil menyuplai `currentSavings` + `expense`), sistem **menghitung `Ditabung`** (akumulasi murni tanpa bunga) dan menurunkan persentase sebagai OUTPUT.
>
> **TIDAK ADA migrasi Prisma** — memakai ulang kolom `BudgetPlan` yang sudah ada dengan penanda `presetId = "goal"` (`baseAmount = monthlyIncome`, `savingsTargetAmount = targetAmount`, `savingsHorizonYears = horizonYears`, `breakdown` Json). Modul lama (`presets.ts`/`budget.ts`/`savingsProjection.ts`) **dipensiunkan tetapi dipertahankan** di repo (tidak dipakai UI/API goal-driven). `PresetPicker` dihapus dari alur. Bahasa implementasi: **TypeScript**. Urutan: tipe → logika murni (TDD) → API → UI → checkpoint. Sub-task bertanda `*` bersifat opsional (test).

- [ ] 27. Tambah tipe goal-driven ke `types/planner.ts`
  - Tambahkan (tanpa menghapus tipe lama yang kini superseded): `GoalBudgetInput` (`monthlyIncome`, `currentSavings`, `targetAmount`, `horizonYears`, `monthlyExpense`), `FeasibilitySeverity` (`"ok" | "tight" | "impossible"`), `GoalFeasibility` (`feasible`, `severity`, `reason`), dan `GoalBudgetResult` (`monthlyIncome`, `monthsN`, `ditabung`, `kebutuhan`, `keinginan`, `ditabungPct`, `kebutuhanPct`, `keinginanPct`, `lines: BudgetLine[]`, `alreadyReached`, `feasibility`). Reuse `BudgetLine` untuk ketiga pos (`percentage` = Derived_Percentage, `isSavings` true hanya Ditabung).
  - _Requirements: 17.1, 19.2, 20.5_

- [ ] 28. Fungsi murni `lib/planner/goalBudget.ts` (TDD)
  - [ ] 28.1 Implementasikan `computeGoalBudget(input: GoalBudgetInput): GoalBudgetResult` (impor TIPE SAJA dari `@/types/planner`; jangan impor `presets/budget/savingsProjection`). Guard (throw): `monthlyIncome` berhingga > 0; `currentSavings` berhingga ≥ 0; `targetAmount` berhingga > 0; `horizonYears` `Number.isInteger` & > 0; `monthlyExpense` berhingga ≥ 0. Hitung `monthsN = horizonYears*12`; `ditabung = max(0, targetAmount − currentSavings)/monthsN`; `alreadyReached = currentSavings >= targetAmount`; `kebutuhan = monthlyExpense>0 ? monthlyExpense : Math.round(0.65*(monthlyIncome − ditabung))`; `keinginan = monthlyIncome − ditabung − kebutuhan`; `Derived_Percentage` tiap pos = `pos/monthlyIncome*100`; susun `lines` (Kebutuhan/Keinginan/Ditabung); `feasibility` per aturan tunggal (impossible iff `ditabung>income`; else `feasible = ditabung+kebutuhan<=income`; `severity "ok"` iff `feasible && keinginan>=0.05*income`, else `"tight"`) dengan `reason` saran Bahasa Indonesia. Pertahankan presisi (pembulatan hanya di tampilan; kebutuhan fallback di-`round` sesuai Req 18.5).
    - _Requirements: 17.6, 17.7, 17.8, 17.9, 17.10, 18.1, 18.2, 18.3, 18.4, 18.5, 18.6, 18.7, 18.8, 19.1, 20.1, 20.2, 20.3, 20.4, 20.5_
  - [ ]* 28.2 Property test: Ditabung mengikuti akumulasi murni (`= max(0,target−savings)/(horizon*12)`, tak pernah negatif).
    - **Feature: budget-planner, Property 17: Ditabung mengikuti akumulasi murni**
    - **Validates: Requirements 18.1, 18.2**
  - [ ]* 28.3 Property test: sudah tercapai → Ditabung nol (`savings>=target` → `ditabung 0` & `alreadyReached`).
    - **Feature: budget-planner, Property 18: Sudah tercapai → Ditabung nol**
    - **Validates: Requirements 18.3**
  - [ ]* 28.4 Property test: Kebutuhan dari expense dengan rasio fallback (`expense>0` → `kebutuhan==expense`; `expense==0` → `round(0.65*(income−ditabung))`).
    - **Feature: budget-planner, Property 19: Kebutuhan dari expense dengan rasio fallback**
    - **Validates: Requirements 18.4, 18.5**
  - [ ]* 28.5 Property test: konservasi pos dan persentase turunan (`keinginan=income−ditabung−kebutuhan`, `pct=pos/income*100`; saat `ok` → sum pos = income & sum pct = 100 dalam toleransi).
    - **Feature: budget-planner, Property 20: Konservasi pos dan persentase turunan (kondisi layak)**
    - **Validates: Requirements 18.6, 19.1, 19.3**
  - [ ]* 28.6 Property test: klasifikasi feasibility konsisten (impossible iff ditabung>income; feasible iff ditabung+kebutuhan<=income; ok iff feasible & keinginan>=5% income; else tight).
    - **Feature: budget-planner, Property 21: Klasifikasi feasibility konsisten**
    - **Validates: Requirements 20.1, 20.2, 20.3, 20.4**
  - [ ]* 28.7 Property test: input tidak valid ditolak (salah satu guard dilanggar → throw).
    - **Feature: budget-planner, Property 22: Input tidak valid ditolak**
    - **Validates: Requirements 17.6, 17.7, 17.8, 17.9, 17.10**
  - [ ]* 28.8 Unit test: `monthsN = horizonYears*12` (contoh 5 → 60) dan satu contoh end-to-end terverifikasi manual.
    - _Requirements: 18.1_

- [ ] 29. Rework `GET /api/budget` — konteks goal-driven
  - [ ] 29.1 Ubah `app/api/budget/route.ts` GET agar mengembalikan `{ defaultMonthlyIncome: profile?.income ?? null, currentSavings: profile?.currentSavings ?? null, monthlyExpense: profile?.expense ?? null, latestPlan? }`. Pertahankan `runtime = "nodejs"` dan error DB → 500 ramah.
    - _Requirements: 21.2, 21.8_

- [ ] 30. Rework `POST /api/budget` — orkestrasi goal-driven
  - [ ] 30.1 Ubah `app/api/budget/route.ts` POST agar menerima body `{ monthlyIncome, targetAmount, horizonYears, userId? }`. Validasi → 400: `monthlyIncome` berhingga > 0; `targetAmount` berhingga > 0; `horizonYears` `Number.isInteger` & > 0. Ambil `currentSavings = profile?.currentSavings ?? 0` dan `monthlyExpense = profile?.expense ?? 0` via `getLatestProfile()`. Panggil `computeGoalBudget({ monthlyIncome, currentSavings, targetAmount, horizonYears, monthlyExpense })` (guard error → 400 jaring pengaman). Persist `BudgetPlan` dengan `presetId "goal"`, `baseAmount = monthlyIncome`, `savingsTargetAmount = targetAmount`, `savingsHorizonYears = horizonYears`, `breakdown = result.lines` (Json), `mode`/`includeSavings`/`investmentContribution` null/diomit — **tanpa migrasi**. Hapus jalur preset/custom/mode/proyeksi/shortfall lama dari route. Kembalikan `GoalBudgetResult` (200). Error DB → 500 ramah; pertahankan `runtime = "nodejs"`.
    - _Requirements: 21.3, 21.4, 21.5, 21.6, 21.7, 21.8_
  - [ ]* 30.2 Integration test: body valid → 200 dengan tiga pos + persen + feasibility + alreadyReached (memakai currentSavings/expense profil; monthlyIncome default income & override body); `monthlyIncome`/`targetAmount`/`horizonYears` tidak valid → 400; persist `presetId "goal"` + reuse kolom (tanpa migrasi); GET kembalikan income/savings/expense; error DB → 500.
    - _Requirements: 21.2, 21.3, 21.4, 21.5, 21.6, 21.7, 21.8_

- [ ] 31. Rework UI Planner — form goal-driven, hasil, hapus PresetPicker
  - [ ] 31.1 Rework `components/planner/BudgetForm.tsx` (atau buat `GoalBudgetForm`) menjadi form goal-driven: field `monthlyIncome` (prefill dari `defaultMonthlyIncome`, Rupiah pemisah ribuan via `lib/format/rupiahInput.ts`), `targetAmount` (Rupiah pemisah ribuan), `horizonYears` (bilangan bulat tahun); tampilkan `currentSavings` read-only sebagai konteks. Semua wajib; validasi klien mencerminkan server (income>0, target>0, horizon bulat>0) dan mencegah submit bila tidak valid. Sederhanakan `components/planner/PlannerWizard.tsx` menjadi form → hasil (hapus penggunaan `PresetPicker` dan langkah pemilihan preset/mode); wire ke `GET`/`POST /api/budget` baru dan teruskan `GoalBudgetResult` ke result card.
    - _Requirements: 17.2, 17.3, 21.1_
  - [ ] 31.2 Rework `components/planner/BudgetResultCard.tsx`: tampilkan tiga pos (Kebutuhan/Keinginan/Ditabung) dengan nominal Rupiah + `Derived_Percentage`, bar proporsi, baris "Ditabung Rp X/bulan untuk mencapai target Rp Y dalam Z tahun", status `alreadyReached`, dan panel peringatan feasibility + saran saat `severity` bukan `"ok"` (tight/impossible). Pertahankan format Rupiah `Rp ${Math.round(v).toLocaleString("id-ID")}`, token Miami blue, dan disclaimer edukatif; jaga keterbacaan mobile.
    - _Requirements: 19.4, 20.6, 18.3_
  - [ ]* 31.3 Component test: `GoalBudgetForm` menampilkan monthlyIncome/targetAmount/horizonYears + currentSavings read-only dan mencegah submit tidak valid; `BudgetResultCard` menampilkan tiga pos + persen + bar, baris target, status "sudah tercapai", dan panel feasibility (tight & impossible). `PresetPicker` tidak lagi dirender oleh wizard.
    - _Requirements: 19.4, 20.6, 18.3_

- [ ] 32. Checkpoint goal-driven — pastikan build & test hijau
  - Jalankan `npm run build` (harus bersih) dan `npm test` (logika `goalBudget` + suite yang masih relevan hijau). Pastikan semua test lulus; tanyakan ke pengguna bila muncul pertanyaan.

## Notes

- Task bertanda `*` bersifat opsional (test) dan dapat dilewati untuk MVP cepat.
- Setiap task merujuk requirement spesifik untuk keterlacakan.
- Property test hanya untuk logika murni `lib/planner/*` (min. 100 iterasi, library PBT `fast-check`); API/DB/UI diuji dengan integration/component test.
- Migrasi Task 1 bersifat **tambahan** — jangan reset database (data cakupan Investasi harus tetap ada).
- Pembulatan Rupiah hanya di lapisan tampilan; `computeBudget` mempertahankan presisi agar total pos sama dengan `Base_Amount`.
- Setiap property test menyertakan tag `Feature: budget-planner, Property {n}: {teks}` dan merujuk properti pada `design.md`.
- **Delta (Task 9–14):** dibangun di atas implementasi yang sudah hijau; migrasi Task 9 bersifat **aditif nullable** — jangan reset DB. `savingsProjection.ts` tetap murni (impor tipe saja). Nilai berhingga besar ditampilkan apa adanya; hanya laju tabungan nol tanpa pertumbuhan yang jadi status "tidak akan tercapai".
- **Delta 2 (Task 15–20):** menambah parameter `presentValue` opsional (default 0) + toggle `Include_Savings` (default **mati**) di atas Delta 1 yang sudah selesai. Migrasi Task 15 (`includeSavings Boolean?`) bersifat **aditif nullable** — jangan reset DB. `savingsProjection.ts` tetap murni (impor tipe saja); `presentValue` selalu dihitung di lapisan API dari `Financial_Profile.currentSavings`, tidak dipersistensi. Property 10 menjaga ekuivalensi: dengan toggle mati (`PV = 0`), hasil identik dengan perilaku from-zero yang lama.
- **Iterasi Goal-Driven (Task 27–32) — OTORITATIF:** membalik arah Planner ke **goal-driven** dan **menggantikan** Task 1–26 (preset/persentase, kini disuperseksi). **TIDAK ADA migrasi Prisma** — reuse kolom `BudgetPlan` dengan penanda `presetId = "goal"` (`baseAmount=monthlyIncome`, `savingsTargetAmount=targetAmount`, `savingsHorizonYears=horizonYears`, `breakdown` Json). Modul `presets.ts`/`budget.ts`/`savingsProjection.ts` **dipensiunkan tetapi dipertahankan** (tak dipakai UI/API goal-driven); `PresetPicker` dihapus dari alur. Inti perhitungan: **akumulasi murni tanpa bunga** di `lib/planner/goalBudget.ts` (`computeGoalBudget`), diuji Property 17–22 (`fast-check`, min. 100 iterasi). Persentase = OUTPUT (`Derived_Percentage`). Task 30.1 dan 29.1 sama-sama menyunting `app/api/budget/route.ts` → ditempatkan pada wave berbeda untuk menghindari konflik tulis; 31.1 dan 31.2 menyunting berkas berbeda sehingga boleh paralel.

## Task Dependency Graph

Wave 0–8 adalah alokasi (Task 1–8, sudah selesai). Wave 9–14 adalah delta proyeksi target tabungan (Task 9–14, sudah selesai). Wave 15–19 adalah **delta 2** present value / Include_Savings (Task 15–20); wave delta 2 hanya berjalan setelah delta 1 selesai dan mengikuti urutan migrasi → tipe → logika murni → API → UI, dengan test setelah kode yang diujinya. Task 18.1 dan 18.2 sama-sama menyunting `app/api/budget/route.ts` sehingga ditempatkan pada wave berbeda untuk menghindari konflik tulis; 19.1 dan 19.2 menyunting berkas berbeda sehingga boleh paralel. Wave 21–26 adalah **delta 3** preset Custom (Task 21–26); wave delta 3 hanya berjalan setelah delta 2 selesai dan mengikuti urutan tipe → logika murni (`presets.ts` lalu `budget.ts` pada wave berbeda karena `computeBudget` mendelegasi ke `computeBudgetFromPreset`/`getPreset`) → API → UI, dengan test setelah kode yang diujinya. Task 24.1 (`PresetPicker.tsx`) dan 25.1 (`BudgetForm.tsx`/`PlannerWizard.tsx`) menyunting berkas berbeda sehingga boleh paralel; tidak ada migrasi Prisma pada delta 3.

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
    { "id": 14, "tasks": ["13.3"] },
    { "id": 15, "tasks": ["15", "16"] },
    { "id": 16, "tasks": ["17.1"] },
    { "id": 17, "tasks": ["17.2", "17.3", "17.4", "17.5", "17.6", "18.1"] },
    { "id": 18, "tasks": ["18.2"] },
    { "id": 19, "tasks": ["18.3", "19.1", "19.2"] },
    { "id": 20, "tasks": ["19.3"] },
    { "id": 21, "tasks": ["21"] },
    { "id": 22, "tasks": ["22.1"] },
    { "id": 23, "tasks": ["22.2"] },
    { "id": 24, "tasks": ["22.3", "22.4", "22.5", "22.6", "23.1"] },
    { "id": 25, "tasks": ["23.2", "24.1", "25.1"] },
    { "id": 26, "tasks": ["25.2"] },
    { "id": 27, "tasks": ["27"] },
    { "id": 28, "tasks": ["28.1"] },
    { "id": 29, "tasks": ["28.2", "28.3", "28.4", "28.5", "28.6", "28.7", "28.8", "29.1"] },
    { "id": 30, "tasks": ["30.1"] },
    { "id": 31, "tasks": ["30.2", "31.1", "31.2"] },
    { "id": 32, "tasks": ["31.3"] }
  ]
}
```

> **Catatan wave Iterasi Goal-Driven (27–32).** Wave 27–32 hanya berjalan setelah tipe goal-driven ada (Task 27) dan mengikuti urutan tipe → logika murni (`goalBudget.ts`) → API → UI, dengan test setelah kode yang diujinya. Task 29.1 (`GET`) dan 30.1 (`POST`) sama-sama menyunting `app/api/budget/route.ts` → ditempatkan pada wave berbeda (29 lalu 30) untuk menghindari konflik tulis. Task 31.1 (`BudgetForm`/`PlannerWizard`) dan 31.2 (`BudgetResultCard`) menyunting berkas berbeda → boleh paralel (wave 31). **Tidak ada migrasi Prisma** pada iterasi ini.
