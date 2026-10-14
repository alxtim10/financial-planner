# Dokumentasi Financial Planner

> **Dokumen otoritatif arah produk.** File ini adalah sumber kebenaran utama untuk arah produk Financial Planner saat ini. Dokumen lama (`PRD.md`, `DESIGN.md`, `REQUIREMENTS.md`, `TASKS.md`) mendeskripsikan **fitur chatbot pelengkap** dari fase PoC dan tetap valid untuk bagian tersebut, tetapi tidak lagi merepresentasikan arah keseluruhan produk.

---

## 1. Ringkasan Produk

**Financial Planner** adalah aplikasi web (Next.js App Router) untuk perencanaan keuangan personal yang terstruktur. Arah produk telah bergeser:

- **Dulu (PoC):** aplikasi = chatbot konsultasi keuangan berbasis Gemini (halaman penuh).
- **Sekarang:** aplikasi utama = **perencana keuangan terstruktur**. Chatbot menjadi **fitur pelengkap (complementary)** yang dikemas sebagai panel drawer geser dari kanan, tersedia di semua halaman.

**Fokus MVP: cakupan Investasi (Investment scope) saja.** Alur berpandu membawa pengguna dari kondisi keuangan mereka menuju rekomendasi alokasi investasi yang konkret dan proyeksi kontribusi bulanan.

### Alur inti MVP
0. **Login** (gate autentikasi): pengguna masuk dengan username + password (auth demo; akun dibuat lewat seed, lihat §3.1). Tanpa login, semua halaman mengarahkan ke `/login` dan API membalas `401`.
1. **Profil Finansial** (gate wajib): pengguna mengisi pemasukan bulanan, pengeluaran bulanan, dan tabungan saat ini. Field pengeluaran diberi catatan agar menyertakan utang/angsuran dan membagi rata pengeluaran non-bulanan (mis. pajak kendaraan tahunan ÷ 12). Tanpa profil ini, cakupan Investasi terkunci.
2. **Tujuan (Goal):** nominal target + jangka waktu **dalam bulan** (mis. Rp 100.000.000 dalam 60 bulan). Horizon diturunkan dari jangka waktu.
3. **Profil Risiko:** survei singkat → skor → klasifikasi `Konservatif` / `Moderat` / `Agresif`.
4. **Rekomendasi:** sistem menghitung alokasi berbasis aturan (matriks Horizon × Profil Risiko) + kontribusi bulanan yang diperlukan (Future Value of Annuity).

Rekomendasi angka bersifat **rule-based dan deterministik** — bukan hasil LLM. Chatbot AI hanya untuk konsultasi naratif.

---

## 2. Arsitektur

```mermaid
flowchart TD
    subgraph Client
        Dash[app/page.tsx - Dashboard]
        Prof[app/profile - Financial Profile]
        Inv[app/investment - Goal > Survei > Rekomendasi]
        Drawer[ChatDrawer - di layout, semua halaman]
    end

    subgraph API
        AProf[/api/profile/]
        AGoal[/api/goal/]
        ARec[/api/recommendation/]
        AChat[/api/chat - TIDAK BERUBAH/]
    end

    subgraph Logic[lib/investment - pure functions]
        Alloc[allocation.ts]
        Proj[projection.ts]
        Risk[riskScoring.ts]
    end

    Prof --> AProf --> DB[(Supabase PostgreSQL / Prisma)]
    Inv --> AGoal --> DB
    Inv --> ARec
    ARec --> Risk
    ARec --> Alloc
    ARec --> Proj
    ARec --> DB
    Drawer --> AChat --> Gemini[Gemini API - streaming]
    Gate{{Profile Gate}} -.blokir tanpa profil.-> Inv
```

### Stack teknologi (dipertahankan)
- **Framework:** Next.js 16 (App Router), React 19, TypeScript.
- **Styling:** Tailwind CSS v4.
- **AI (chatbot):** `@google/genai` (streaming, runtime Node.js).
- **UI utilitas:** `lucide-react`, `react-markdown`, `remark-gfm`.

