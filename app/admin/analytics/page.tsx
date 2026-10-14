import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  BarChart3,
  MessageCircle,
  Users,
  UserRound,
} from "lucide-react";
import { prisma } from "@/lib/db";
import { getCurrentUserId, isAdmin } from "@/lib/auth/session";
import {
  computeFunnel,
  formatPercent,
  type FunnelEventRow,
} from "@/lib/analytics/funnel";

// Membaca event dari DB saat request → render dinamis (jangan prerender).
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Analitik Funnel — Tabungin",
  description: "Dashboard analitik funnel (pemilik produk).",
};

/**
 * Dashboard analitik funnel (pemilik produk). Agregasi lintas SEMUA pengguna.
 * Gate: wajib login + `isAdmin` (ADMIN_USERNAME, atau semua user login saat demo).
 */
export default async function AnalyticsDashboardPage() {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/login");

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!isAdmin(user?.username)) redirect("/");

  // Ambil baris event minimal (userId + event). Volume demo kecil → agregasi
  // di memori via pure function. Bila besar, ganti ke COUNT(DISTINCT) SQL.
  const rows = (await prisma.analyticsEvent.findMany({
    select: { userId: true, event: true },
  })) as FunnelEventRow[];

  const report = computeFunnel(rows);

  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto w-full max-w-2xl px-4 py-10 sm:py-14">
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali ke dashboard
        </Link>

        <header className="mb-8 flex flex-col gap-3">
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1 text-xs font-medium text-[var(--accent)]">
            <BarChart3 className="h-3.5 w-3.5" />
            Analitik funnel
          </span>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Funnel Pengguna
          </h1>
          <p className="text-[0.9375rem] leading-relaxed text-muted">
            Pengguna unik di tiap tahap + konversi antar tahap, diagregasi dari
            seluruh pengguna. Dipakai untuk mengukur niat-ke-konversi.
          </p>
        </header>

        {/* Ringkasan atas */}
        <section className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <SummaryCard
            icon={Users}
            label="Total pengguna (ada event)"
            value={report.totalUsers.toLocaleString("id-ID")}
          />
          <SummaryCard
            icon={UserRound}
            label="Minta konsultasi (lead)"
            value={report.intent.consultantBookingUsers.toLocaleString("id-ID")}
          />
          <SummaryCard
            icon={MessageCircle}
            label="Buka chat AI"
            value={report.intent.chatOpenedUsers.toLocaleString("id-ID")}
          />
        </section>

        {/* Funnel inti */}
        <section
          aria-label="Tahap funnel"
          className="mb-8 flex flex-col gap-3 rounded-2xl border border-border bg-surface p-5 shadow-[0_2px_20px_rgba(0,0,0,0.04)] sm:p-6"
        >
          <h2 className="text-base font-semibold text-foreground">Tahap funnel</h2>
          <ol className="flex flex-col gap-3">
            {report.stages.map((stage) => {
              // Lebar bar relatif terhadap tahap pertama (profil).
              const base = report.stages[0]?.uniqueUsers || 0;
              const widthPct =
                base > 0 ? Math.max(4, Math.round((stage.uniqueUsers / base) * 100)) : 0;
              return (
                <li key={stage.event} className="flex flex-col gap-1.5">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-sm font-medium text-foreground">
                      {stage.label}
                    </span>
                    <span className="text-sm text-muted">
                      <span className="font-semibold text-foreground tabular-nums">
                        {stage.uniqueUsers.toLocaleString("id-ID")}
                      </span>{" "}
                      pengguna
                      {stage.conversionFromPrev !== null && (
                        <span className="ml-2 text-xs">
                          (konversi {formatPercent(stage.conversionFromPrev)})
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-accent-soft">
                    <div
                      className="h-full rounded-full bg-[var(--accent)] transition-all"
                      style={{ width: `${widthPct}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ol>
          <p className="mt-1 text-xs text-muted">
            Cabang anggaran: {report.intent.budgetComputedUsers.toLocaleString("id-ID")}{" "}
            pengguna menghitung rencana anggaran (Planner).
          </p>
        </section>

        {/* Total kejadian per event */}
        <section
          aria-label="Total kejadian per event"
          className="mb-8 rounded-2xl border border-border bg-surface p-5 shadow-[0_2px_20px_rgba(0,0,0,0.04)] sm:p-6"
        >
          <h2 className="mb-3 text-base font-semibold text-foreground">
            Total kejadian per event
          </h2>
          <dl className="flex flex-col divide-y divide-border">
            {Object.entries(report.totalsByEvent).map(([event, count]) => (
              <div key={event} className="flex items-center justify-between gap-2 py-2">
                <dt className="font-mono text-xs text-muted">{event}</dt>
                <dd className="text-sm font-semibold tabular-nums text-foreground">
                  {count.toLocaleString("id-ID")}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <p className="text-center text-xs text-muted">
          Data agregat lintas pengguna. Dashboard khusus pemilik produk.
        </p>
      </div>
    </div>
  );
}

/** Kartu ringkasan angka tunggal. */
function SummaryCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Users;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3.5 shadow-[0_2px_20px_rgba(0,0,0,0.04)]">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-[var(--accent)]">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <div className="text-xs text-muted">{label}</div>
        <div className="truncate text-lg font-semibold tabular-nums text-foreground">
          {value}
        </div>
      </div>
    </div>
  );
}
