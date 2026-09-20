import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

interface GoalRequest {
  targetAmount?: unknown;
  horizonYears?: unknown;
  userId?: string | null;
}

/**
 * POST /api/goal — simpan Goal.
 * Validasi: targetAmount finit & > 0; horizonYears finit, integer, & > 0.
 * Sukses → 201 { id, targetAmount, horizonYears }.
 */
export async function POST(req: Request) {
  let body: GoalRequest;
  try {
    body = (await req.json()) as GoalRequest;
  } catch {
    return NextResponse.json({ error: "Permintaan tidak valid." }, { status: 400 });
  }

  const { targetAmount, horizonYears, userId = null } = body;

  // Validasi targetAmount: harus angka finit dan lebih besar dari 0.
  if (typeof targetAmount !== "number" || !Number.isFinite(targetAmount) || targetAmount <= 0) {
    return NextResponse.json(
      { error: "Target dana harus berupa angka lebih besar dari 0." },
      { status: 400 },
    );
  }

  // Validasi horizonYears: harus angka finit, bilangan bulat, dan lebih besar dari 0.
  if (typeof horizonYears !== "number" || !Number.isFinite(horizonYears) || horizonYears <= 0) {
    return NextResponse.json(
      { error: "Jangka waktu (tahun) harus berupa angka lebih besar dari 0." },
      { status: 400 },
    );
  }
  if (!Number.isInteger(horizonYears)) {
    return NextResponse.json(
      { error: "Jangka waktu harus dalam bilangan tahun yang bulat." },
      { status: 400 },
    );
  }

  try {
    const goal = await prisma.goal.create({
      data: { targetAmount, horizonYears, userId },
    });
    return NextResponse.json(
      {
        id: goal.id,
        targetAmount: goal.targetAmount,
        horizonYears: goal.horizonYears,
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
 * Sukses → 200 { goal: Goal | null }.
 */
export async function GET() {
  try {
    const goal = await prisma.goal.findFirst({
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
