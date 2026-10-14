import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUserId } from "@/lib/auth/session";
import { trackEvent } from "@/lib/analytics/track";

export const runtime = "nodejs";

interface ProfileBody {
  income: number;
  expense: number;
  currentSavings: number;
}

/** Angka valid jika berupa number, finite, dan >= 0. */
function isNonNegativeFinite(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

/**
 * POST /api/profile — simpan Financial_Profile.
 * Body: { income, expense, currentSavings, userId? }
 * Validasi: income, expense, currentSavings finite dan >= 0.
 */
export async function POST(req: Request) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Silakan login terlebih dahulu." }, { status: 401 });
  }

  let body: ProfileBody;
  try {
    body = (await req.json()) as ProfileBody;
  } catch {
    return NextResponse.json({ error: "Permintaan tidak valid." }, { status: 400 });
  }

  const { income, expense, currentSavings } = body ?? {};

  if (
    !isNonNegativeFinite(income) ||
    !isNonNegativeFinite(expense) ||
    !isNonNegativeFinite(currentSavings)
  ) {
    return NextResponse.json(
      { error: "Pemasukan, pengeluaran, dan tabungan harus berupa angka yang tidak negatif." },
      { status: 400 },
    );
  }

  try {
    const profile = await prisma.financialProfile.create({
      data: {
        income,
        expense,
        currentSavings,
        userId,
      },
    });

    await trackEvent(userId, "profile_completed");

    return NextResponse.json(
      {
        id: profile.id,
        income: profile.income,
        expense: profile.expense,
        currentSavings: profile.currentSavings,
      },
      { status: 201 },
    );
  } catch (err) {
    console.error("[profile] gagal menyimpan FinancialProfile:", err);
    return NextResponse.json(
      { error: "Gagal menyimpan profil. Coba lagi sebentar." },
      { status: 500 },
    );
  }
}

/**
 * GET /api/profile — ambil profil terakhir (untuk Profile_Gate).
 * Sukses → 200 { profile: FinancialProfile | null }.
 */
export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Silakan login terlebih dahulu." }, { status: 401 });
  }

  try {
    const profile = await prisma.financialProfile.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ profile }, { status: 200 });
  } catch (err) {
    console.error("[profile] gagal mengambil FinancialProfile:", err);
    return NextResponse.json(
      { error: "Gagal memuat profil. Coba lagi sebentar." },
      { status: 500 },
    );
  }
}
