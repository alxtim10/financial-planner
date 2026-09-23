"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MessageCircle, X } from "lucide-react";
import ChatInterface from "@/components/ChatInterface";

/**
 * ChatDrawer membungkus <ChatInterface /> sebagai panel geser dari kanan.
 *
 * Bersifat self-contained: merender tombol pemicu (trigger) sendiri DAN panel,
 * dengan state buka/tutup dikelola internal via useState. Dengan begitu komponen
 * bisa langsung di-mount di `app/layout.tsx` (Task 8.2 akan memosisikan trigger
 * di sudut kanan atas). Logika/stream `ChatInterface` tidak diubah sama sekali.
 *
 * Props (semua opsional):
 * - triggerClassName: kelas tambahan untuk tombol pemicu (mis. penempatan fixed
 *   di sudut kanan atas oleh layout).
 * - triggerLabel: aria-label tombol pemicu (default "Buka asisten AI").
 * - ariaLabel: aria-label panel dialog (default "Asisten AI").
 * - defaultOpen: apakah drawer terbuka saat pertama render (default false).
 */
export interface ChatDrawerProps {
  triggerClassName?: string;
  triggerLabel?: string;
  ariaLabel?: string;
  defaultOpen?: boolean;
}

export default function ChatDrawer({
  triggerClassName = "",
  triggerLabel = "Buka asisten AI",
  ariaLabel = "Asisten AI",
  defaultOpen = false,
}: ChatDrawerProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const panelRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setIsOpen(false), []);
  const open = useCallback(() => setIsOpen(true), []);

  // Tutup via Escape; listener dibersihkan saat unmount / saat drawer tertutup.
  useEffect(() => {
    if (!isOpen) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen, close]);

  // Pindahkan fokus ke panel saat drawer terbuka (a11y).
  useEffect(() => {
    if (isOpen) {
      panelRef.current?.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [isOpen]);

  return (
    <>
      {/* Tombol pemicu */}
      <button
        type="button"
        onClick={open}
        aria-label={triggerLabel}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        className={
          "flex h-10 w-10 items-center justify-center rounded-full bg-[var(--accent)] text-white shadow-lg transition-all duration-200 hover:scale-105 hover:brightness-110 " +
          triggerClassName
        }
      >
        <MessageCircle className="h-5 w-5" />
      </button>

      {/* Backdrop */}
      <div
        aria-hidden="true"
        onClick={close}
        className={
          "fixed inset-0 z-40 bg-black/40 transition-opacity duration-300 " +
          (isOpen ? "opacity-100" : "pointer-events-none opacity-0")
        }
      />

      {/* Panel geser */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        tabIndex={-1}
        className={
          "fixed inset-y-0 right-0 z-50 flex h-dvh w-full max-w-md flex-col bg-background shadow-2xl transition-transform duration-300 ease-out focus:outline-none " +
          (isOpen ? "translate-x-0" : "translate-x-full")
        }
      >
        {/* Tombol tutup mengambang di atas header ChatInterface */}
        <button
          type="button"
          onClick={close}
          aria-label="Tutup asisten AI"
          className="absolute right-3 top-3 z-20 flex h-8 w-8 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Bungkus ChatInterface agar mengisi tinggi panel tanpa double-scroll.
            ChatInterface sendiri sudah `h-dvh flex flex-col`; container ini
            mengurungnya dengan `h-full overflow-hidden`. */}
        <div className="h-full overflow-hidden">
          <ChatInterface />
        </div>
      </div>
    </>
  );
}
