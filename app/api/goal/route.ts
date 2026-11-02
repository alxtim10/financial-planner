import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUserId } from "@/lib/auth/session";
import { trackEvent } from "@/lib/analytics/track";

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
    await trackEvent(userId, "goal_set", { targetAmount, horizonMonths });
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
 * GET /api/goal — ambil tujuan pengguna (multi-tujuan).
 *
 * Mengembalikan:
 *   - `goals`: SEMUA tujuan milik pengguna (createdAt desc) untuk multi-tujuan.
 *   - `goal`: tujuan terbaru (backward-compatible dengan konsumen lama yang
 *     masih membaca satu "Tujuan Aktif").
 *
 * Sukses → 200 { goals: Goal[], goal: Goal | null }.
 */
export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Silakan login terlebih dahulu." }, { status: 401 });
  }

  try {
    const goals = await prisma.goal.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
    // `goal` (singular) tetap disediakan untuk kompatibilitas konsumen lama.
    const goal = goals[0] ?? null;
    return NextResponse.json({ goals, goal }, { status: 200 });
  } catch (err) {
    console.error("[goal] gagal mengambil goal:", err);
    return NextResponse.json(
      { error: "Maaf, gagal memuat data target. Coba lagi sebentar." },
      { status: 500 },
    );
  }
}

interface GoalPatchRequest {
  id?: unknown;
  name?: unknown;
  targetAmount?: unknown;
  horizonMonths?: unknown;
}

/**
 * PATCH /api/goal — perbarui satu tujuan milik pengguna (edit sejati, bukan
 * create baru). Body: { id, name?, targetAmount, horizonMonths }.
 *
 * Validasi sama dengan POST (target > 0; horizon bilangan bulat > 0). Guard
 * kepemilikan: update difilter `where: { id, userId }` sehingga pengguna tidak
 * bisa mengubah tujuan milik orang lain.
 *
 * Sukses → 200 { id, name, targetAmount, horizonMonths }.
 * Tidak ditemukan / bukan milik pengguna → 404.
 */
export async function PATCH(req: Request) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Silakan login terlebih dahulu." }, { status: 401 });
  }

  let body: GoalPatchRequest;
  try {
    body = (await req.json()) as GoalPatchRequest;
  } catch {
    return NextResponse.json({ error: "Permintaan tidak valid." }, { status: 400 });
  }

  const { id, name: rawName, targetAmount, horizonMonths } = body;

  if (typeof id !== "string" || id.trim() === "") {
    return NextResponse.json({ error: "ID tujuan tidak valid." }, { status: 400 });
  }

  const name = typeof rawName === "string" && rawName.trim() !== "" ? rawName.trim() : null;

  if (typeof targetAmount !== "number" || !Number.isFinite(targetAmount) || targetAmount <= 0) {
    return NextResponse.json(
      { error: "Target dana harus berupa angka lebih besar dari 0." },
      { status: 400 },
    );
  }

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
    // updateMany + where userId: guard kepemilikan tanpa membocorkan keberadaan
    // baris milik pengguna lain.
    const result = await prisma.goal.updateMany({
      where: { id, userId },
      data: { name, targetAmount, horizonMonths },
    });
    if (result.count === 0) {
      return NextResponse.json({ error: "Tujuan tidak ditemukan." }, { status: 404 });
    }
    return NextResponse.json(
      { id, name, targetAmount, horizonMonths },
      { status: 200 },
    );
  } catch (err) {
    console.error("[goal] gagal memperbarui goal:", err);
    return NextResponse.json(
      { error: "Maaf, gagal memperbarui target. Coba lagi sebentar." },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/goal — hapus satu tujuan milik pengguna.
 * ID diterima via query `?id=...` atau body JSON `{ id }`.
 *
 * Guard kepemilikan: delete difilter `where: { id, userId }`. Rekomendasi
 * investasi yang menaut `goalId` ini akan "melepaskan" tautannya (goalId di-set
 * null) agar tidak menggantung ke tujuan yang sudah tak ada.
 *
 * Sukses → 200 { deleted: true }. Tidak ditemukan → 404.
 */
export async function DELETE(req: Request) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Silakan login terlebih dahulu." }, { status: 401 });
  }

  let id: string | null = null;
  const url = new URL(req.url);
  const queryId = url.searchParams.get("id");
  if (typeof queryId === "string" && queryId.trim() !== "") {
    id = queryId.trim();
  } else {
    try {
      const body = (await req.json()) as { id?: unknown };
      if (typeof body?.id === "string" && body.id.trim() !== "") {
        id = body.id.trim();
      }
    } catch {
      /* tanpa body JSON — lanjut dengan id dari query (bila ada) */
    }
  }

  if (!id) {
    return NextResponse.json({ error: "ID tujuan tidak valid." }, { status: 400 });
  }

  try {
    const result = await prisma.goal.deleteMany({ where: { id, userId } });
    if (result.count === 0) {
      return NextResponse.json({ error: "Tujuan tidak ditemukan." }, { status: 404 });
    }
    // Lepaskan tautan rekomendasi ke tujuan yang dihapus (best-effort).
    await prisma.investmentRecommendation
      .updateMany({ where: { userId, goalId: id }, data: { goalId: null } })
      .catch((err) => console.error("[goal] gagal melepas tautan rekomendasi:", err));
    return NextResponse.json({ deleted: true }, { status: 200 });
  } catch (err) {
    console.error("[goal] gagal menghapus goal:", err);
    return NextResponse.json(
      { error: "Maaf, gagal menghapus target. Coba lagi sebentar." },
      { status: 500 },
    );
  }
}
