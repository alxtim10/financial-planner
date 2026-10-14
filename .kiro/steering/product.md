# Produk — Financial Planner

Aplikasi web (Next.js App Router) untuk perencanaan keuangan personal terstruktur, target pengguna orang yang belum tentu paham investasi. Bahasa produk & UI: **Bahasa Indonesia**.

**Login (auth demo)** = gate autentikasi di depan semua cakupan. Username + password (password hash scrypt, session JWT di cookie HTTP-only). Semua data ter-isolasi per pengguna — `userId` diambil dari session, bukan body. Tanpa login → halaman redirect ke `/login`, API balas `401`. Akun dibuat lewat **seed** (default `demo`/`demo1234`); belum ada registrasi mandiri.

## Tiga cakupan

1. **Profil Finansial** (gate wajib) — pemasukan bulanan, pengeluaran bulanan, tabungan saat ini. Tanpa profil, Investasi & Planner terkunci. Field pengeluaran diberi catatan agar menyertakan utang/angsuran + membagi rata pengeluaran non-bulanan (mis. pajak kendaraan ÷ 12).
2. **Investasi** — dari Tujuan Aktif + survei risiko → rekomendasi alokasi berbasis aturan (matriks Horizon × Profil Risiko) + kontribusi bulanan (Future Value of Annuity). Angka **deterministik (rule-based), bukan LLM**. Tiap instrumen punya info "i" ramah-pemula.
3. **Planner (goal-driven)** — input pemasukan + tujuan + jangka waktu → sistem menghitung berapa yang harus **ditabung** tiap bulan, lalu memecah kebutuhan/keinginan. Persentase adalah **output, bukan input**. Ada peringatan kelayakan (feasibility).

**Tujuan Aktif (Active Goal)** = satu tujuan tersentralisasi (baris `Goal` terbaru, "latest wins"), dikelola dari dashboard, dipakai bersama Investasi & Planner (prefill; override di scope bersifat satu kali dan tidak mengubah tujuan tersimpan).

**Chatbot Gemini (data-aware / Financial Twin)** = fitur pelengkap berupa drawer geser dari kanan, tersedia di semua halaman. `POST /api/chat` kini **meng-inject konteks keuangan riil pengguna** (Profil, Tujuan Aktif, Risiko, Rekomendasi, Budget, rasio dana darurat) ke `systemInstruction` Gemini lewat `lib/ai/financialContext.ts` → chatbot menjawab tanpa menanyakan ulang angka. Angka tetap dihitung pure function, LLM hanya naratif. **Wajib login + dibatasi kuota harian per pengguna** (`CHAT_DAILY_LIMIT`, default 30) untuk kendali biaya & cegah abuse.

**Analitik funnel** = pencatatan event (profil → tujuan → rekomendasi → konsultan/chat) per pengguna untuk mengukur niat-ke-konversi. Server-side di route + klien via `POST /api/events`. Belum ada dashboard analitik (data mentah di `AnalyticsEvent`).

**Dana Darurat (Emergency Fund)** = indikator kesiapan likuiditas di dashboard & Profil Finansial. Rasio `tabungan / pengeluaran` → tier Rentan (`<3` bln) / Memadai (`3–6` bln) / Kuat (`>6` bln), lengkap rincian "dari mana angka ini" + target ideal 6 bulan.

**Trade-Off Optimizer** = saat rencana Planner tidak layak (tight/impossible), sistem menawarkan ≤3 solusi alternatif (perpanjang jangka waktu / sesuaikan target / efisiensikan pengeluaran) yang bisa diterapkan satu klik ke form Planner.

**Konsultan Keuangan (view-only)** = menu daftar konsultan (`/consultants`) dari data statis (`lib/consultants.ts`) + tombol "Hubungi" yang membuka kanal eksternal (WhatsApp/email/telepon). Tanpa DB, tanpa booking, tanpa Profile_Gate — murni informatif. Data saat ini placeholder.

## Status fitur (sudah jadi)

- ✅ Login/auth demo (username+password, JWT cookie, data ter-isolasi per `userId`; akun via seed)
- ✅ Rate limit chat AI harian per pengguna (`ChatUsage`, `CHAT_DAILY_LIMIT`)
- ✅ Analitik funnel (`AnalyticsEvent` + `/api/events`; dashboard belum)
- ✅ Profil Finansial (CRUD dasar via `/api/profile`)
- ✅ Investasi end-to-end (Goal → Survei → Rekomendasi, persisted)
- ✅ Planner goal-driven (model preset lama sudah disuperseksi)
- ✅ Tujuan Aktif tersentralisasi (dashboard + prefill Investasi/Planner)
- ✅ Chatbot drawer **data-aware** (Financial Twin — konteks data pengguna sudah terintegrasi)
- ✅ Indikator Dana Darurat (dashboard + Profil Finansial)
- ✅ Trade-Off Optimizer di Planner (saran saat rencana tidak layak)
- ✅ Daftar Konsultan Keuangan (view-only + tombol Hubungi, data statis)
- ✅ DB di Supabase; satuan jangka waktu = **bulan**

Roadmap (belum): pencatatan transaksi harian, cash-flow bulanan, riwayat multi-anggaran. Auth sudah ada (demo); peningkatan ke level produksi (registrasi mandiri, reset password, rate limiting login, CSRF) belum.

## Peta dokumen — baca sesuai urutan ini

1. **`dokumentasi.md`** (root) — **SUMBER KEBENARAN OTORITATIF** arah produk end-to-end. Baca ini dulu untuk detail.
2. **`README.md`** — setup, env (Supabase), cara jalan, struktur folder.
3. Steering `.kiro/steering/` (product/tech/structure) — ringkasan yang selalu masuk konteks (file ini).
4. `.kiro/specs/**` — **SNAPSHOT HISTORIS** per fitur saat dibangun. **Jangan** dijadikan acuan implementasi terkini (mis. masih memakai satuan tahun / model preset lama). Untuk kondisi sekarang, ikuti `dokumentasi.md` + kode.
5. `PRD.md` / `DESIGN.md` / `REQUIREMENTS.md` / `TASKS.md` — hanya chatbot fase PoC.

Aturan konsistensi: bila dokumen dan kode berbeda, **kode + `dokumentasi.md` menang**. Perbarui `dokumentasi.md` saat mengubah scope; jangan mengedit `.kiro/specs/**` sebagai arsip kecuali diminta.