### Tambahan untuk arah baru
- **Database:** Supabase (PostgreSQL ter-host).
- **ORM:** Prisma (`prisma`, `@prisma/client`), singleton client di `lib/db.ts`.
- **Test runner:** Vitest (dikonfigurasi untuk logika murni `lib/*`). Saat ini hanya ada smoke test (`lib/smoke.test.ts`); belum ada suite unit/PBT khusus.

### Asumsi Database
Database di-host di **Supabase**. Prisma memakai dua koneksi (pola standar Supabase):
```
# Pooled (PgBouncer, port 6543) — runtime aplikasi
DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true"
# Langsung (port 5432) — migrasi Prisma
DIRECT_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres"
```
- Datasource Prisma memakai `url = env("DATABASE_URL")` (pooled) + `directUrl = env("DIRECT_URL")` (langsung untuk migrasi).
- **Auth demo** butuh `AUTH_SECRET` (wajib, min. 16 karakter — penandatangan JWT session). Opsional `SEED_USERNAME`/`SEED_PASSWORD` untuk kredensial akun demo (default `demo`/`demo1234`).
- **Rate limit chat** opsional `CHAT_DAILY_LIMIT` (batas pesan chat AI per pengguna per hari; default 30).
- **Dashboard analitik** opsional `ADMIN_USERNAME` (username yang boleh akses `/admin/analytics`; kosong = semua pengguna login dianggap admin saat demo).
- String koneksi diambil dari Supabase Dashboard → Project Settings → Database → Connection string; ganti `[PROJECT-REF]`, `[PASSWORD]`, `[REGION]`.
- Skema & tabel dibuat lewat Prisma `migrate deploy` (produksi) / `migrate dev` (pengembangan) — bukan `createdb` lokal lagi.
- Bila koneksi gagal karena kredensial/izin, hentikan dan konfirmasi ke pemilik proyek — jangan memaksa.

---

## 3. Model Data

Delapan model Prisma. Model data keuangan menyertakan `userId` (kolom DB tetap nullable agar migrasi aditif aman), tetapi **sejak fitur auth demo, runtime SELALU mengisi `userId` dari session** dan **semua pembacaan difilter `where: { userId }`** — tidak ada lagi state global yang dibagikan antar-pengguna.

| Model | Field inti | Peran |
|---|---|---|
| `User` | `username` (unik), `passwordHash` | Akun login (auth demo). Password di-hash scrypt. |
| `FinancialProfile` | `income`, `expense`, `currentSavings` | Sumber kebenaran kondisi keuangan; gate wajib. |
| `Goal` | `name?`, `targetAmount`, `horizonMonths` | Tujuan Aktif: nama opsional + target + jangka waktu (bulan); sumber Horizon. |
| `RiskAssessment` | `answers`, `score`, `profile` | Hasil survei risiko + klasifikasi. |
| `InvestmentRecommendation` | `goalId?`, `riskProfile`, `composition` (Json), `annualReturn`, `monthlyContribution` | Rekomendasi akhir yang dipersistensi. |
| `BudgetPlan` | `presetId`, `baseAmount`, `mode`, `savingsTargetAmount?`, `savingsHorizonMonths?`, `breakdown` (Json) | Rencana anggaran goal-driven (Planner). Beberapa kolom lama (`manualSavingsTarget`, `includeSavings`, `investmentContribution`) dipensiunkan tetapi dipertahankan. |
| `ChatUsage` | `userId`, `day`, `count` | Kuota harian chat AI per pengguna (rate limiting). Unik per `(userId, day)`. `day` = `"YYYY-MM-DD"` UTC. |
| `AnalyticsEvent` | `userId`, `event`, `metadata?` (Json) | Event funnel (profil → tujuan → rekomendasi → konsultan/chat). |

