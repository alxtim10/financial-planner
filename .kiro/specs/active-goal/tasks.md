# Implementation Plan: Active Goal (Tujuan Aktif Tersentralisasi)

## Overview

Rencana implementasi menyentralisasi **satu Tujuan Aktif** (`Active_Goal` = baris `Goal` terbaru) sebagai masukan bersama untuk cakupan **Investasi** dan **Planner**, dikelola dari **dashboard**. Setiap task membangun di atas task sebelumnya dan diakhiri dengan mengintegrasikan kode ke alur yang sudah ada, tanpa kode menggantung. Bahasa implementasi: **TypeScript** (mengikuti stack Next.js yang ada).

Urutan: migrasi aditif `Goal.name` → helper `getActiveGoal` + perluas `GET/POST /api/goal` → dashboard `ActiveGoalCard`/`GoalEditor` → prefill Investasi (+ hentikan POST goal) → perluas `GET /api/budget` + prefill Planner → checkpoint build+test akhir.

Fitur ini bersifat **integrasi/persistensi** — **tidak ada property-based test** (lihat design → Correctness Properties). Test berupa unit/integration/component, ditandai `*` (opsional, boleh dilewati untuk MVP cepat). Inti implementasi tidak pernah opsional.

## Tasks

- [ ] 1. Migrasi Prisma aditif: `Goal.name String?`
  - Tambahkan field **nullable** `name String?` ke model `Goal` di `prisma/schema.prisma` **tanpa mengubah** kolom lain.
  - Jalankan migrasi tambahan `prisma migrate dev --name add_goal_name` (aditif; **JANGAN** reset database — data `Goal`/Investasi/`BudgetPlan` harus tetap ada; baris lama memperoleh `name = NULL`). Bila migrasi gagal karena izin/koneksi, laporkan ke pengguna dan tanyakan alih-alih memaksa.
  - Regenerasi Prisma Client.
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [ ] 2. Pembaca server-side `getActiveGoal` + perluas endpoint `/api/goal`
  - [ ] 2.1 Buat `lib/goal.ts`: `getActiveGoal(): Promise<Goal | null>` yang mengembalikan baris `Goal` terbaru (`orderBy createdAt desc`) via Prisma singleton (`lib/db.ts`), mengikuti pola `lib/profileGate.ts#getLatestProfile()`.
    - _Requirements: 3.2, 3.3_
  - [ ] 2.2 Ubah `app/api/goal/route.ts` `POST`: terima `name` opsional (bila `typeof name === "string"` → `trim()`, `""` → null; selain itu null), simpan pada `goal.create`, dan sertakan `name` pada payload 201 `{ id, name, targetAmount, horizonYears }`. Pertahankan validasi lama (`targetAmount` berhingga > 0; `horizonYears` bilangan bulat > 0 → 400), `runtime = "nodejs"`, dan error DB → 500 ramah.
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 10.1_
  - [ ] 2.3 Pastikan `app/api/goal/route.ts` `GET` mengembalikan baris `Goal` terbaru termasuk `name` (karena mengembalikan seluruh baris, `name` otomatis ikut setelah migrasi) → 200 `{ goal }`; error DB → 500 ramah.
    - _Requirements: 3.1, 3.4_
  - [ ]* 2.4 Unit test: normalisasi `name` (`"  "`/`""` → null; `"  Beli Rumah "` → `"Beli Rumah"`) dan `getActiveGoal` memilih baris terbaru (dua baris `createdAt` berbeda) + null saat kosong.
    - _Requirements: 2.2, 3.1, 3.2_
  - [ ]* 2.5 Integration test: `POST /api/goal` dengan `name` → 201 termasuk `name`; tanpa/kosong → `name` null; `targetAmount<=0`/`horizonYears` non-integer → 400; error DB → 500. `GET /api/goal` → baris terbaru termasuk `name`; null saat kosong.
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 3.1_

