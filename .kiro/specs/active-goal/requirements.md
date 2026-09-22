# Requirements Document

## Introduction

**Active Goal** (Tujuan Aktif) adalah fitur lintas-cakupan pada aplikasi Financial Planner yang **menyentralisasi satu tujuan keuangan** agar dipakai bersama oleh cakupan **Investasi** dan cakupan **Planner** (kini goal-driven). Saat ini kedua cakupan menanyakan **nominal target + jangka waktu** secara terpisah — input terduplikasi dan aplikasi terasa seperti dua alat yang terputus. Fitur ini menyelesaikannya dengan **satu Tujuan Aktif** yang di-set dan dikelola dari **dashboard**, lalu **dibaca dan diprefill** oleh kedua cakupan.

Prinsip inti:

- **Satu Tujuan Aktif (bukan multi-goal).** Tujuan Aktif = baris `Goal` **terbaru** (`createdAt` desc) — memakai ulang pola "latest wins" yang sudah dipakai `getLatestProfile()`, `InvestmentRecommendation` terbaru, dan `BudgetPlan` terbaru.
- **Dikelola dari dashboard.** Dashboard (`app/page.tsx`) menampilkan kartu "Tujuan aktif" berisi nama (opsional) + nominal target + jangka waktu, dengan aksi set/ubah. Bila belum ada, tampil CTA untuk menetapkan tujuan.
- **Prefill + override satu kali (one-off).** Investasi dan Planner **memprefill** target & horizon dari Tujuan Aktif; pengguna **boleh menimpa** nilai di dalam cakupan sebagai **skenario satu kali** yang **tidak** mengubah Tujuan Aktif yang tersimpan.
- **Set/ubah = baris Goal baru.** Menetapkan/mengubah tujuan dari dashboard membuat **baris `Goal` baru** (yang terbaru menjadi aktif), memakai ulang `POST /api/goal` (diperluas menerima `name` opsional).
- **Reuse, bukan duplikasi.** Memakai ulang model `Goal` yang ada, endpoint `/api/goal`, Prisma singleton (`lib/db.ts`), helper input Rupiah (`lib/format/rupiahInput.ts`), token warna Miami blue, dan format Rupiah `Rp ${Math.round(v).toLocaleString("id-ID")}`.

### Perubahan Perilaku Penting

- **Investasi tidak lagi membuat baris `Goal`.** Sebelumnya `GoalForm` pada alur Investasi mem-`POST /api/goal` pada setiap submit. Mulai fitur ini, **dashboard menjadi satu-satunya tempat `Goal` dibuat**. Alur Investasi hanya **membaca** Tujuan Aktif untuk prefill dan meneruskan nilai (prefilled atau di-override satu kali) langsung ke `POST /api/recommendation` **tanpa** mempersistensi `Goal` baru.
- **Planner memprefill lewat `GET /api/budget`.** `GET /api/budget` diperluas mengembalikan nilai Tujuan Aktif (`goalTargetAmount`, `goalHorizonYears`, `goalName`) agar `BudgetForm` dapat memprefill. Planner sudah tidak mempersistensi `Goal` (menyimpan ke `BudgetPlan`); override tetap satu kali.

### Fokus & Batasan (penting)

- **Tetap satu Tujuan Aktif.** Tidak ada daftar tujuan, halaman manajemen multi-goal, atau penghapusan tujuan pada iterasi ini. Riwayat baris `Goal` lama tetap ada di DB tetapi hanya yang terbaru yang "aktif".
- **Migrasi aditif.** Menambahkan `name String?` (nullable) ke model `Goal` melalui migrasi tambahan (`add_goal_name`), **tanpa reset** database. Baris lama memperoleh `name` = null (tampilan memakai label fallback, mis. "Tujuan").
- **Kedua cakupan tetap berfungsi tanpa Tujuan Aktif.** Bila belum ada Tujuan Aktif, form Investasi/Planner memulai kosong dan mengizinkan **input manual** — tidak diblokir keras.