`FinancialProfile` adalah model terpusat: Planner dan integrasi chatbot membacanya sebagai konteks pengguna (kini ter-scope per `userId`).

### 3.2 Rate limiting chat AI (ChatUsage)

Chat AI dibatasi **per pengguna per hari** agar biaya Gemini terkendali & mencegah abuse. Hitungan disimpan di DB (`ChatUsage`), bukan in-memory, agar konsisten lintas instance runtime.

- Batas harian dari env `CHAT_DAILY_LIMIT` (default **30**; nilai `≤ 0`/invalid jatuh ke default). Helper di `lib/chat/usage.ts` (`dailyLimit`, `todayKey` UTC, `getUsageStatus`, `incrementUsage` upsert atomik).
- `POST /api/chat` kini **wajib login** (`401` bila belum). Bila kuota habis → **`429`** dengan pesan ramah ID (tanpa memanggil Gemini). Hitungan `+1` **hanya setelah sesi stream berhasil dimulai** (init gagal tidak memakan kuota); increment bersifat fire-and-forget (kegagalan hanya di-log).

### 3.3 Analitik funnel (AnalyticsEvent)

Instrumentasi funnel untuk mengukur niat-ke-konversi (metrik kunci dari analisis bisnis). Event ter-scope `userId` dari session.

- Nama event kanonik (`lib/analytics/events.ts`): `profile_completed`, `goal_set`, `recommendation_generated`, `budget_computed`, `consultant_contact_clicked`, `chat_opened`.
- **Server-side** (dicatat langsung di route via `lib/analytics/track.ts` → `trackEvent`, fire-and-forget): `profile_completed`, `goal_set`, `recommendation_generated`, `budget_computed`.
- **Client-side** (via `POST /api/events` → `lib/analytics/client.ts` → `trackClientEvent`, `fetch keepalive`): `consultant_contact_clicked` (tombol kontak konsultan), `chat_opened` (drawer chat dibuka).
- `POST /api/events`: tanpa login → `401`; nama event di luar daftar kanonik → `400`; sukses → `204`. Pencatatan tidak boleh memblokir UX.

**Dashboard analitik (pemilik produk).** Halaman `/admin/analytics` (`app/admin/analytics/page.tsx`, server) mengagregasi `AnalyticsEvent` **lintas semua pengguna** lewat pure function `computeFunnel` (`lib/analytics/funnel.ts`): pengguna unik per tahap funnel (`profile_completed → goal_set → recommendation_generated`) + conversion rate antar tahap, metrik "niat" (anggaran dihitung, klik konsultan, buka chat), dan total kejadian per event. Agregasi dilakukan di memori (volume demo kecil; bila besar → ganti `COUNT(DISTINCT)` SQL, pure function tetap jadi kontrak).

**Gate admin.** Halaman wajib login lalu dibatasi `isAdmin(username)` (`lib/auth/session.ts`): bila env `ADMIN_USERNAME` diset, hanya username itu; bila kosong, semua pengguna login dianggap admin (cukup untuk demo — perketat sebelum produksi, idealnya kolom role di `User`). Kartu nav "Analitik Funnel" di dashboard hanya tampil untuk admin.

### 3.1 Autentikasi (auth demo — username + password)

Auth sederhana untuk demo app, tanpa dependency tambahan (hanya Node `crypto`):