- [ ] 3. Dashboard: `ActiveGoalCard` + `GoalEditor`
  - [ ] 3.1 Buat `components/goal/GoalEditor.tsx` (client): field `name` (opsional), `targetAmount` (Rupiah, `formatThousands`/`parseThousands`), `horizonYears` (bilangan bulat tahun); validasi klien mirror server (target > 0; horizon bilangan bulat > 0, cegah submit bila tidak valid); submit → `POST /api/goal` `{ name: name.trim() || null, targetAmount, horizonYears }`; sukses (201) → callback `onSaved()`; gagal → pesan error ramah tanpa menghapus input; token Miami blue. Terima nilai awal opsional (mode "ubah") untuk prefill.
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.6, 5.7, 10.2, 10.3, 10.4_
  - [ ] 3.2 Buat `components/goal/ActiveGoalCard.tsx` (client): terima prop `activeGoal: { id, name, targetAmount, horizonYears } | null`. Bila ada → tampilkan nama (fallback "Tujuan" saat null/kosong) + `targetAmount` Rupiah `Rp ${Math.round(v).toLocaleString("id-ID")}` + `horizonYears` (mis. "5 tahun") + tombol "Ubah tujuan" yang menampilkan `GoalEditor` (inline expand). Bila null → CTA "Tetapkan tujuan" yang menampilkan `GoalEditor`. Pada `onSaved`, panggil `router.refresh()`. Token Miami blue, responsif.
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.6, 5.5, 10.2, 10.3, 10.4_
  - [ ] 3.3 Ubah `app/page.tsx` (server): `const activeGoal = await getActiveGoal();` lalu render `<ActiveGoalCard activeGoal={{ id, name, targetAmount, horizonYears } | null} />` di bagian ringkasan (serialisasi ringan, tanpa `createdAt`). Pertahankan `dynamic = "force-dynamic"`.
    - _Requirements: 4.5_
  - [ ]* 3.4 Component test: `ActiveGoalCard` menampilkan nama/fallback + Rupiah + horizon saat ada tujuan dan CTA saat null; `GoalEditor` mencegah submit saat tidak valid, mengirim `name` ter-trim (kosong → null), dan menampilkan error saat POST gagal tanpa kehilangan input.
    - _Requirements: 4.1, 4.2, 4.4, 5.3, 5.4, 5.6_

- [ ] 4. Checkpoint — pastikan API & dashboard hijau
  - Jalankan `npm run build` (harus bersih) dan `npm test` (bila ada test). Pastikan route `/api/goal` ter-typecheck dan dashboard merender `ActiveGoalCard`. Tanyakan ke pengguna bila muncul pertanyaan.

- [ ] 5. Cakupan Investasi: prefill dari Active_Goal + hentikan POST goal
  - [ ] 5.1 Ubah `components/investment/GoalForm.tsx`: **hapus** panggilan `POST /api/goal` (dan state `apiError`/`submitting` terkait POST); ganti tombol menjadi aksi lokal yang memvalidasi lalu memanggil `onSubmitted({ targetAmount, horizonYears })`. Sederhanakan `GoalValues` menjadi `{ targetAmount: number; horizonYears: number }`. Pertahankan prefill via prop `initial` dan validasi klien (target > 0; horizon bilangan bulat > 0).
    - _Requirements: 6.1, 7.1, 7.3_
  - [ ] 5.2 Ubah `components/investment/InvestmentWizard.tsx`: pada mount `fetch("/api/goal")` → simpan `activeGoal` (`{ id, name, targetAmount, horizonYears } | null`; gagal/null → form kosong, input manual). Teruskan prefill target/horizon ke `GoalForm` (bergrup ribuan); sesuaikan `handleGoalSubmitted` menerima nilai efektif tanpa `goalId` dari POST; pada perhitungan, `POST /api/recommendation` dengan `goalId: activeGoal?.id ?? undefined` + `targetAmount`/`horizonYears` efektif. Jangan membuat baris `Goal`.
    - _Requirements: 6.1, 6.2, 6.3, 7.1, 7.2, 7.4, 7.5_
  - [ ]* 5.3 Component test: `GoalForm` terprefill dari `Active_Goal` & **tidak** memanggil `POST /api/goal`; `InvestmentWizard` meneruskan `goalId` + target/horizon efektif ke `POST /api/recommendation` dan tetap jalan saat tidak ada `Active_Goal` (input manual).
    - _Requirements: 6.1, 6.2, 7.2, 7.3, 7.4_

