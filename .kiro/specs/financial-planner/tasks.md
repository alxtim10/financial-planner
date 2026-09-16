# Implementation Plan

- [ ] 1. Inisialisasi proyek Next.js dan dependencies
  - Buat Next.js app (App Router, TypeScript, Tailwind CSS) di root workspace.
  - Install dependencies: `@google/genai`, `react-markdown`, `remark-gfm`, `lucide-react`.
  - Buat `.env.local` berisi placeholder `GEMINI_API_KEY=` dan pastikan masuk `.gitignore`.
  - Bersihkan boilerplate default pada `app/page.tsx` dan `app/globals.css`.
  - _Requirements: 6.2_

- [ ] 2. Definisikan tipe bersama dan system prompt
  - [ ] 2.1 Buat `types/chat.ts` dengan `Role`, `Message`, dan `ChatRequest`.
    - `role` dibatasi ke `"user" | "model"`.
    - _Requirements: 8.4_
  - [ ] 2.2 Buat `lib/prompt.ts` berisi `FINANCIAL_PLANNER_PROMPT`.
    - Instruksi: minta 3 data inti bila kurang, acuan 50/30/20, prioritas dana darurat, kalkulasi akurat, disclaimer wajib, jawab Bahasa Indonesia + Markdown.
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 4.1_

- [ ] 3. Implementasi API route handler `app/api/chat/route.ts`
  - [ ] 3.1 Set `runtime = "nodejs"` dan inisialisasi `GoogleGenAI` dari `process.env.GEMINI_API_KEY`.
    - _Requirements: 6.1, 6.2, 6.3_
  - [ ] 3.2 Validasi body request dan potong history ke 20 pesan terakhir.
    - Tolak body invalid / pesan kosong dengan HTTP 400.
    - _Requirements: 1.1, 8.1, 8.2_
  - [ ] 3.3 Petakan history flat `{role, content}` ke format native Gemini dan panggil `generateContentStream` (model `gemini-2.5-flash`, `temperature: 0.4`, `systemInstruction`).
    - _Requirements: 1.1, 8.4_
  - [ ] 3.4 Bungkus hasil dalam `ReadableStream` teks polos; tangani error inisiasi (HTTP 500/429 + JSON) dan error mid-stream (sentinel `[[STREAM_ERROR]]`).
    - _Requirements: 2.1, 7.1, 7.2_

- [ ] 4. Implementasi komponen `MessageBubble.tsx`
  - Render pesan `user` (align kanan, teks polos) dan `model` (align kiri, Markdown via `react-markdown` + `remark-gfm`).
  - Beri pemisah visual jelas antar peran; batasi lebar bubble `max-w-[80%]`.
  - _Requirements: 1.3, 9.2, 9.4_

- [ ] 5. Implementasi komponen `ChatInterface.tsx`
  - [ ] 5.1 Siapkan state `messages`, `input`, `isGenerating`; bangun layout (header, message container scrollable, form input) dengan container `mx-auto w-full max-w-3xl px-4`.
    - _Requirements: 1.4, 9.1, 9.2, 9.3_
  - [ ] 5.2 Implementasi `handleSend`: tambah pesan user + placeholder model, fetch ke `/api/chat` dengan `history` 20 pesan terbaru.
    - _Requirements: 1.1, 8.1, 8.2_
  - [ ] 5.3 Implementasi stream reader: baca `res.body` via reader + `TextDecoder`, append chunk ke bubble model aktif (efek typewriter).
    - _Requirements: 2.1, 2.2, 2.4_
  - [ ] 5.4 Tangani error: cek `!res.ok` (tampilkan JSON error di chat) dan sentinel `[[STREAM_ERROR]]` (bersihkan + tandai gagal); kembalikan input ke pengguna di `finally`.
    - _Requirements: 7.1, 7.2, 7.3_
  - [ ] 5.5 Implementasi auto-scroll ke dasar list setiap `messages` berubah.
    - _Requirements: 2.3_
  - [ ] 5.6 Tambahkan tombol Quick Prompts yang memanggil `handleSend(preset)`.
    - _Requirements: 5.1, 5.2_

- [ ] 6. Rakit halaman utama
  - Mount `ChatInterface` di `app/page.tsx`.
  - _Requirements: 1.1_

- [ ] 7. Verifikasi build dan validasi skenario
  - Jalankan build/dev server dan pastikan tidak ada error kompilasi TypeScript.
  - Uji manual skenario kunci: input tidak lengkap (Req 3.1/3.2), kalkulasi 50/30/20 (Req 3.4), disclaimer (Req 4.1), streaming + auto-scroll (Req 2), error mid-stream tidak menggantung (Req 7.2), key tidak bocor ke klien (Req 6), layout mobile (Req 9).
  - _Requirements: 2, 3, 4, 6, 7, 9_