### Out of Scope / Roadmap
- **Multi-goal / daftar tujuan / halaman manajemen tujuan.** Tetap satu Tujuan Aktif.
- **Menghapus atau menonaktifkan tujuan.** Mengubah tujuan cukup dengan membuat baris terbaru.
- **Autentikasi.** Field `userId` (nullable) tetap sebagai placeholder, konsisten dengan model lain.
- **Menautkan Tujuan Aktif ke `BudgetPlan`/`InvestmentRecommendation` sebagai foreign key wajib.** Relasi tetap longgar (`goalId` opsional seperti sekarang).

### Kriteria Validasi
- Dashboard menampilkan Tujuan Aktif (nama fallback bila null + nominal Rupiah + jangka waktu) bila ada, atau CTA "Tetapkan tujuan" bila belum ada; aksi set/ubah membuat baris `Goal` baru via `POST /api/goal`.
- `POST /api/goal` menerima `name` opsional (di-trim; kosong → null) dan mempertahankan validasi lama (`targetAmount` > 0; `horizonYears` bilangan bulat positif); `GET /api/goal` mengembalikan tujuan terbaru **termasuk** `name`.
- Alur Investasi memprefill target + horizon dari Tujuan Aktif, mengizinkan override satu kali, meneruskan nilai efektif ke `POST /api/recommendation`, dan **tidak** membuat baris `Goal` baru.
- Planner memprefill target + horizon dari nilai Tujuan Aktif yang dikembalikan `GET /api/budget`, mengizinkan override satu kali, dan tetap menyimpan ke `BudgetPlan` tanpa membuat `Goal`.
- Kedua cakupan tetap dapat dipakai (input manual) saat belum ada Tujuan Aktif.
- Seluruh nilai uang diformat Rupiah gaya Indonesia; gaya Miami blue dan disclaimer tetap konsisten dan responsif di viewport mobile.

---

## Glossary

- **Active_Goal**: Tujuan keuangan tunggal yang aktif untuk seluruh aplikasi. Didefinisikan sebagai baris `Goal` **terbaru** (`orderBy createdAt desc`). Menjadi sumber prefill target + horizon bagi cakupan Investasi dan Planner.
- **Goal**: Model Prisma yang sudah ada (`id`, `userId String?`, `targetAmount Float`, `horizonYears Int`, `createdAt`) — pada fitur ini **diperluas** dengan `name String?` (opsional).
- **Goal_Name**: Label opsional untuk `Active_Goal` (mis. "Beli Rumah"). Field `name String?` pada `Goal`; bernilai null bila tidak diisi. Saat null, tampilan memakai **label fallback** (mis. "Tujuan").
- **Target_Amount**: Nominal Rupiah tujuan (`Goal.targetAmount`). Berhingga > 0.
- **Horizon_Years**: Jangka waktu tujuan dalam tahun (`Goal.horizonYears`). Bilangan bulat positif.
- **Get_Active_Goal**: Pembaca server-side Tujuan Aktif — helper `getActiveGoal()` (mengikuti pola `getLatestProfile()`) yang mengambil baris `Goal` terbaru dari DB via Prisma singleton, atau null bila belum ada.
- **Dashboard**: Halaman utama `app/page.tsx` (server component, `dynamic = "force-dynamic"`) — satu-satunya tempat `Active_Goal` ditetapkan/diubah.
- **Active_Goal_Card**: Komponen UI pada dashboard yang menampilkan `Active_Goal` (nama/fallback + `Target_Amount` Rupiah + `Horizon_Years`) dengan aksi set/ubah, atau CTA "Tetapkan tujuan" bila belum ada.
- **Goal_Editor**: Form (klien) untuk menetapkan/mengubah tujuan dari dashboard — field `name` (opsional), `targetAmount` (Rupiah, pemisah ribuan), `horizonYears` (bilangan bulat tahun) — yang mem-`POST /api/goal`.
- **Prefill**: Pengisian awal field target + horizon (dan konteks nama) sebuah form cakupan dari nilai `Active_Goal`, sebelum pengguna berinteraksi.
- **One_Off_Override**: Penimpaan nilai target/horizon yang telah diprefill, di dalam sebuah cakupan, yang **hanya berlaku untuk perhitungan skenario saat itu** dan **tidak** mengubah/memperbarui `Active_Goal` yang tersimpan.
- **Investment_Scope**: Cakupan Investasi (`app/investment/page.tsx` + `InvestmentWizard`: GoalForm → RiskSurvey → RecommendationCard).
- **Planner_Scope**: Cakupan Planner goal-driven (`app/planner/page.tsx` + `PlannerWizard`: BudgetForm → BudgetResultCard).
- **Profile_Gate**: Mekanisme guard server-side (sudah ada) yang mengarahkan pengguna ke `/profile` bila `FinancialProfile` belum ada. Membungkus cakupan Investasi & Planner (tidak diubah fitur ini).

