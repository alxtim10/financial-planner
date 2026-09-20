> **Catatan arah produk:** Dokumen ini mendeskripsikan tugas implementasi **fitur chatbot pelengkap (complementary)** dari fase PoC. Arah produk keseluruhan kini adalah aplikasi perencana keuangan terstruktur (fokus MVP: cakupan Investasi); rencana implementasi terbaru ada di `.kiro/specs/financial-planner/tasks.md`. Lihat [`dokumentasi.md`](./dokumentasi.md) untuk arah dan gambaran keseluruhan yang otoritatif.

# Implementation Tasks Breakdown

## Phase 1: Inisialisasi Proyek & Konfigurasi Lingkungan
- [ ] Inisialisasi Next.js app (`npx create-next-app@latest financial-planner-poc`).
- [ ] Pilih opsi: TypeScript (Yes), Tailwind CSS (Yes), App Router (Yes).
- [ ] Install dependencies utama: `npm install @google/genai react-markdown remark-gfm lucide-react`.
- [ ] Siapkan file `.env.local` dan masukkan kredensial `GEMINI_API_KEY`.
- [ ] Bersihkan *boilerplate* kode default Next.js pada `app/page.tsx` dan `app/globals.css`.

## Phase 2: Konstruksi Backend (API Route)
- [ ] Buat struktur folder endpoint di `app/api/chat/route.ts`.
- [ ] Set runtime menjadi Node.js (`export const runtime = "nodejs";`).
- [ ] Inisialisasi instance `GoogleGenAI` menggunakan key dari *environment variables*.
- [ ] Susun `FINANCIAL_PLANNER_PROMPT` sebagai *system instruction*.
- [ ] Buat handler `POST` untuk menerima *payload* (`message` dan `history`).
- [ ] Terapkan logika translasi map array history dari format *flat* ke format native Gemini (`parts: [{ text }]`).
- [ ] Panggil `ai.models.generateContentStream` dengan parameter `model: gemini-2.5-flash` dan `temperature: 0.4`.
- [ ] Kembalikan hasil stream ke klien. Tambahkan basic `try...catch` error handling.

## Phase 3: Pengembangan UI Komponen (Frontend)
- [ ] Buat komponen `components/MessageBubble.tsx`. Implementasikan variasi styling Tailwind (warna/posisi) untuk membedakan pesan `user` dan `model`. Integrasikan `react-markdown` di dalam bubble `model`.
- [ ] Buat komponen kerangka dasar `components/ChatInterface.tsx`.
- [ ] Bangun layout utama: Header sederhana, *scrollable message container*, dan form input interaktif di bawah layar.
- [ ] Tambahkan tombol *Quick Prompts* di atas form input.

## Phase 4: Integrasi State Management & Streaming Reader
- [ ] Definisikan state pada `ChatInterface.tsx` atau halaman utama untuk menyimpan `history` (array *flat*) dan `isGenerating` (boolean loader state).
- [ ] Tulis fungsi `handleSubmit`: 
  - Masukkan pesan pengguna ke state `history`.
  - Eksekusi *fetch* ke `/api/chat`.
- [ ] Implementasikan parser *ReadableStream*. Baca *chunks* yang masuk dan gunakan *updater* state React untuk menambahkan karakter teks secara beruntun (*typewriter effect*) ke pesan asisten yang sedang dibuat.
- [ ] Tambahkan logika potong histori (hanya bawa 20 pesan terbaru ke server).
- [ ] Terapkan auto-scroll *Ref* yang mengarah ke dasar komponen setiap kali chunk baru dirender.

## Phase 5: Validasi & Testing Akhir
- [ ] Lakukan pengetesan *Scenario 1*: Cek tanpa menyebutkan nominal. Pastikan model membalas dengan permintaan data.
- [ ] Lakukan pengetesan *Scenario 2*: Uji persentase kalkulasi 50/30/20.
- [ ] Verifikasi apakah teks *"Disclaimer: Simulasi ini..."* secara konsisten muncul di akhir jawaban model.
- [ ] Pastikan UI responsif di layar perangkat seluler (Tailwind class checks).