- [ ] 6. Cakupan Planner: perluas `GET /api/budget` + prefill form
  - [ ] 6.1 Ubah `app/api/budget/route.ts` `GET`: tambahkan `const active = await getActiveGoal();` dan sertakan `goalTargetAmount: active?.targetAmount ?? null`, `goalHorizonYears: active?.horizonYears ?? null`, `goalName: active?.name ?? null` pada respons di samping field lama (`defaultMonthlyIncome`/`currentSavings`/`monthlyExpense`/`latestPlan`). Pertahankan `runtime = "nodejs"` dan error DB → 500. `POST /api/budget` **tidak** diubah.
    - _Requirements: 8.1, 8.2, 9.2, 9.4_
  - [ ] 6.2 Ubah `components/planner/PlannerWizard.tsx` + `components/planner/BudgetForm.tsx`: `PlannerWizard` membaca `goalTargetAmount`/`goalHorizonYears` dari respons `GET /api/budget` dan meneruskan `defaultTargetAmount`/`defaultHorizonYears` ke `BudgetForm`; `BudgetForm` menambahkan prop tersebut dan menginisialisasi state `targetAmount` (bergrup ribuan) & `horizonYears` bila tersedia (kosong bila null). Pengguna boleh menimpa (override satu kali); validasi & `currentSavings` read-only tidak berubah; `POST /api/budget` tetap sama.
    - _Requirements: 8.3, 8.4, 9.1, 9.3, 9.4_
  - [ ]* 6.3 Integration test: `GET /api/budget` menyertakan `goalTargetAmount`/`goalHorizonYears`/`goalName` saat ada `Active_Goal`; null saat belum ada; field lama tetap ada.
    - _Requirements: 8.1, 8.2_
  - [ ]* 6.4 Component test: `BudgetForm`/`PlannerWizard` terprefill dari nilai tujuan; override satu kali tidak membuat `Goal`.
    - _Requirements: 8.3, 9.1, 9.3, 9.4_

- [ ] 7. Checkpoint akhir — pastikan build & test hijau
  - Jalankan `npm run build` (harus bersih) dan `npm test` (semua hijau, bila ada test). Verifikasi manual singkat lewat automated test bila tersedia: set tujuan dari dashboard → Investasi & Planner terprefill; override di salah satu cakupan tidak mengubah tujuan tersimpan. Tanyakan ke pengguna bila muncul pertanyaan.

## Notes

- Task bertanda `*` bersifat opsional (test) dan boleh dilewati untuk MVP cepat.
- Setiap task mereferensikan requirement spesifik untuk keterlacakan.
- **Tidak ada property-based test** — fitur ini integrasi/persistensi (lihat design → Correctness Properties & Testing Strategy).
- `Active_Goal` = baris `Goal` terbaru; dashboard satu-satunya pembuat `Goal`; override di cakupan bersifat satu kali (tidak mempersistensi `Goal`).
- Migrasi `add_goal_name` bersifat aditif — **jangan** reset DB.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1"] },
    { "id": 1, "tasks": ["2.1", "3.1"] },
    { "id": 2, "tasks": ["2.2", "2.3"] },
    { "id": 3, "tasks": ["2.4", "2.5", "3.2"] },
    { "id": 4, "tasks": ["3.3", "5.1", "6.1"] },
    { "id": 5, "tasks": ["3.4", "5.2", "6.2"] },
    { "id": 6, "tasks": ["5.3", "6.3", "6.4"] }
  ]
}
```
