import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUserId } from "@/lib/auth/session";

export const runtime = "nodejs";

interface GoalRequest {
  name?: unknown;
  targetAmount?: unknown;
  horizonMonths?: unknown;
}

/**
 * POST /api/goal — simpan Goal.
 * Menerima `name` opsional (di-trim; string kosong → null).
 * Validasi: targetAmount finit & > 0; horizonMonths finit, integer, & > 0.
 * Sukses → 201 { id, name, targetAmount, horizonMonths }.
 */
export async function POST(req: Request) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Silakan login terlebih dahulu." }, { status: 401 });
  }

  let body: GoalRequest;
  try {
    body = (await req.json()) as GoalRequest;
  } catch {
    return NextResponse.json({ error: "Permintaan tidak valid." }, { status: 400 });
  }

  const { name: rawName, targetAmount, horizonMonths } = body;

  // Normalisasi name: bila string → trim, string kosong → null; selain itu null.
  const name = typeof rawName === "string" && rawName.trim() !== "" ? rawName.trim() : null;

  // Validasi targetAmount: harus angka finit dan lebih besar dari 0.
  if (typeof targetAmount !== "number" || !Number.isFinite(targetAmount) || targetAmount <= 0) {
    return NextResponse.json(
      { error: "Target dana harus berupa angka lebih besar dari 0." },
      { status: 400 },
    );
  }

  // Validasi horizonMonths: harus angka finit, bilangan bulat, dan lebih besar dari 0.
  if (typeof horizonMonths !== "number" || !Number.isFinite(horizonMonths) || horizonMonths <= 0) {
    return NextResponse.json(
      { error: "Jangka waktu (bulan) harus berupa angka lebih besar dari 0." },
      { status: 400 },
    );
  }
  if (!Number.isInteger(horizonMonths)) {
    return NextResponse.json(
      { error: "Jangka waktu harus dalam bilangan bulan yang bulat." },
      { status: 400 },
    );
  }

  try {
    const goal = await prisma.goal.create({
      data: { name, targetAmount, horizonMonths, userId },
    });
    return NextResponse.json(
      {
        id: goal.id,
        name: goal.name,
        targetAmount: goal.targetAmount,
        horizonMonths: goal.horizonMonths,
      },
      { status: 201 },
    );
  } catch (err) {
    console.error("[goal] gagal menyimpan goal:", err);
    return NextResponse.json(
      { error: "Maaf, gagal menyimpan target. Coba lagi sebentar." },
      { status: 500 },
    );
  }
}

/**
 * GET /api/goal — ambil goal terakhir (createdAt desc).
 * Mengembalikan seluruh baris Goal (termasuk `name`) tanpa proyeksi field.
 * Sukses → 200 { goal: Goal | null }.
 */
export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Silakan login terlebih dahulu." }, { status: 401 });
  }

  try {
    const goal = await prisma.goal.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ goal }, { status: 200 });
  } catch (err) {
    console.error("[goal] gagal mengambil goal:", err);
    return NextResponse.json(
      { error: "Maaf, gagal memuat data target. Coba lagi sebentar." },
      { status: 500 },
    );
  }
}
