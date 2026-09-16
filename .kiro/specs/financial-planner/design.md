# Design Document

## Overview

Financial Planner AI adalah aplikasi Next.js (App Router) single-page dengan satu endpoint API proxy. Klien mengelola state percakapan in-memory dan menampilkan balasan streaming; server menyisipkan system instruction, memetakan riwayat ke format Gemini, memanggil Gemini API secara streaming, lalu meneruskan potongan teks kembali ke klien.

Prinsip desain utama:
- **API key terisolasi di server.** Semua panggilan ke Gemini hanya dari route handler.
- **Kontrak UI sederhana.** Klien memakai format history flat `{ role, content }`; pemetaan ke format native Gemini terjadi di server sehingga UI tidak bergantung pada detail SDK.
- **Streaming teks polos.** Menghindari kompleksitas SSE; server mengembalikan `ReadableStream` teks yang dibaca klien via `Response.body`.

Design ini memenuhi Requirements 1–9.

## Architecture

### Diagram Konteks

```
[Browser / ChatInterface]
   | POST /api/chat  { message, history: {role, content}[] }
   v
[Next.js Route Handler /api/chat]  (runtime = "nodejs")
   | map -> { role, parts:[{text}] } + systemInstruction
   v
[Gemini API]  model: gemini-2.5-flash, temperature: 0.4, stream
   | text chunks
   v
[Route Handler]  ReadableStream<string>
   | streamed body
   v
[ChatInterface]  reader.read() -> append -> react-markdown render
```

### Struktur Folder

```text
/
├── app/
│   ├── api/chat/route.ts   # API proxy (Node.js runtime, streaming)
│   ├── layout.tsx          # Root layout
│   ├── page.tsx            # Halaman utama (mount ChatInterface)
│   └── globals.css         # Tailwind base
├── components/
│   ├── ChatInterface.tsx   # State percakapan, stream reader, quick prompts, auto-scroll
│   └── MessageBubble.tsx   # Render satu pesan (Markdown untuk role model)
├── lib/
│   └── prompt.ts           # FINANCIAL_PLANNER_PROMPT (system instruction)
├── types/
│   └── chat.ts             # Tipe Message { role, content }
├── .env.local              # GEMINI_API_KEY (gitignored)
└── package.json
```

## Components and Interfaces

### Tipe Bersama (`types/chat.ts`)

```ts
export type Role = "user" | "model";

export interface Message {
  role: Role;
  content: string;
}

export interface ChatRequest {
  message: string;
  history: Message[];
}
```

Catatan: `role` dibatasi ke `"user" | "model"` (Req 8.4). Tidak pernah `"assistant"`.

### API Contract: `POST /api/chat`

**Request**
- Header: `Content-Type: application/json`
- Body:
  ```json
  {
    "message": "Gaji saya 8 juta, cicilan motor 1.5 juta.",
    "history": [
      { "role": "user", "content": "Halo" },
      { "role": "model", "content": "Halo! Saya asisten keuangan Anda..." }
    ]
  }
  ```

**Response (sukses)**
- Status: `200`
- Header: `Content-Type: text/plain; charset=utf-8`
- Body: aliran teks Markdown polos (token demi token). Tanpa pembungkus JSON.

**Response (error sebelum stream)** — Req 7.1
- Status: `500` (atau `429` jika rate limit terdeteksi)
- Body JSON: `{ "error": "Maaf, gagal memulai sesi. Coba lagi sebentar." }`

### Protokol Streaming & Error Mid-Stream

Karena badan sukses berupa teks polos, error yang terjadi **setelah** stream dimulai tidak bisa lagi mengubah status HTTP. Untuk itu (Req 7.2):

- Server membungkus iterasi chunk dalam `try/catch`. Bila terjadi error di tengah, server menuliskan penanda sentinel di akhir stream:
  ```
  \n\n[[STREAM_ERROR]]
  ```
