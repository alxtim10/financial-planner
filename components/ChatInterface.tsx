"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp, Sparkles, Wallet, PiggyBank, TrendingDown, ShieldCheck, Target, AlertCircle } from "lucide-react";
import MessageBubble from "@/components/MessageBubble";
import type { Message } from "@/types/chat";

const STREAM_ERROR_SENTINEL = "[[STREAM_ERROR]]";
const MAX_HISTORY = 20;

const STATIC_QUICK_PROMPTS = [
  { icon: Wallet, text: "Bagaimana cara mengoptimalkan alokasi gaji bulanan saya?" },
  { icon: PiggyBank, text: "Berapa dana darurat ideal untuk kondisi pengeluaran saya saat ini?" },
  { icon: TrendingDown, text: "Strategi pelunasan utang berbunga tinggi terbaik buat saya?" },
];

const CONTEXTUAL_PROMPTS = {
  impossible: { icon: AlertCircle, text: "Target tabungan saya defisit — strategi apa yang paling efektif?" },
  tight: { icon: AlertCircle, text: "Anggaran saya sangat ketat, bagaimana cara mengatasinya?" },
  vulnerable: { icon: ShieldCheck, text: "Dana darurat saya kurang dari 3 bulan. Harus mulai dari mana?" },
  hasGoal: { icon: Target, text: "Apakah alokasi investasi saya sudah optimal untuk target yang saya tetapkan?" },
};