- **Kredensial:** username + password. Password disimpan sebagai hash **scrypt** (`lib/auth/password.ts`, format `scrypt$salt$hash`, verifikasi waktu-konstan).
- **Session:** **JWT HS256** ditandatangani HMAC dengan `AUTH_SECRET`, disimpan di **cookie HTTP-only** `session` (`SameSite=Lax`, `Secure` di produksi, TTL 7 hari). Helper di `lib/auth/jwt.ts` (`signSession`/`verifySession`) & `lib/auth/session.ts` (`setSessionCookie`/`clearSessionCookie`/`getCurrentUserId`/`requireUserId`). Stateless — tanpa tabel session.
- **Isolasi data:** semua API route (`/api/profile`, `/api/goal`, `/api/recommendation`, `/api/budget`) mengambil `userId` **dari session**, bukan dari body (body `userId` dihapus — dulu bisa dipalsukan klien). Pembacaan server-side (`getLatestProfile(userId)`, `getActiveGoal(userId)`, `getFinancialTwinContext()`) difilter per `userId`. Tanpa session → API balas `401`, halaman redirect ke `/login`.
- **Tanpa registrasi mandiri:** akun dibuat lewat **seed** (`prisma/seed.ts`). Default `demo` / `demo1234` (dapat diubah via env `SEED_USERNAME`/`SEED_PASSWORD`). Seed juga **mengadopsi baris data lama** (`userId = null`) ke akun demo agar tetap terlihat setelah login.
- **Batas (disengaja, karena demo):** belum ada registrasi mandiri, reset password, rate limiting login, atau CSRF token khusus.

---

## 4. Cakupan Investasi (MVP) — Detail

### 4.1 Matriks Alokasi (inti mesin aturan)

| Horizon | Profil Risiko | Komposisi | Est. Return Tahunan |
|---|---|---|---|
| < 2 Tahun | Semua | 100% RDPU | 4,75% |
| 2–5 Tahun | Konservatif | 70% RDPU + 30% SBN/Deposito | 5,5% |
| 2–5 Tahun | Moderat | 50% RDPU + 50% Emas/SBN Ritel | 6,5% |
| 2–5 Tahun | Agresif | 30% RDPU + 40% SBN/RDPT + 30% Emas | 7,5% |
| > 5 Tahun | Konservatif | 50% SBN/RDPT + 30% Emas + 20% Saham | 7,0% |
| > 5 Tahun | Moderat | 40% Saham/Indeks + 40% SBN + 20% Emas | 9,5% |
| > 5 Tahun | Agresif | 70% Saham/Indeks + 20% SBN + 10% Emas | 11,0% |

**Aturan bucket horizon** (jangka waktu dinyatakan dalam **bulan**; ambang setara aturan tahun × 12):
- `horizonMonths < 24` → bucket `<2` (**mengabaikan** profil risiko).
- `24 ≤ horizonMonths ≤ 60` → bucket `2-5`.
- `horizonMonths > 60` → bucket `>5`.

Implementasi: `lib/investment/allocation.ts` → `getAllocation(horizonMonths, riskProfile)`. Total persentase komposisi selalu 100%. Input tidak valid (profil di luar himpunan atau horizon non-positif) melempar error.

Pada kartu hasil (`components/investment/RecommendationCard.tsx`), tiap instrumen dilengkapi tombol info ("i") berisi penjelasan singkat ramah-pemula (mis. RDPU, SBN, Emas, Saham), karena target pengguna adalah orang yang belum tentu paham instrumen investasi.

### 4.2 Kontribusi Bulanan (Future Value of Annuity)

```
PMT = (FV − PV·(1+i)^n) · i / ((1+i)^n − 1)
```
- `FV` = nominal target Goal.
- `PV` = tabungan saat ini (dari Financial Profile).
- `i` = estimasi return tahunan / 12 (bunga bulanan).
- `n` = horizon dalam bulan (`= horizonMonths`).
- **Fallback:** saat `i = 0`, gunakan linear `(FV − PV) / n`.
- Hasil dibatasi minimum `0` (bila tabungan sudah cukup).

Implementasi: `lib/investment/projection.ts` → `calculateMonthlyContribution(input)`.

**Contoh:** Target FV = Rp 100.000.000, tabungan PV = Rp 10.000.000, horizon 60 bulan, profil Moderat 2–5 tahun (return 6,5%).
- `i = 0,065 / 12 ≈ 0,0054167`
- `n = 60` (bulan)
- `(1+i)^n ≈ 1,3829`
- `PV·(1+i)^n ≈ 10.000.000 × 1,3829 ≈ 13.829.000`
- Pembilang: `(100.000.000 − 13.829.000) × 0,0054167 ≈ 466.760`
- Penyebut: `1,3829 − 1 = 0,3829`
- `PMT ≈ 466.760 / 0,3829 ≈ Rp 1.219.000 per bulan` (perkiraan; angka pasti diverifikasi oleh test).