---

## Requirements

### Requirement 1: Perluasan Model Goal dengan Nama Opsional (Migrasi Aditif)

**User Story:** Sebagai pengguna, saya ingin dapat memberi label nama pada tujuan saya (mis. "Beli Rumah"), sehingga tujuan aktif lebih mudah dikenali di dashboard.

#### Acceptance Criteria
1. THE Goal SHALL menyertakan field opsional `name` bertipe string yang boleh bernilai null.
2. WHEN migrasi database untuk field `name` dijalankan, THE sistem SHALL menerapkannya sebagai migrasi tambahan bernama `add_goal_name` tanpa mereset data yang sudah ada.
3. WHERE sebuah baris `Goal` sudah ada sebelum migrasi, THE sistem SHALL menetapkan `name` baris tersebut bernilai null.
4. THE sistem SHALL menggunakan Prisma Client singleton (`lib/db.ts`) yang sama untuk seluruh operasi database `Goal`.

### Requirement 2: Penyimpanan Goal dengan Nama Opsional (POST /api/goal)

**User Story:** Sebagai pengguna, saya ingin menyimpan tujuan beserta nama opsionalnya, sehingga tujuan aktif tersimpan lengkap dengan labelnya.

#### Acceptance Criteria
1. WHEN pengguna mengirim `POST /api/goal` dengan field `name` berupa string, THE sistem SHALL menyimpan `name` yang sudah di-trim pada baris `Goal` baru.
2. IF field `name` tidak disertakan atau setelah di-trim menjadi string kosong, THEN THE sistem SHALL menyimpan `name` bernilai null.
3. IF `targetAmount` bukan angka berhingga yang lebih besar dari 0, THEN THE sistem SHALL menolak permintaan dan mengembalikan pesan validasi dengan status 400.
4. IF `horizonYears` bukan bilangan bulat berhingga yang lebih besar dari 0, THEN THE sistem SHALL menolak permintaan dan mengembalikan pesan validasi dengan status 400.
5. WHEN penyimpanan berhasil, THE sistem SHALL mengembalikan baris `Goal` yang dibuat termasuk `id`, `targetAmount`, `horizonYears`, dan `name` dengan status 201.
6. IF operasi database gagal, THEN THE sistem SHALL mengembalikan respons error yang ramah pengguna dengan status 500 tanpa mengekspos detail internal.
7. THE sistem SHALL memperlakukan setiap `POST /api/goal` yang berhasil sebagai pembuatan baris `Goal` baru, sehingga baris terbaru menjadi `Active_Goal`.

### Requirement 3: Pengambilan Tujuan Aktif (GET /api/goal & getActiveGoal)

**User Story:** Sebagai pengembang, saya ingin satu sumber tunggal untuk membaca tujuan aktif, sehingga dashboard dan kedua cakupan konsisten membaca tujuan yang sama.

#### Acceptance Criteria
1. WHEN `GET /api/goal` dipanggil, THE sistem SHALL mengembalikan baris `Goal` terbaru berdasarkan `createdAt` desc, termasuk field `name`, atau null bila belum ada tujuan.
2. THE sistem SHALL menyediakan pembaca server-side `getActiveGoal()` yang mengembalikan baris `Goal` terbaru berdasarkan `createdAt` desc atau null bila belum ada, mengikuti pola `getLatestProfile()`.
3. THE `getActiveGoal()` SHALL menggunakan Prisma Client singleton (`lib/db.ts`) tanpa dependensi lapisan UI atau API.
4. IF operasi database gagal saat `GET /api/goal`, THEN THE sistem SHALL mengembalikan respons error yang ramah pengguna dengan status 500.

### Requirement 4: Kartu Tujuan Aktif pada Dashboard

