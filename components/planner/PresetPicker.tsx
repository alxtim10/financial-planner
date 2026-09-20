"use client";

import { Check, LayoutGrid } from "lucide-react";
import { BUDGET_PRESETS } from "@/lib/planner/presets";
import type { PresetId } from "@/types/planner";

interface PresetPickerProps {
  /** Preset yang sedang terpilih; `null` bila belum ada pilihan. */
  selectedId: PresetId | null;
  /** Dipanggil saat pengguna memilih sebuah preset. */
  onSelect: (id: PresetId) => void;
}

/** Daftar preset terurut sesuai definisi di `BUDGET_PRESETS`. */
const PRESETS = Object.values(BUDGET_PRESETS);

/**
 * PresetPicker — memilih 1 dari 3 metode penganggaran preset (Req 3.6, 9.1).
 *
 * Menampilkan 3 kartu terpilih; tiap kartu memuat label preset (mis. "50/30/20")
 * dan rincian kategori beserta persentasenya. Preset terpilih ditandai dengan
 * token aksen Miami blue (`--accent` / `bg-accent-soft`).
 */
export default function PresetPicker({ selectedId, onSelect }: PresetPickerProps) {
  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="mb-1 flex items-center gap-2 text-sm font-medium text-foreground">
        <LayoutGrid className="h-4 w-4 text-[var(--accent)]" />
        Pilih metode penganggaran
      </legend>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {PRESETS.map((preset) => {
          const selected = preset.id === selectedId;
          return (
            <button
              key={preset.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onSelect(preset.id)}
              className={`group flex flex-col gap-3 rounded-xl border p-4 text-left transition-all duration-200 ${
                selected
                  ? "border-[var(--accent)] bg-accent-soft shadow-[0_2px_16px_rgba(0,180,216,0.14)]"
                  : "border-border bg-surface hover:border-[var(--accent)]/50"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-base font-semibold text-foreground">
                  {preset.label}
                </span>
                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors ${
                    selected
                      ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                      : "border-border text-transparent"
                  }`}
                  aria-hidden
                >
                  <Check className="h-3 w-3" />
                </span>
              </div>

              <ul className="flex flex-col gap-1.5">
                {preset.categories.map((cat) => (
                  <li
                    key={cat.name}
                    className="flex items-center justify-between gap-2 text-xs"
                  >
                    <span className="min-w-0 truncate text-muted">{cat.name}</span>
                    <span className="shrink-0 font-medium tabular-nums text-foreground">
                      {cat.percentage}%
                    </span>
                  </li>
                ))}
              </ul>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