Sebagai perbandingan, tanpa pertumbuhan (`i = 0`): `(100.000.000 − 10.000.000) / 60 = Rp 1.500.000 per bulan`. Pertumbuhan investasi menurunkan setoran bulanan yang diperlukan.

### 4.3 Chatbot Pelengkap (Drawer)

Chatbot Gemini yang ada tetap sama secara logika (`POST /api/chat`, `lib/prompt.ts`, `types/chat.ts`, streaming, sentinel `[[STREAM_ERROR]]`). Perubahannya hanya **pengemasan UI**: dari halaman penuh menjadi panel drawer geser dari kanan (`components/ChatDrawer.tsx`), dipicu ikon di sudut kanan atas, di-mount di `app/layout.tsx` sehingga tersedia di semua halaman. Detail lengkap fitur chatbot ada di `DESIGN.md` dan `REQUIREMENTS.md`.

---

## 5. Roadmap & Cakupan Berikutnya

Bagian ini adalah arah setelah MVP. Fondasinya sudah disiapkan agar mudah dibangun tanpa duplikasi.

### 5.1 Planner — Goal-Driven Budget Planner (arah aktif; model preset/persentase disuperseksi)
Cakupan **Planner** memiliki spesifikasi formal di `.kiro/specs/budget-planner/` (requirements, design, tasks). **Arah aktif saat ini: model _goal-driven_ (berbasis tujuan), Requirements 17–21.** Pengguna memberi tujuan dan sistem menghitung berapa yang harus ditabung — kebalikan dari model lama.

> **Pivot arah (Iterasi Goal-Driven).** Model lama **preset/persentase-driven** (Requirements 1–16: pilih preset 50/30/20 · 70/20/10 · 80/20 · Custom, mode terpisah/kombinasi + shortfall, proyeksi target tabungan Arah A/B, present value/Include_Savings) **DISUPERSEKSI** dan tidak lagi menjadi arah aktif. Dulu pengguna memilih **persentase** dan target hanya efek samping; sekarang alurnya **dibalik**: pengguna memberi tujuan, sistem menghitung tabungan bulanan, dan **persentase menjadi OUTPUT**.

Keputusan cakupan goal-driven (final):
- **Input (semua wajib):** `monthlyIncome` (default dari `income` `FinancialProfile`, dapat ditimpa), `currentSavings` (dari `FinancialProfile`, **selalu** dihitung sebagai saldo awal — tanpa toggle), `targetAmount` (nominal target), dan `horizonMonths` (jangka waktu dalam bulan, **wajib**).
- **Perhitungan (akumulasi murni, tanpa bunga/pertumbuhan):**
  - `monthsN = horizonMonths`.
  - **`ditabung` (dihitung sistem)** `= max(0, (targetAmount − currentSavings)) ÷ monthsN`. Bila `currentSavings ≥ targetAmount` → **sudah tercapai** (`ditabung = 0`, status `alreadyReached`).
  - **`kebutuhan`** dari `expense` `FinancialProfile`; bila `expense` 0/tidak valid/tidak ada → **rasio fallback** `round(0.65 × (monthlyIncome − ditabung))`.
  - **`keinginan`** `= monthlyIncome − ditabung − kebutuhan`.
  - **Persentase turunan (OUTPUT):** tiap pos `÷ monthlyIncome × 100` (kebutuhan% / keinginan% / ditabung%). Bukan input.
