import { MapPin, Star, Briefcase, MessageCircle, Mail, Phone } from "lucide-react";
import { buildContactHref, contactLabel } from "@/lib/consultants";
import type { FinancialConsultant, ContactMethod } from "@/types/consultant";

interface ConsultantCardProps {
  consultant: FinancialConsultant;
}

/** Ikon tombol kontak sesuai metode. */
const CONTACT_ICON: Record<ContactMethod, typeof MessageCircle> = {
  whatsapp: MessageCircle,
  email: Mail,
  phone: Phone,
};

/** Inisial dari nama untuk avatar sederhana (mis. "Rina Pratiwi" → "RP"). */
function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

/**
 * ConsultantCard — kartu profil konsultan (view-only) + tombol "Hubungi".
 *
 * Hanya menampilkan informasi dan membuka kanal kontak eksternal
 * (WhatsApp/email/telepon) lewat href. Tidak ada booking/penyimpanan data.
 */
export default function ConsultantCard({ consultant }: ConsultantCardProps) {
  const { name, title, specialties, bio, location, experienceYears, rating, contact } =
    consultant;
  const Icon = CONTACT_ICON[contact.method];
  const href = buildContactHref(contact);

  return (
    <article className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-5 shadow-[0_2px_20px_rgba(0,0,0,0.04)]">
      <div className="flex items-start gap-3.5">
        <span
          aria-hidden
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-sm font-semibold text-[var(--accent)]"
        >
          {initials(name)}
        </span>
        <div className="flex min-w-0 flex-col gap-0.5">
          <h3 className="text-base font-semibold text-foreground">{name}</h3>
          <p className="text-sm text-muted">{title}</p>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {location}
            </span>
            <span className="flex items-center gap-1">
              <Briefcase className="h-3.5 w-3.5" />
              {experienceYears} tahun
            </span>
            <span className="flex items-center gap-1">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
              <span className="tabular-nums">
                {rating.toLocaleString("id-ID", { minimumFractionDigits: 1 })}
              </span>
            </span>
          </div>
        </div>
      </div>

      <p className="text-sm leading-relaxed text-muted">{bio}</p>

      <ul className="flex flex-wrap gap-1.5">
        {specialties.map((s) => (
          <li
            key={s}
            className="rounded-full bg-accent-soft px-2.5 py-0.5 text-[11px] font-medium text-[var(--accent)]"
          >
            {s}
          </li>
        ))}
      </ul>

      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent)] text-[0.9375rem] font-medium text-white transition-all duration-200 hover:brightness-110"
      >
        <Icon className="h-4 w-4" />
        {contactLabel(contact.method)}
      </a>
    </article>
  );
}
