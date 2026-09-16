# Product Requirement Document (PRD): Financial Planner AI (PoC)

## 1. Overview & Objectives
**Financial Planner AI** adalah aplikasi web interaktif berbasis Next.js yang memfasilitasi konsultasi keuangan personal. Sistem memanfaatkan Google Gemini API untuk membantu pengguna menyusun anggaran, merencanakan target tabungan, dan mengidentifikasi rasio keuangan pribadi secara terstruktur.

- **Target Audiens**: Individu yang membutuhkan simulasi alokasi dana bulanan dan evaluasi cash flow personal secara instan.
- **Tujuan PoC**:
  - Memvalidasi keandalan Gemini API dalam menganalisis data keuangan personal.
  - Menguji performa transmisi respons melalui sistem streaming.
  - Mengamankan kunci akses API melalui arsitektur serverless Next.js.

## 2. Technical Stack & Dependencies
- **Framework**: Next.js (App Router)
- **Bahasa**: TypeScript
- **Styling**: Tailwind CSS, `lucide-react` (opsional untuk ikon)
- **SDK / API**: `@google/genai` (SDK resmi terbaru)
- **Rendering Markdown**: `react-markdown`, `remark-gfm`
- **State Management**: React `useState` lokal (in-memory)

## 3. Setup & Konfigurasi Lingkungan
1. Dapatkan API Key melalui [Google AI Studio](https://aistudio.google.com/).
2. Buat file `.env.local` di root proyek.
3. Tambahkan environment variable: `GEMINI_API_KEY=AIzaSy...` (Pastikan tidak menggunakan prefix `NEXT_PUBLIC_` demi keamanan).

## 4. Non-Functional & Operational Requirements
- **Performance**: Target aspiratif respons token pertama (TTFT) muncul di UI < 1.5 detik (bergantung pada latensi upstream API Google). UI bersifat *non-blocking* saat memproses stream.
- **State Management (PoC Scope)**: Riwayat chat bersifat statis per-sesi (*stateless* di server, *in-memory* di peramban). Refresh halaman akan menghapus riwayat sesi.