- **Penilaian kelayakan (feasibility):** `impossible` bila `ditabung` saja melebihi `monthlyIncome` (peringatan terkuat); `tight` bila `ditabung + kebutuhan > monthlyIncome` atau `keinginan` sangat kecil (< 5% pemasukan) — dengan saran memperpanjang jangka waktu atau menurunkan target; `ok` bila sehat (tampilkan tiga pos tanpa peringatan).
- **Dihapus dari alur (dibanding model lama):** 3 preset tetap, mode persentase Custom, `PresetPicker`, mode `terpisah`/`kombinasi` + shortfall, toggle `Include_Savings` (tabungan saat ini kini selalu saldo awal), dan cabang "Arah A time-to-goal" (horizon kini selalu diberikan). Persentase tidak pernah menjadi input. Catatan: komponen/modul lama tersebut **dipensiunkan tetapi masih ada di repo** (tidak dipakai alur goal-driven) — tidak dihapus fisik agar tidak perlu migrasi/pembersihan destruktif.
- **Logika murni** di `lib/planner/goalBudget.ts` (`computeGoalBudget`) — akumulasi murni, tanpa I/O/UI/DB. Modul lama `presets.ts`/`budget.ts`/`savingsProjection.ts` dan komponen `PresetPicker.tsx` **dipensiunkan tetapi dipertahankan** di repo (tak dipakai UI/API goal-driven).
- **Persistensi** ke `BudgetPlan` dengan **reuse kolom** yang sudah ada: `presetId = "goal"` (penanda), `baseAmount = monthlyIncome`, `savingsTargetAmount = targetAmount`, `savingsHorizonMonths = horizonMonths`, `breakdown` = ketiga pos (Json); `mode` diisi `"goal"`, `includeSavings`/`investmentContribution` null. Endpoint `GET /api/budget` mengembalikan `defaultMonthlyIncome` + `currentSavings` + `monthlyExpense` (+ `goalTargetAmount`/`goalHorizonMonths`/`goalName` dari Tujuan Aktif); `POST /api/budget` menerima `{ monthlyIncome, monthlyExpense?, targetAmount, horizonMonths, userId? }`.
- **Reuse pola yang ada:** `Profile_Gate` (gate wajib), Prisma singleton (`lib/db.ts`), helper input Rupiah (`lib/format/rupiahInput.ts`), pola visual `RecommendationCard`, token warna Miami blue, format Rupiah `Rp ${Math.round(v).toLocaleString("id-ID")}`, dan disclaimer edukatif. UI disederhanakan menjadi form (Tujuan & Pendapatan) → hasil.

**Kontrak data yang dikonsumsi:** `income`, `expense`, dan `currentSavings` dari `FinancialProfile` terbaru menjadi masukan `computeGoalBudget` (income sebagai default `monthlyIncome`; expense sebagai `kebutuhan`; currentSavings sebagai saldo awal).

**Sisa roadmap Planner:** pencatatan transaksi harian, cash-flow bulanan, dan riwayat multi-anggaran.

### 5.1.1 Tujuan Aktif Tersentralisasi (Active Goal) — masukan bersama Investasi & Planner
Cakupan **Active Goal** memiliki spesifikasi formal di `.kiro/specs/active-goal/` (requirements, design, tasks). Fitur ini **menyentralisasi satu tujuan keuangan** agar dipakai bersama oleh cakupan Investasi dan Planner (kini goal-driven), menggantikan input "target + jangka waktu" yang sebelumnya diminta terpisah di masing-masing cakupan.