interface QuickPromptContext {
  feasibility?: "ok" | "tight" | "impossible" | null;
  emergencyCoverage?: number | null;
  hasGoal?: boolean;
  hasProfile?: boolean;
}

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [promptContext, setPromptContext] = useState<QuickPromptContext>({});
  const [contextSynced, setContextSynced] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll ke bawah setiap kali pesan berubah (Req 2.3).
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-resize textarea mengikuti isi.
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`;
  }, [input]);

  // Muat konteks finansial dari API Budget untuk quick prompt kontekstual.
  useEffect(() => {
    (async () => {
      try {
        const [budgetRes, goalRes] = await Promise.all([
          fetch("/api/budget", { method: "GET" }),
          fetch("/api/goal", { method: "GET" }),
        ]);
        const ctx: QuickPromptContext = {};
        if (budgetRes.ok) {
          const budgetData = await budgetRes.json();
          ctx.hasProfile = budgetData?.defaultMonthlyIncome != null;
          if (budgetData?.latestPlan?.breakdown) {
            ctx.feasibility = budgetData.latestPlan?.savingsTargetAmount ? "ok" : null;
          }
          const income = budgetData?.defaultMonthlyIncome;
          const expense = budgetData?.monthlyExpense;
          const savings = budgetData?.currentSavings;
          if (expense > 0 && savings != null) {
            ctx.emergencyCoverage = savings / expense;
          }
        }
        if (goalRes.ok) {
          const goalData = await goalRes.json();
          ctx.hasGoal = goalData?.id != null;
        }
        setPromptContext(ctx);
        setContextSynced(true);
      } catch {
        /* offline — tampilkan prompt statis */
        setContextSynced(false);
      }
    })();
  }, []);

  async function handleSend(text: string) {
    const trimmed = text.trim();
    if (!trimmed || isGenerating) return;

    const history = messages.slice(-MAX_HISTORY);
    setInput("");
    setIsGenerating(true);

    // Tambah pesan user + placeholder bubble model.
    setMessages((prev) => [
      ...prev,
      { role: "user", content: trimmed },
      { role: "model", content: "" },
    ]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed, history }),
      });

      // Error sebelum stream (Req 7.1).
      if (!res.ok || !res.body) {
        let msg = "Maaf, terjadi kesalahan. Coba lagi sebentar.";
        try {
          const data = await res.json();
          if (data?.error) msg = data.error;
        } catch {
          /* body bukan JSON, pakai pesan default */
        }
        appendToLastModel(msg, true);
        return;
      }

      // Baca stream teks polos.
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });

        // Deteksi sentinel error mid-stream (Req 7.2).
        if (acc.includes(STREAM_ERROR_SENTINEL)) {
          const clean = acc.replace(STREAM_ERROR_SENTINEL, "").trimEnd();
          setLastModel(
            `${clean}\n\n_Koneksi terputus di tengah proses. Silakan coba lagi._`,
          );
          break;
        }

        setLastModel(acc);
      }
    } catch {
      appendToLastModel("Maaf, gagal terhubung ke server. Periksa koneksi Anda.", true);
    } finally {
      setIsGenerating(false);
    }
  }

  /** Set isi bubble model terakhir ke nilai tertentu. */
  function setLastModel(content: string) {
    setMessages((prev) => {
      const next = [...prev];
      for (let i = next.length - 1; i >= 0; i--) {
        if (next[i].role === "model") {
          next[i] = { ...next[i], content };
          break;
        }
      }
      return next;
    });
  }

  /** Isi bubble model terakhir; jika kosong pakai fallback. */
  function appendToLastModel(content: string, replace = false) {
    setMessages((prev) => {
      const next = [...prev];
      for (let i = next.length - 1; i >= 0; i--) {
        if (next[i].role === "model") {
          next[i] = {
            ...next[i],
            content: replace ? content : next[i].content + content,
          };
          break;
        }
      }
      return next;
    });
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    handleSend(input);
  }

  const isEmpty = messages.length === 0;

  return (
    <div className="flex h-dvh flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-3xl items-center gap-2.5 px-4 py-3.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-[var(--accent)] to-[var(--accent-2)]">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <h1 className="text-[0.95rem] font-medium tracking-tight text-foreground">
            TabungOne
          </h1>
          {contextSynced && promptContext.hasProfile && (
            <span className="ml-auto flex items-center gap-1.5 rounded-full border border-emerald-200/60 bg-emerald-50/80 px-2.5 py-1 text-[11px] font-medium text-emerald-700">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
              Data finansial terhubung
            </span>
          )}
        </div>
      </header>

      {/* Area pesan */}
      <main className="scroll-area flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-3xl px-4 py-8">
          {isEmpty ? (
            <EmptyState onPick={handleSend} disabled={isGenerating} context={promptContext} />
          ) : (
            <div className="flex flex-col gap-6">
              {messages.map((m, i) => (
                <MessageBubble
                  key={i}
                  message={m}
                  isPending={isGenerating && i === messages.length - 1}
                />
              ))}
            </div>
          )}
          <div ref={bottomRef} className="h-4" />
        </div>
      </main>

      {/* Input mengambang */}
      <footer className="bg-gradient-to-t from-background via-background to-transparent pb-4 pt-2">
        <div className="mx-auto w-full max-w-3xl px-4">
          <form
            onSubmit={onSubmit}
            className="flex items-end gap-2 rounded-[1.75rem] border border-border bg-surface p-2 shadow-[0_2px_20px_rgba(0,0,0,0.04)] transition-shadow focus-within:shadow-[0_2px_28px_rgba(0,180,216,0.12)]"
          >
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend(input);
                }
              }}
              placeholder="Ceritakan kondisi keuangan Anda..."
              rows={1}
              className="max-h-40 flex-1 resize-none bg-transparent px-3 py-2 text-[0.9375rem] text-foreground placeholder:text-muted focus:outline-none"
            />
            <button
              type="submit"
              disabled={isGenerating || !input.trim()}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-white transition-all duration-200 hover:scale-105 hover:brightness-110 disabled:scale-100 disabled:cursor-not-allowed disabled:bg-border disabled:text-muted"
              aria-label="Kirim"
            >
              <ArrowUp className="h-5 w-5" strokeWidth={2.5} />
            </button>
          </form>
          <p className="mt-2.5 text-center text-xs text-muted">
            Simulasi edukatif, bukan nasihat keuangan tersertifikasi.
          </p>
        </div>
      </footer>
    </div>
  );
}

function EmptyState({
  onPick,
  disabled,
  context,
}: {
  onPick: (text: string) => void;
  disabled: boolean;
  context: QuickPromptContext;
}) {
  // Susun daftar prompt yang paling relevan dengan kondisi pengguna saat ini
  const prompts: { icon: typeof Wallet; text: string }[] = [];

  if (context.feasibility === "impossible") {
    prompts.push(CONTEXTUAL_PROMPTS.impossible);
  } else if (context.feasibility === "tight") {
    prompts.push(CONTEXTUAL_PROMPTS.tight);
  }

  if (context.emergencyCoverage != null && context.emergencyCoverage < 3) {
    prompts.push(CONTEXTUAL_PROMPTS.vulnerable);
  }

  if (context.hasGoal) {
    prompts.push(CONTEXTUAL_PROMPTS.hasGoal);
  }

  // Lengkapi dengan prompt statis sampai minimal 3
  for (const p of STATIC_QUICK_PROMPTS) {
    if (prompts.length >= 3) break;
    prompts.push(p);
  }

  return (
    <div className="flex animate-fade-in flex-col items-center gap-8 py-16 text-center">
      <div className="flex flex-col items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--accent)] to-[var(--accent-2)] shadow-lg shadow-[var(--accent)]/20">
          <Sparkles className="h-8 w-8 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">
            Halo, ada yang bisa dibantu?
          </h2>
          <p className="mt-2 text-[0.9375rem] text-muted">
            {context.hasProfile
              ? "Saya sudah terhubung ke data finansial Anda. Tanyakan apa saja!"
              : "Konsultasikan rencana keuangan Anda. Pilih topik atau ketik langsung."}
          </p>
        </div>
      </div>

      <div className="grid w-full gap-2.5 sm:grid-cols-1">
        {prompts.map((q, i) => {
          const Icon = q.icon;
          return (
            <button
              key={q.text}
              onClick={() => onPick(q.text)}
              disabled={disabled}
              style={{ animationDelay: `${0.1 + i * 0.08}s` }}
              className="group flex animate-fade-in-up items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3.5 text-left text-[0.9375rem] text-foreground transition-all duration-200 hover:border-[var(--accent)]/40 hover:bg-surface-hover disabled:opacity-50"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-[var(--accent)] transition-transform duration-200 group-hover:scale-110">
                <Icon className="h-4 w-4" />
              </span>
              {q.text}
            </button>
          );
        })}
      </div>
    </div>
  );
}
