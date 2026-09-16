# System Design & Architecture

## 1. Folder Structure
```text
/
├── app/
│   ├── api/chat/route.ts   # Backend API Proxy (Node.js runtime)
│   ├── layout.tsx          # Root layout
│   └── page.tsx            # Halaman utama aplikasi (UI)
├── components/
│   ├── ChatInterface.tsx   # Komponen utama UI chat & stream handling
│   └── MessageBubble.tsx   # Komponen per pesan (user/model) dengan Markdown
├── .env.local              # Penyimpanan API Key (diabaikan git)
└── package.json
```

## 2. Technical Architecture & Data Flow

### 2.1 System Context
- **Frontend (Client-Side)**: Menangani input pengguna, menyimpan array state `history` format *flat* (`{ role, content }`), dan mem-parsing stream untuk dirender via `react-markdown`.
- **Backend (Next.js Route Handler)**: Menerima payload *flat*, memetakan ke format native Gemini, menyuntikkan *System Instruction*, dan membuka koneksi streaming via SDK.
- **Gemini API Engine**: Memproses logika berdasarkan *system instruction* dan konteks dialog.

### 2.2 Data Flow Diagram (Teks)
`[User Input]` -> `[Frontend State]` -> `POST /api/chat (JSON: flat messages)` -> `[Server Route]` -> `Map & Inject Prompt` -> `[Gemini API]` -> `Streaming Response (Chunks)` -> `[Server Route]` -> `[Frontend Stream Reader]` -> `[UI Render]`

## 3. API Contract & Interface Specification

### 3.1 Request (Client -> API Route)
- **Endpoint**: `POST /api/chat`
- **Headers**: `Content-Type: application/json`
- **Payload Format**: Flat (bersih untuk UI klien).
  ```json
  {
    "message": "Gaji saya 8 juta, cicilan motor 1.5 juta.",
    "history": [
      { "role": "user", "content": "Halo" },
      { "role": "model", "content": "Halo! Saya asisten keuangan Anda..." }
    ]
  }
  ```
  *(Aturan Ketat: Hanya gunakan `"user"` atau `"model"` pada key `role`.)*

### 3.2 Response (Streaming)
- **Format**: Plain Text Chunk via `ReadableStream` (`text/event-stream` atau format native SDK).
- **Error Handling**:
  - Awal koneksi: HTTP 500 `{ "error": "Gagal memulai sesi." }`.
  - Mid-stream: Mengirimkan teks tag error pada chunk terakhir agar UI bisa berhenti memproses gracefully.

## 4. Key Architectural Decisions

- **Runtime API Route**: Wajib menggunakan **Node.js Runtime** (`export const runtime = "nodejs";`). Menghindari komplikasi kompatibilitas SDK dan koneksi stream yang sering terjadi pada Edge Runtime.
- **Model Temperature**: Ditetapkan pada **`0.4`**. Parameter ini menjaga keseimbangan antara fleksibilitas bahasa natural dengan deterministik/konsistensi kalkulasi matematis finansial.
- **Konteks History**: Dibatasi hingga maksimal **20 pesan terakhir** untuk mengontrol penggunaan token (cost) dan mencegah degradasi waktu respons (latency) di akhir percakapan panjang.
- **Sanitasi Prompt Injection**: Ditetapkan sebagai *out-of-scope* (di luar cakupan) untuk PoC.