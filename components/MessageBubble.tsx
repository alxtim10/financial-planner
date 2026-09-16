import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Sparkles } from "lucide-react";
import type { Message } from "@/types/chat";

interface MessageBubbleProps {
  message: Message;
  /** True bila bubble ini pesan model yang sedang di-stream & masih kosong. */
  isPending?: boolean;
}

export default function MessageBubble({ message, isPending }: MessageBubbleProps) {
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <div className="flex w-full animate-fade-in-up justify-end">
        <div className="max-w-[80%] rounded-3xl rounded-br-lg bg-[var(--accent-soft)] px-4 py-2.5 text-[0.9375rem] leading-relaxed text-foreground">
          <p className="whitespace-pre-wrap break-words">{message.content}</p>
        </div>
      </div>
    );
  }

  // Pesan model: mengalir tanpa bubble kaku, dengan avatar kecil (ala Gemini).
  return (
    <div className="flex w-full animate-fade-in-up gap-3">
      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[var(--accent)] to-[#b06bff]">
        <Sparkles className="h-4 w-4 text-white" />
      </div>
      <div className="min-w-0 flex-1 pt-0.5">
        {isPending && !message.content ? (
          <TypingIndicator />
        ) : (
          <div className="markdown-body break-words text-foreground">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <span className="inline-flex items-center gap-1.5 py-2" aria-label="Sedang mengetik">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-2 w-2 rounded-full bg-[var(--accent)]"
          style={{
            animation: "typing-bounce 1.2s ease-in-out infinite",
            animationDelay: `${i * 0.18}s`,
          }}
        />
      ))}
    </span>
  );
}
