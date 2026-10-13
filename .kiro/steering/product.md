# Produk — Financial Planner

Aplikasi web (Next.js App Router) untuk perencanaan keuangan personal terstruktur, target pengguna orang yang belum tentu paham investasi. Bahasa produk & UI: **Bahasa Indonesia**.

## Tiga cakupan

1. **Profil Finansial** (gate wajib) — pemasukan bulanan, pengeluaran bulanan, tabungan saat ini. Tanpa profil, Investasi & Planner terkunci. Field pengeluaran diberi catatan agar menyertakan utang/angsuran + membagi rata pengeluaran non-bulanan (mis. pajak kendaraan ÷ 12).
2. **Investasi** — dari Tujuan Aktif + survei risiko → rekomendasi alokasi berbasis aturan (matriks Horizon × Profil Risiko) + kontribusi bulanan (Future Value of Annuity). Angka **deterministik (rule-based), bukan LLM**. Tiap instrumen punya info "i" ramah-pemula.
3. **Planner (goal-driven)** — input pemasukan + tujuan + jangka waktu → sistem menghitung berapa yang harus **ditabung** tiap bulan, lalu memecah kebutuhan/keinginan. Persentase adalah **output, bukan input**. Ada peringatan kelayakan (feasibility).

**Tujuan Aktif (Active Goal)** = satu tujuan tersentralisasi (baris `Goal` terbaru, "latest wins"), dikelola dari dashboard, dipakai bersama Investasi & Planner (prefill; override di scope bersifat satu kali dan tidak mengubah tujuan tersimpan).

**Chatbot Gemini (data-aware / Financial Twin)** = fitur pelengkap berupa drawer geser dari kanan, tersedia di semua halaman. `POST /api/chat` kini **meng-inject konteks keuangan riil pengguna** (Profil, Tujuan Aktif, Risiko, Rekomendasi, Budget, rasio dana darurat) ke `systemInstruction` Gemini lewat `lib/ai/financialContext.ts` → chatbot menjawab tanpa menanyakan ulang angka. Angka tetap dihitung pure function, LLM hanya naratif.

**Dana Darurat (Emergency Fund)** = indikator kesiapan likuiditas di dashboard & Profil Finansial. Rasio `tabungan / pengeluaran` → tier Rentan (`<3` bln) / Memadai (`3–6` bln) / Kuat (`>6` bln), lengkap rincian "dari mana angka ini" + target ideal 6 bulan.

**Trade-Off Optimizer** = saat rencana Planner tidak layak (tight/impossible), sistem menawarkan ≤3 solusi alternatif (perpanjang jangka waktu / sesuaikan target / efisiensikan pengeluaran) yang bisa diterapkan satu klik ke form Planner.

## Status fitur (sudah jadi)

- ✅ Profil Finansial (CRUD dasar via `/api/profile`)
- ✅ Investasi end-to-end (Goal → Survei → Rekomendasi, persisted)
- ✅ Planner goal-driven (model preset lama sudah disuperseksi)
- ✅ Tujuan Aktif tersentralisasi (dashboard + prefill Investasi/Planner)
- ✅ Chatbot drawer **data-aware** (Financial Twin — konteks data pengguna sudah terintegrasi)
- ✅ Indikator Dana Darurat (dashboard + Profil Finansial)
- ✅ Trade-Off Optimizer di Planner (saran saat rencana tidak layak)
- ✅ DB di Supabase; satuan jangka waktu = **bulan**

Roadmap (belum): pencatatan transaksi harian, cash-flow bulanan, riwayat multi-anggaran, autentikasi (`userId` sudah nullable di semua model).

## Peta dokumen — baca sesuai urutan ini

1. **`dokumentasi.md`** (root) — **SUMBER KEBENARAN OTORITATIF** arah produk end-to-end. Baca ini dulu untuk detail.
2. **`README.md`** — setup, env (Supabase), cara jalan, struktur folder.
3. Steering `.kiro/steering/` (product/tech/structure) — ringkasan yang selalu masuk konteks (file ini).
4. `.kiro/specs/**` — **SNAPSHOT HISTORIS** per fitur saat dibangun. **Jangan** dijadikan acuan implementasi terkini (mis. masih memakai satuan tahun / model preset lama). Untuk kondisi sekarang, ikuti `dokumentasi.md` + kode.
5. `PRD.md` / `DESIGN.md` / `REQUIREMENTS.md` / `TASKS.md` — hanya chatbot fase PoC.

Aturan konsistensi: bila dokumen dan kode berbeda, **kode + `dokumentasi.md` menang**. Perbarui `dokumentasi.md` saat mengubah scope; jangan mengedit `.kiro/specs/**` sebagai arsip kecuali diminta.