- Klien memeriksa apakah teks terakumulasi diakhiri sentinel `[[STREAM_ERROR]]`. Jika ya: hapus sentinel dari tampilan, tandai pesan gagal, hentikan loading, dan tampilkan catatan error singkat.

Ini membuat kegagalan mid-stream dapat dideteksi dan diuji secara deterministik (menyempurnakan Scenario 4 yang sebelumnya kabur).

### Server: Route Handler (`app/api/chat/route.ts`)

Tanggung jawab:
- `export const runtime = "nodejs";` (Req 6, stabilitas SDK + streaming).
- Validasi body minimal (`message` non-kosong; `history` array).
- Potong history ke **20 pesan terakhir** (Req 8.2) — pemotongan ganda (klien + server) sebagai jaring pengaman.
- Petakan `{ role, content }` → `{ role, parts: [{ text: content }] }`.
- Panggil `ai.models.generateContentStream` dengan `model: "gemini-2.5-flash"`, `config.systemInstruction`, `config.temperature = 0.4`.
- Kembalikan `ReadableStream` yang meng-enqueue `chunk.text` sebagai UTF-8.

Sketsa:

```ts
import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
import { FINANCIAL_PLANNER_PROMPT } from "@/lib/prompt";
import type { ChatRequest } from "@/types/chat";

export const runtime = "nodejs";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export async function POST(req: Request) {
  let body: ChatRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Permintaan tidak valid." }, { status: 400 });
  }

  const { message, history = [] } = body;
  if (!message?.trim()) {
    return NextResponse.json({ error: "Pesan kosong." }, { status: 400 });
  }

  const trimmed = history.slice(-20);
  const contents = [
    ...trimmed.map((m) => ({ role: m.role, parts: [{ text: m.content }] })),
    { role: "user", parts: [{ text: message }] },
  ];

  let geminiStream;
  try {
    geminiStream = await ai.models.generateContentStream({
      model: "gemini-2.5-flash",
      contents,
      config: { systemInstruction: FINANCIAL_PLANNER_PROMPT, temperature: 0.4 },
    });
  } catch (err) {
    console.error("Gemini init error:", err);
    return NextResponse.json(
      { error: "Maaf, gagal memulai sesi. Coba lagi sebentar." },
      { status: 500 }
    );
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of geminiStream) {
          const text = chunk.text;
          if (text) controller.enqueue(encoder.encode(text));
        }
      } catch (err) {
        console.error("Gemini stream error:", err);
        controller.enqueue(encoder.encode("\n\n[[STREAM_ERROR]]"));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
```

### Server: System Prompt (`lib/prompt.ts`)

`FINANCIAL_PLANNER_PROMPT` mengarahkan model untuk (memenuhi Req 3 & 4):
- Meminta 3 data inti (pemasukan, pengeluaran/cicilan, tujuan) bila belum lengkap; jangan mengarang nominal.
- Memakai acuan alokasi 50/30/20 dan memprioritaskan dana darurat sebelum investasi berisiko.
- Menyertakan angka kalkulasi yang akurat bila nominal diberikan.
- Selalu menutup ringkasan dengan disclaimer edukatif.
- Menjawab dalam Bahasa Indonesia dengan format Markdown (tabel/bullet bila relevan).

### Klien: `ChatInterface.tsx`

State:
```ts
const [messages, setMessages] = useState<Message[]>([]);
const [input, setInput] = useState("");
const [isGenerating, setIsGenerating] = useState(false);
```

Alur `handleSend(text)`:
1. Guard: abaikan bila `isGenerating` atau teks kosong.
2. Tambah pesan user ke `messages`; set `isGenerating = true`.
3. Tambah bubble `model` kosong sebagai placeholder streaming.
4. `fetch("/api/chat", { method:"POST", body: JSON.stringify({ message: text, history: messages.slice(-20) }) })`.
5. Jika `!res.ok`: baca JSON error, tampilkan di bubble model, hentikan.
6. Baca `res.body!.getReader()` + `TextDecoder`; loop `read()`, append tiap chunk ke bubble model terakhir (Req 2.2).
7. Deteksi sentinel `[[STREAM_ERROR]]` di akhir (Req 7.2): bersihkan + tandai error.
8. `finally`: `isGenerating = false`.