**User Story:** Sebagai pengguna, saya ingin melihat tujuan aktif saya di dashboard, sehingga saya tahu tujuan yang sedang dipakai kedua cakupan.

#### Acceptance Criteria
1. WHEN dashboard dimuat DAN `Active_Goal` tersedia, THE Active_Goal_Card SHALL menampilkan nama tujuan, `Target_Amount` dalam format Rupiah, dan `Horizon_Years`.
2. WHERE `Active_Goal` memiliki `name` bernilai null, THE Active_Goal_Card SHALL menampilkan label fallback alih-alih nama kosong.
3. WHEN dashboard dimuat DAN `Active_Goal` tersedia, THE Active_Goal_Card SHALL menampilkan aksi untuk mengubah tujuan.
4. WHEN dashboard dimuat DAN belum ada `Active_Goal`, THE Active_Goal_Card SHALL menampilkan CTA untuk menetapkan tujuan.
5. THE Dashboard SHALL membaca `Active_Goal` secara server-side melalui `getActiveGoal()`.
6. THE Active_Goal_Card SHALL memformat seluruh nilai uang sebagai Rupiah gaya Indonesia dengan pola `Rp ${Math.round(v).toLocaleString("id-ID")}`.

### Requirement 5: Set/Ubah Tujuan dari Dashboard (Goal Editor)

**User Story:** Sebagai pengguna, saya ingin menetapkan atau mengubah tujuan aktif langsung dari dashboard, sehingga saya dapat mengelola tujuan di satu tempat.

#### Acceptance Criteria
1. THE Goal_Editor SHALL menyediakan field `name` (opsional), `targetAmount` (Rupiah dengan pemisah ribuan), dan `horizonYears` (bilangan bulat tahun).
2. WHEN pengguna menyimpan Goal_Editor dengan input valid, THE sistem SHALL mengirim `POST /api/goal` berisi `name`, `targetAmount`, dan `horizonYears`.
3. IF `targetAmount` yang diisi bukan angka lebih besar dari 0, THEN THE Goal_Editor SHALL mencegah pengiriman dan menampilkan pesan validasi.
4. IF `horizonYears` yang diisi bukan bilangan bulat lebih besar dari 0, THEN THE Goal_Editor SHALL mencegah pengiriman dan menampilkan pesan validasi.
5. WHEN penyimpanan berhasil, THE Dashboard SHALL menampilkan nilai `Active_Goal` yang terbaru.
6. IF penyimpanan gagal, THEN THE Goal_Editor SHALL menampilkan pesan error yang ramah tanpa kehilangan input pengguna.
7. THE Goal_Editor SHALL menggunakan helper input Rupiah `lib/format/rupiahInput.ts` (`formatThousands`/`parseThousands`) untuk field `targetAmount`.

### Requirement 6: Prefill Tujuan Aktif pada Cakupan Investasi

**User Story:** Sebagai pengguna, saya ingin cakupan Investasi otomatis terisi dari tujuan aktif saya, sehingga saya tidak perlu memasukkan target dan jangka waktu dua kali.

#### Acceptance Criteria
1. WHEN pengguna memasuki Investment_Scope DAN `Active_Goal` tersedia, THE Investment_Scope SHALL memprefill field `Target_Amount` dan `Horizon_Years` dari `Active_Goal`.
2. WHEN pengguna memasuki Investment_Scope DAN belum ada `Active_Goal`, THE Investment_Scope SHALL menampilkan field kosong dan mengizinkan input manual tanpa memblokir alur.
3. THE Investment_Scope SHALL membaca `Active_Goal` melalui sumber tunggal yang sama (`GET /api/goal` atau `getActiveGoal()`).

### Requirement 7: Override Satu Kali pada Cakupan Investasi (Tanpa Membuat Goal Baru)

**User Story:** Sebagai pengguna, saya ingin dapat menimpa target atau jangka waktu di dalam Investasi untuk satu skenario, tanpa mengubah tujuan aktif yang tersimpan.

