"use client";

import { Check, LayoutGrid, SlidersHorizontal, PiggyBank, Wallet, ShoppingBag } from "lucide-react";
import { BUDGET_PRESETS } from "@/lib/planner/presets";
import type { CustomAllocation, PresetId } from "@/types/planner";

interface PresetPickerProps {
  /** Preset yang sedang terpilih; `null` bila belum ada pilihan. */
  selectedId: PresetId | null;
  /** Dipanggil saat pengguna memilih sebuah preset. */
  onSelect: (id: PresetId) => void;
  /** Persentase kustom saat ini (dipakai bila kartu Custom aktif). */
  customAllocation: CustomAllocation;
  /** Dipanggil saat salah satu persentase kustom berubah. */
  onCustomAllocationChange: (next: CustomAllocation) => void;
}

/** Daftar preset TETAP terurut sesuai definisi di `BUDGET_PRESETS`. */
const PRESETS = Object.values(BUDGET_PRESETS);

/** Toleransi epsilon untuk pengecekan jumlah = 100 (Req 16.9). */
const SUM_EPSILON = 1e-9;

/** Metadata tiga field Custom_Allocation (Req 16.8). Ditabung = Savings_Bucket. */
const CUSTOM_FIELDS: {
  key: keyof CustomAllocation;
  label: string;
  icon: typeof Wallet;
}[] = [
  { key: "kebutuhan", label: "Kebutuhan", icon: Wallet },
  { key: "keinginan", label: "Keinginan", icon: ShoppingBag },
  { key: "ditabung", label: "Ditabung", icon: PiggyBank },
];

/**
 * PresetPicker — memilih metode penganggaran (Req 3.6, 9.1, 16.8, 16.9).
 *
 * Menampilkan 3 kartu preset TETAP (mis. "50/30/20") dengan rincian kategori,
 * plus kartu keempat **Custom** (Req 16.8). Saat Custom terpilih, komponen
 * merender tiga input persentase (Kebutuhan, Keinginan, Ditabung) dan indikator
 * total berjalan yang menandai bila total ≠ 100 (Req 16.9). Preset terpilih
 * ditandai token aksen Miami blue (`--accent` / `bg-accent-soft`).
 */
export default function PresetPicker({
  selectedId,
  onSelect,
  customAllocation,
  onCustomAllocationChange,
}: PresetPickerProps) {
  const customSelected = selectedId === "custom";
  const customTotal =
    customAllocation.kebutuhan +
    customAllocation.keinginan +
    customAllocation.ditabung;
  const totalIsValid = Math.abs(customTotal - 100) < SUM_EPSILON;

  /** Ubah satu field persentase Custom; kosong → 0, clamp 0..100. */
  function handleFieldChange(key: keyof CustomAllocation, raw: string) {
    const parsed = raw.trim() === "" ? 0 : Number(raw);
    const safe = Number.isFinite(parsed) ? Math.min(100, Math.max(0, parsed)) : 0;
    onCustomAllocationChange({ ...customAllocation, [key]: safe });
  }

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="mb-1 flex items-center gap-2 text-sm font-medium text-foreground">
        <LayoutGrid className="h-4 w-4 text-[var(--accent)]" />
        Pilih metode penganggaran
      </legend>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
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

        {/* Kartu keempat: Custom (Req 16.8) */}
        <button
          type="button"
          role="radio"
          aria-checked={customSelected}
          onClick={() => onSelect("custom")}
          className={`group flex flex-col gap-3 rounded-xl border p-4 text-left transition-all duration-200 ${
            customSelected
              ? "border-[var(--accent)] bg-accent-soft shadow-[0_2px_16px_rgba(0,180,216,0.14)]"
              : "border-border bg-surface hover:border-[var(--accent)]/50"
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2 text-base font-semibold text-foreground">
              <SlidersHorizontal className="h-4 w-4 text-[var(--accent)]" />
              Custom
            </span>
            <span
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors ${
                customSelected
                  ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                  : "border-border text-transparent"
              }`}
              aria-hidden
            >
              <Check className="h-3 w-3" />
            </span>
          </div>
          <p className="text-xs leading-relaxed text-muted">
            Atur sendiri persentasenya
          </p>
        </button>
      </div>

      {/* Input persentase Custom (tampil hanya bila kartu Custom aktif — Req 16.8, 16.9) */}
      {customSelected && (
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4">
          <div className="flex items-start gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-[var(--accent)]">
              <SlidersHorizontal className="h-4 w-4" />
            </span>
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-medium text-foreground">
                Persentase kustom
              </span>
              <span className="text-xs leading-relaxed text-muted">
                Isi persentase tiap kategori. Total harus tepat 100%. Ditabung
                dihitung sebagai pos tabungan.
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
            {CUSTOM_FIELDS.map(({ key, label, icon: Icon }) => {
              const fieldId = `custom-${key}`;
              return (
                <div key={key} className="flex flex-col gap-1.5">
                  <label
                    htmlFor={fieldId}
                    className="flex items-center gap-1.5 text-xs font-medium text-foreground"
                  >
                    <Icon className="h-3.5 w-3.5 text-[var(--accent)]" />
                    {label}
                  </label>
                  <div className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2.5 transition-shadow focus-within:border-[var(--accent)]/50 focus-within:shadow-[0_2px_16px_rgba(0,180,216,0.12)]">
                    <input
                      id={fieldId}
                      name={fieldId}
                      type="number"
                      inputMode="numeric"
                      min={0}
                      max={100}
                      step="any"
                      value={String(customAllocation[key])}
                      onChange={(e) => handleFieldChange(key, e.target.value)}
                      className="min-w-0 flex-1 bg-transparent text-[0.9375rem] tabular-nums text-foreground placeholder:text-muted focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    />
                    <span className="shrink-0 text-sm text-muted">%</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Indikator total berjalan (Req 16.9) */}
          <div
            role="status"
            aria-live="polite"
            className={`flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm font-medium tabular-nums ${
              totalIsValid
                ? "bg-accent-soft text-[var(--accent)]"
                : "bg-red-50 text-red-600"
            }`}
          >
            <span>Total</span>
            <span>
              {totalIsValid
                ? `${Math.round(customTotal * 100) / 100}%`
                : `${Math.round(customTotal * 100) / 100}% — harus 100%`}
            </span>
          </div>
        </div>
      )}
    </fieldset>
  );
}