Keputusan cakupan (final):
- **Satu Tujuan Aktif (bukan multi-goal).** `Active_Goal` = baris `Goal` **terbaru** (`createdAt` desc) — pola "latest wins" yang sama dengan `getLatestProfile()`.
- **Dikelola dari dashboard.** `app/page.tsx` menampilkan kartu **"Tujuan aktif"** (`components/goal/ActiveGoalCard.tsx`) berisi nama (opsional) + `targetAmount` (Rupiah) + `horizonMonths`, dengan aksi **Ubah tujuan**; bila belum ada → CTA **Tetapkan tujuan**. Editor (`components/goal/GoalEditor.tsx`) mem-`POST /api/goal`. Dashboard adalah **satu-satunya tempat `Goal` dibuat**.
- **Migrasi aditif `name`.** Model `Goal` diperluas dengan `name String?` (nullable) lewat migrasi tambahan `add_goal_name` — **tanpa reset**. Baris lama memperoleh `name = null` (tampilan memakai label fallback, mis. "Tujuan").
- **Satuan jangka waktu = BULAN.** Sejak migrasi `horizon_years_to_months`, kolom `Goal.horizonYears`→`Goal.horizonMonths` dan `BudgetPlan.savingsHorizonYears`→`BudgetPlan.savingsHorizonMonths` (data lama dikonversi ×12). Seluruh input, penyimpanan, perhitungan, dan tampilan kini memakai **bulan**; ambang bucket alokasi menjadi `<24` / `24..60` / `>60` bulan (setara `<2` / `2–5` / `>5` tahun).
- **Prefill + override satu kali (one-off).** Investasi dan Planner **memprefill** `targetAmount` + `horizonMonths` dari Tujuan Aktif; pengguna boleh **menimpa** nilai di dalam cakupan sebagai **skenario satu kali** yang **tidak** mengubah Tujuan Aktif yang tersimpan.
- **Investasi tidak lagi membuat `Goal`.** `GoalForm` cakupan Investasi **berhenti** mem-`POST /api/goal`; alur hanya membaca Tujuan Aktif untuk prefill lalu meneruskan `targetAmount`/`horizonMonths` efektif (prefilled/di-override) + `goalId` opsional langsung ke `POST /api/recommendation` **tanpa** mempersistensi `Goal` baru.
- **Planner memprefill via `GET /api/budget`.** `GET /api/budget` diperluas mengembalikan `goalTargetAmount`/`goalHorizonMonths`/`goalName` dari Tujuan Aktif untuk memprefill `BudgetForm`. `POST /api/budget` tidak berubah; Planner tetap menyimpan ke `BudgetPlan` (bukan `Goal`); override tetap satu kali.
- **Kontrak API:** `POST /api/goal` menerima `name` opsional (di-trim; kosong → null) dan mempertahankan validasi lama (`targetAmount` > 0; `horizonMonths` bilangan bulat > 0), mengembalikan `name` pada respons. `GET /api/goal` mengembalikan tujuan terbaru termasuk `name`. Pembaca server-side baru `getActiveGoal()` di `lib/goal.ts` (pola `getLatestProfile()`) dipakai dashboard.
- **Sifat fitur:** integrasi/persistensi — divalidasi via integration/component test, **bukan** property-based test.
- **Reuse pola yang ada:** model `Goal`, endpoint `/api/goal`, Prisma singleton (`lib/db.ts`), helper input Rupiah (`lib/format/rupiahInput.ts`), token Miami blue, format Rupiah `Rp ${Math.round(v).toLocaleString("id-ID")}`, `Profile_Gate`, dan disclaimer edukatif.

**Kedua cakupan tetap berfungsi tanpa Tujuan Aktif:** bila belum ada, form Investasi/Planner memulai kosong dan mengizinkan input manual (tidak diblokir keras).

### 5.2 Integrasi Chatbot ke Data Pengguna
Chatbot membaca konteks pengguna untuk konsultasi yang personal. **Kontrak data yang akan dikonsumsi:** `FinancialProfile` (income/expense/savings) + `InvestmentRecommendation` (komposisi, return, kontribusi bulanan) disuntikkan sebagai konteks ke prompt, sehingga jawaban chatbot selaras dengan rencana investasi pengguna.

### 5.3 Autentikasi
**Sudah terimplementasi (auth demo).** Lihat §3.1. Field `userId` (nullable) yang sudah ada di semua model sejak awal membuat penambahan auth bersifat aditif — hanya menambah model `User`, tanpa migrasi destruktif. Runtime kini mengisi `userId` dari session dan memfilter semua query per pengguna.