Auto-scroll (Req 2.3): `useRef` ke elemen sentinel di dasar list; `useEffect` memanggil `scrollIntoView` saat `messages` berubah.

Quick prompts (Req 5): array preset dirender sebagai tombol; klik memanggil `handleSend(preset)`.

Layout (Req 9.3): seluruh konten (list pesan + input) dibungkus container `mx-auto w-full max-w-3xl px-4`. Di desktop container mentok ~768px dan berada di tengah; di mobile mengisi penuh dengan padding tepi. Contoh kerangka:

```tsx
<div className="flex h-dvh flex-col">
  <header className="mx-auto w-full max-w-3xl px-4">...</header>
  <main className="flex-1 overflow-y-auto">
    <div className="mx-auto w-full max-w-3xl px-4">{/* messages */}</div>
  </main>
  <footer className="mx-auto w-full max-w-3xl px-4">{/* input + quick prompts */}</footer>
</div>
```

### Klien: `MessageBubble.tsx`
- Prop: `message: Message`.
- `role === "user"`: bubble align kanan, teks polos, lebar dibatasi `max-w-[80%]` (Req 9.4).
- `role === "model"`: bubble align kiri, render via `react-markdown` + `remark-gfm` (Req 1.3), lebar dibatasi `max-w-[80%]` (Req 9.4).

## Data Models

Hanya satu model inti (`Message`) seperti di atas. Tidak ada persistensi (Req 8.3): state hidup di memori komponen React dan hilang saat refresh.

## Error Handling

| Kondisi | Deteksi | Respons | Req |
|---|---|---|---|
| Body tidak valid / pesan kosong | Validasi server | HTTP 400 + JSON error | 7 |
| Gagal inisiasi Gemini | `try/catch` sebelum stream | HTTP 500/429 + JSON error, UI tampilkan di chat | 7.1 |
| Gagal di tengah stream | `try/catch` dalam `start()` | Sentinel `[[STREAM_ERROR]]`, UI hentikan loading + tandai | 7.2 |
| API key tidak diset | `process.env` undefined | Log server; inisiasi gagal → jalur 7.1 | 6 |

Semua jalur error mengembalikan kontrol input ke pengguna (Req 7.3).

## Testing Strategy

PoC — verifikasi manual berbasis skenario (bukan unit test otomatis), sejalan dengan scope:
- **Req 3.1/3.2:** Kirim "Bantu atur keuangan saya" → asisten meminta 3 data, tidak mengarang nominal.
- **Req 3.4:** "Gaji 10 juta, tanpa utang" → 5jt/3jt/2jt tepat.
- **Req 4.1:** Verifikasi disclaimer selalu muncul di akhir ringkasan.
- **Req 2:** Amati teks muncul progresif + auto-scroll.
- **Req 7.2:** Simulasikan kegagalan (mis. matikan koneksi/putus key sementara) → UI tidak menggantung, loading berhenti.
- **Req 6:** Inspeksi bundle klien / network tab memastikan key tidak terkirim ke browser.
- **Req 9:** Cek layout di viewport mobile.

## Keputusan Teknis Utama (Rationale)

- **Node.js runtime** dipilih atas Edge untuk menghindari masalah kompatibilitas SDK `@google/genai` dan streaming di Edge.
- **temperature 0.4** menyeimbangkan bahasa natural dengan konsistensi kalkulasi numerik.
- **Format history flat** menjaga UI bebas dari detail SDK; pemetaan terpusat di server.
- **Streaming teks polos + sentinel** dipilih ketimbang SSE demi kesederhanaan PoC, sambil tetap menjadikan error mid-stream dapat dideteksi.
- **Batas 20 pesan** mengendalikan biaya token dan latensi pada percakapan panjang.
