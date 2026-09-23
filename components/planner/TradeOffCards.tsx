"use client";

import { CalendarClock, Target, Scissors, Sparkles, ArrowRight } from "lucide-react";
import type { TradeOffOption, TradeOffType } from "@/types/usp";

interface TradeOffCardsProps {
  options: TradeOffOption[];
  onApply: (payload: TradeOffOption["actionPayload"]) => void;
}

const TYPE_CONFIG: Record<
  TradeOffType,
  {
    icon: typeof CalendarClock;
    badgeBg: string;
    badgeText: string;
    borderAccent: string;
  }
> = {
  EXTEND_HORIZON: {
    icon: CalendarClock,
    badgeBg: "bg-blue-50 dark:bg-blue-950/40",
    badgeText: "text-blue-700 dark:text-blue-300",
    borderAccent: "hover:border-blue-500/50",
  },
  REDUCE_TARGET: {
    icon: Target,
    badgeBg: "bg-emerald-50 dark:bg-emerald-950/40",
    badgeText: "text-emerald-700 dark:text-emerald-300",
    borderAccent: "hover:border-emerald-500/50",
  },
  REDUCE_WANTS: {
    icon: Scissors,
    badgeBg: "bg-amber-50 dark:bg-amber-950/40",
    badgeText: "text-amber-700 dark:text-amber-300",
    borderAccent: "hover:border-amber-500/50",
  },
};

export default function TradeOffCards({ options, onApply }: TradeOffCardsProps) {
  if (!options || options.length === 0) return null;

  return (
    <div className="flex flex-col gap-3.5 rounded-2xl border border-border/80 bg-surface/60 p-4 backdrop-blur-sm sm:p-5">
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent-soft text-[var(--accent)]">
          <Sparkles className="h-4 w-4" />
        </span>
        <div className="flex flex-col">
          <h4 className="text-sm font-semibold text-foreground">
            Opsi Solusi Penyesuaian (Trade-Off)
          </h4>
          <p className="text-xs text-muted">
            Pilih salah satu alternatif di bawah untuk menyesuaikan target agar dapat tercapai secara realistis.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {options.map((option, idx) => {
          const config = TYPE_CONFIG[option.type] || TYPE_CONFIG.EXTEND_HORIZON;
          const Icon = config.icon;

          return (
            <div
              key={`${option.type}-${idx}`}
              className={`flex flex-col justify-between gap-3.5 rounded-xl border border-border bg-background/80 p-4 transition-all duration-200 hover:shadow-md ${config.borderAccent}`}
            >
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                    <Icon className="h-3.5 w-3.5 text-muted" />
                    {option.title}
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold tabular-nums ${config.badgeBg} ${config.badgeText}`}
                  >
                    {option.impactSummary}
                  </span>
                </div>
                <p className="text-xs leading-relaxed text-muted">
                  {option.description}
                </p>
              </div>

              <button
                type="button"
                onClick={() => onApply(option.actionPayload)}
                className="flex h-9 w-full items-center justify-center gap-1.5 rounded-lg border border-border bg-surface px-3 text-xs font-medium text-foreground transition-colors hover:border-[var(--accent)] hover:bg-accent-soft hover:text-[var(--accent)]"
              >
                <span>Terapkan Solusi</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
