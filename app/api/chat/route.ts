import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
import { FINANCIAL_PLANNER_PROMPT } from "@/lib/prompt";
import type { ChatRequest } from "@/types/chat";

export const runtime = "nodejs";

const MAX_HISTORY = 20;
const MODEL = process.env.GEMINI_MODEL || "gemini-flash-lite-latest";

const apiKey = process.env.GEMINI_API_KEY;
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

/** Ekstrak status & pesan dari error SDK Gemini untuk logging diagnostik. */
function describeError(err: unknown): string {
  if (err && typeof err === "object") {
    const e = err as Record<string, unknown>;
    const status = e.status ?? e.code ?? "";
    const message = e.message ?? String(err);
    return `[${status}] ${message}`;
  }
  return String(err);
}

export async function POST(req: Request) {
  // Guard: API key belum diset.
  if (!ai) {
    console.error("GEMINI_API_KEY belum diset di environment.");
    return NextResponse.json(
      { error: "Konfigurasi server belum lengkap. Hubungi admin." },
      { status: 500 },
    );
  }

  // Validasi body.
  let body: ChatRequest;
  try {
    body = (await req.json()) as ChatRequest;
  } catch {
    return NextResponse.json({ error: "Permintaan tidak valid." }, { status: 400 });
  }

  const { message, history = [] } = body;
  if (typeof message !== "string" || !message.trim()) {
    return NextResponse.json({ error: "Pesan tidak boleh kosong." }, { status: 400 });
  }

  // Potong history ke 20 pesan terakhir dan petakan ke format native Gemini.
  const trimmed = Array.isArray(history) ? history.slice(-MAX_HISTORY) : [];
  const contents = [
    ...trimmed.map((m) => ({
      role: m.role,
      parts: [{ text: m.content }],
    })),
    { role: "user", parts: [{ text: message }] },
  ];

  // Inisiasi streaming. Error di tahap ini masih bisa dikembalikan sebagai JSON.
  const startedAt = Date.now();
  console.log(`[chat] -> ${MODEL} | history=${trimmed.length} | msg="${message.slice(0, 60)}"`);

  let geminiStream: Awaited<ReturnType<typeof ai.models.generateContentStream>>;
  try {
    geminiStream = await ai.models.generateContentStream({
      model: MODEL,
      contents,
      config: {
        systemInstruction: FINANCIAL_PLANNER_PROMPT,
        temperature: 0.4,
      },
    });
  } catch (err) {
    console.error(`[chat] init error setelah ${Date.now() - startedAt}ms:`, describeError(err));
    return NextResponse.json(
      { error: "Maaf, gagal memulai sesi. Coba lagi sebentar." },
      { status: 500 },
    );
  }

  // Alirkan teks polos ke klien. Error mid-stream ditandai sentinel.
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let firstToken = true;
      try {
        for await (const chunk of geminiStream) {
          const text = chunk.text;
          if (text) {
            if (firstToken) {
              console.log(`[chat] token pertama setelah ${Date.now() - startedAt}ms`);
              firstToken = false;
            }
            controller.enqueue(encoder.encode(text));
          }
        }
        console.log(`[chat] selesai dalam ${Date.now() - startedAt}ms`);
      } catch (err) {
        console.error(`[chat] stream error setelah ${Date.now() - startedAt}ms:`, describeError(err));
        controller.enqueue(encoder.encode("\n\n[[STREAM_ERROR]]"));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
