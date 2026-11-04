"use client";

import { useState } from "react";
import { ArrowUp, Sparkles } from "lucide-react";
import { emitOpenChat } from "@/lib/chat/openChat";

/**
 * HomeChatBar — entry point tambahan ke asisten AI, bergaya "ask bar" ala
 * Gemini, dipasang di atas ringkasan profil pada dashboard.
 *
 * Perilaku: saat pengguna mengetik lalu menekan Enter (atau menekan tombol
 * kirim), bar memancarkan event global `tabungin:open-chat` berisi teks tadi.
 * ChatDrawer (di layout) menangkapnya → membuka panel chat dan meneruskan teks
 * sebagai prompt pertama yang langsung dikirim. Bar ini TIDAK memanggil API
 * sendiri; ia hanya pintu masuk ke ChatDrawer/ChatInterface yang sudah ada.
 */
export default function HomeChatBar() {
  const [value, setValue] = useState("");

  function submit() {
    const trimmed = value.trim();
    if (!trimmed) return;
    emitOpenChat(trimmed);
    setValue("");
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    submit();
  }

  return (
    <section aria-label="Tanya asisten AI" className="mb-8">
      <form
        onSubmit={onSubmit}
        className="flex items-center gap-2 rounded-[1.75rem] border border-border bg-surface p-2 shadow-[0_2px_20px_rgba(0,0,0,0.04)] transition-shadow focus-within:border-[var(--accent)]/40 focus-within:shadow-[0_2px_28px_rgba(0,180,216,0.12)]"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[var(--accent)] to-[var(--accent-2)] text-white">
          <Sparkles className="h-4 w-4" />
        </span>
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Tanya apa saja soal keuangan Anda..."
          aria-label="Tulis pertanyaan untuk asisten AI"
          className="min-w-0 flex-1 bg-transparent px-1 text-[0.9375rem] text-foreground placeholder:text-muted focus:outline-none"
        />
        <button
          type="submit"
          disabled={!value.trim()}
          aria-label="Buka asisten AI dengan pertanyaan ini"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-white transition-all duration-200 hover:scale-105 hover:brightness-110 disabled:scale-100 disabled:cursor-not-allowed disabled:bg-border disabled:text-muted"
        >
          <ArrowUp className="h-5 w-5" strokeWidth={2.5} />
        </button>
      </form>
      <p className="mt-2 px-2 text-xs text-muted">
        Tekan Enter untuk membuka asisten AI dengan pertanyaan Anda.
      </p>
    </section>
  );
}