#### Acceptance Criteria
1. WHERE pengguna menimpa `Target_Amount` atau `Horizon_Years` yang telah diprefill di Investment_Scope, THE Investment_Scope SHALL menggunakan nilai yang di-override untuk perhitungan rekomendasi saat itu.
2. WHEN Investment_Scope menghitung rekomendasi, THE Investment_Scope SHALL meneruskan `targetAmount` dan `horizonYears` efektif (prefilled atau di-override) langsung ke `POST /api/recommendation`.
3. THE Investment_Scope SHALL TIDAK membuat baris `Goal` baru saat menghitung rekomendasi.
4. WHERE `Active_Goal` tersedia, THE Investment_Scope MAY meneruskan `id` `Active_Goal` sebagai `goalId` opsional ke `POST /api/recommendation`.
5. WHEN pengguna melakukan `One_Off_Override` di Investment_Scope, THE sistem SHALL menjaga nilai `Active_Goal` yang tersimpan tetap tidak berubah.

### Requirement 8: Prefill Tujuan Aktif pada Cakupan Planner (via GET /api/budget)

**User Story:** Sebagai pengguna, saya ingin cakupan Planner otomatis terisi dari tujuan aktif saya, sehingga target dan jangka waktu tidak perlu saya masukkan lagi.

#### Acceptance Criteria
1. WHEN `GET /api/budget` dipanggil DAN `Active_Goal` tersedia, THE sistem SHALL menyertakan `goalTargetAmount`, `goalHorizonYears`, dan `goalName` dari `Active_Goal` pada respons.
2. WHEN `GET /api/budget` dipanggil DAN belum ada `Active_Goal`, THE sistem SHALL menyertakan `goalTargetAmount`, `goalHorizonYears`, dan `goalName` bernilai null pada respons.
3. WHEN pengguna memasuki Planner_Scope DAN nilai `Active_Goal` tersedia dari `GET /api/budget`, THE Planner_Scope SHALL memprefill field `Target_Amount` dan `Horizon_Years` dari nilai tersebut.
4. WHEN pengguna memasuki Planner_Scope DAN belum ada `Active_Goal`, THE Planner_Scope SHALL menampilkan field target dan horizon kosong dan mengizinkan input manual tanpa memblokir alur.

### Requirement 9: Override Satu Kali pada Cakupan Planner

**User Story:** Sebagai pengguna, saya ingin dapat menimpa target atau jangka waktu di dalam Planner untuk satu skenario, tanpa mengubah tujuan aktif yang tersimpan.

#### Acceptance Criteria
1. WHERE pengguna menimpa `Target_Amount` atau `Horizon_Years` yang telah diprefill di Planner_Scope, THE Planner_Scope SHALL menggunakan nilai yang di-override untuk perhitungan anggaran saat itu.
2. WHEN Planner_Scope menghitung anggaran, THE Planner_Scope SHALL meneruskan `monthlyIncome`, `targetAmount`, dan `horizonYears` efektif ke `POST /api/budget` seperti kontrak yang sudah ada.
3. WHEN pengguna melakukan `One_Off_Override` di Planner_Scope, THE sistem SHALL menjaga nilai `Active_Goal` yang tersimpan tetap tidak berubah.
4. THE Planner_Scope SHALL TIDAK membuat baris `Goal` baru saat menghitung anggaran.

### Requirement 10: Konsistensi Persistensi, Validasi, dan Gaya Visual

**User Story:** Sebagai pengguna, saya ingin fitur tujuan aktif terasa menyatu dengan aplikasi, sehingga pengalaman tetap konsisten dan aman.

#### Acceptance Criteria
1. THE fitur Active_Goal SHALL memakai ulang validasi `Goal` yang sudah ada (`targetAmount` berhingga > 0; `horizonYears` bilangan bulat > 0) di sisi API.
2. THE Active_Goal_Card, Goal_Editor, Investment_Scope, dan Planner_Scope SHALL menggunakan token warna aksen Miami blue yang sudah ada (`--accent`, `--accent-2`, `--accent-soft`).
3. THE fitur Active_Goal SHALL memformat seluruh nilai uang sebagai Rupiah gaya Indonesia dengan pola `Rp ${Math.round(v).toLocaleString("id-ID")}`.
4. WHEN aplikasi dibuka di viewport mobile, THE Active_Goal_Card dan Goal_Editor SHALL menjaga tampilan tetap terbaca.
5. THE fitur Active_Goal SHALL mempertahankan `Profile_Gate` pada cakupan Investasi dan Planner tanpa mengubah perilaku guard.