**Peningkatan ke level produksi (belum):** registrasi mandiri, reset password, rate limiting login, proteksi CSRF, dan rotasi `AUTH_SECRET`.

### Prinsip ekstensibilitas
Semua logika investasi berada di `lib/investment/*` sebagai **pure function** yang dapat diimpor independen (tanpa dependensi UI/API/DB). Ini memastikan Planner dan integrasi chatbot dapat memakai ulang mesin aturan dan kalkulator proyeksi. Cakupan Planner mengikuti pola yang sama: logika penganggaran murni berada di `lib/planner/*` (aktif: `goalBudget.ts`; dipensiunkan: `presets.ts`/`budget.ts`/`savingsProjection.ts`), hanya mengimpor tipe dari `@/types/planner`.

---

## 6. Peta Dokumen

| Dokumen | Isi |
|---|---|
| `dokumentasi.md` (ini) | Arah produk keseluruhan (otoritatif). |
| `CARA-HITUNG.md` | Penjelasan perhitungan versi ramah-awam (dana darurat, anggaran, trade-off, alokasi & setoran investasi, survei risiko). |
| `RUMUS.md` | Kumpulan rumus perhitungan seluruh modul (`lib/investment`, `lib/planner`, `lib/financial`, `lib/format`) + validasi API (versi teknis). |
| `.kiro/specs/financial-planner/requirements.md` | Kebutuhan formal MVP cakupan Investasi (EARS). |
| `.kiro/specs/financial-planner/design.md` | Desain teknis Investasi: matriks, properti korektnes, testing. |
| `.kiro/specs/financial-planner/tasks.md` | Rencana implementasi Investasi (10 langkah, selesai). |
| `.kiro/specs/budget-planner/requirements.md` | Kebutuhan formal cakupan Planner (EARS) — alokasi (Req 1–10) terimplementasi + proyeksi target tabungan opsional (Req 11–12) + opsi sertakan tabungan saat ini/present value (Req 13–14) + preset penganggaran Custom (Req 15–16) sebagai delta. |
| `.kiro/specs/budget-planner/design.md` | Desain teknis Planner: preset, `computeBudget`/`computeBudgetFromPreset`/`buildCustomPreset`/`evaluateShortfall`, `savingsProjection` (FV annuity + present value opsional), model `BudgetPlan`, properti korektnes (1–16), testing. |
| `.kiro/specs/budget-planner/tasks.md` | Rencana implementasi Planner: alokasi (Task 1–8, selesai) + delta proyeksi target tabungan (Task 9–14, selesai) + delta 2 sertakan tabungan saat ini/present value (Task 15–20) + delta 3 preset Custom (Task 21–26). |
| `.kiro/specs/active-goal/requirements.md` | Kebutuhan formal Tujuan Aktif tersentralisasi (EARS): migrasi `Goal.name`, `POST/GET /api/goal` + `getActiveGoal`, kartu dashboard + editor, prefill + override satu kali di Investasi & Planner. |
| `.kiro/specs/active-goal/design.md` | Desain teknis Tujuan Aktif: arsitektur (dashboard sebagai sumber tujuan), `Goal + name` (migrasi aditif), `getActiveGoal`, perubahan `GET/POST /api/goal` & `GET /api/budget`, komponen `ActiveGoalCard`/`GoalEditor` + prefill Investasi/Planner, testing (integrasi/komponen). |
| `.kiro/specs/active-goal/tasks.md` | Rencana implementasi Tujuan Aktif (7 langkah): migrasi → `getActiveGoal` + endpoint → dashboard → prefill Investasi → prefill Planner → checkpoint. |
| `PRD.md`, `DESIGN.md`, `REQUIREMENTS.md`, `TASKS.md` | **Fitur chatbot pelengkap (fase PoC)** — lihat catatan pengarah di puncak masing-masing. |
