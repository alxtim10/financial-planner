"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import type { PriceTier } from "@/lib/billing/pricing";
import { formatRupiah, yearlySavingPercent } from "@/lib/billing/pricing";

interface PricingCardsProps {
  tiers: PriceTier[];
  currentPlan: "free" | "pro";
}

/**
 * PricingCards — tampilan tier harga Free vs Pro dengan toggle bulanan/tahunan.
 * Angka ilustratif (uji minat). Tidak melakukan transaksi apa pun.
 */
export default function PricingCards({ tiers, currentPlan }: PricingCardsProps) {
  const [yearly, setYearly] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      {/* Toggle siklus */}
      <div className="flex items-center justify-center gap-2">
        <button
          type="button"
          onClick={() => setYearly(false)}
          className={`h-9 rounded-lg px-3 text-sm font-medium transition-colors ${
            !yearly
              ? "bg-[var(--accent)] text-white"
              : "border border-border bg-background text-muted hover:text-foreground"
          }`}
        >
          Bulanan
        </button>
        <button
          type="button"
          onClick={() => setYearly(true)}
          className={`h-9 rounded-lg px-3 text-sm font-medium transition-colors ${
            yearly
              ? "bg-[var(--accent)] text-white"
              : "border border-border bg-background text-muted hover:text-foreground"
          }`}
        >
          Tahunan
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {tiers.map((tier) => {
          const perMonth = yearly ? tier.yearlyPerMonth : tier.monthly;
          const saving = yearlySavingPercent(tier);
          const isCurrent = tier.id === currentPlan;
          const highlight = tier.id === "pro";
          return (
            <div
              key={tier.id}
              className={`flex flex-col gap-3 rounded-2xl border p-5 ${
                highlight
                  ? "border-[var(--accent)]/40 bg-accent-soft/40"
                  : "border-border bg-surface"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-base font-semibold text-foreground">{tier.name}</h3>
                {isCurrent && (
                  <span className="rounded-full border border-border bg-background px-2 py-0.5 text-[11px] font-medium text-muted">
                    Paket kamu
                  </span>
                )}
              </div>

              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-semibold tabular-nums text-foreground">
                  {perMonth > 0 ? formatRupiah(perMonth) : "Gratis"}
                </span>
                {perMonth > 0 && <span className="text-sm text-muted">/bln</span>}
              </div>
              {yearly && tier.id === "pro" && saving > 0 && (
                <span className="w-fit rounded-full bg-[var(--accent)] px-2 py-0.5 text-[11px] font-semibold text-white">
                  Hemat {saving}% dibayar tahunan
                </span>
              )}

              <p className="text-sm text-muted">{tier.tagline}</p>

              <ul className="flex flex-col gap-2 pt-1">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-accent-soft text-[var(--accent)]">
                      <Check className="h-3 w-3" />
                    </span>
                    <span className="text-sm text-foreground">{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      <p className="text-center text-xs text-muted">
        Harga bersifat ilustratif untuk kebutuhan demo; belum ada penagihan.
      </p>
    </div>
  );
}
