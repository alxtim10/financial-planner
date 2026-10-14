"use client";

import type { ReactNode } from "react";
import { trackClientEvent } from "@/lib/analytics/client";

interface ContactButtonProps {
  href: string;
  consultantId: string;
  method: string;
  children: ReactNode;
}

/**
 * Tombol "Hubungi" konsultan (client) — membuka kanal eksternal via href dan
 * mencatat event funnel `consultant_contact_clicked` (fire-and-forget).
 */
export default function ContactButton({
  href,
  consultantId,
  method,
  children,
}: ContactButtonProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() =>
        trackClientEvent("consultant_contact_clicked", { consultantId, method })
      }
      className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent)] text-[0.9375rem] font-medium text-white transition-all duration-200 hover:brightness-110"
    >
      {children}
    </a>
  );
}
