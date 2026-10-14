import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { hashPassword } from "../lib/auth/password";

// Pakai driver adapter `pg` (OpenSSL Node, TLS 1.3) seperti lib/db.ts agar
// seed tidak kena gotcha TLS macOS pada engine native Prisma.
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// Seed demo: pastikan ada satu akun demo, lalu "adopsi" semua baris data lama
// yang belum punya pemilik (userId = null) ke akun tersebut. Idempoten — aman
// dijalankan berkali-kali.
async function main() {
  const username = process.env.SEED_USERNAME?.trim() || "demo";
  const password = process.env.SEED_PASSWORD || "demo1234";

  // 1. Buat / temukan akun demo (upsert berdasarkan username unik).
  const existing = await prisma.user.findUnique({ where: { username } });
  const user =
    existing ??
    (await prisma.user.create({
      data: { username, passwordHash: await hashPassword(password) },
    }));

  if (existing) {
    console.log(`Akun demo sudah ada: ${username} (${user.id}).`);
  } else {
    console.log(`Akun demo dibuat: ${username} / ${password} (${user.id}).`);
  }

  // 2. Adopsi baris yatim (userId = null) ke akun demo agar data lama tetap
  //    terlihat setelah login. Hanya menyentuh baris tanpa pemilik.
  const orphanFilter = { where: { userId: null }, data: { userId: user.id } };
  const [profiles, goals, risks, recs, budgets] = await Promise.all([
    prisma.financialProfile.updateMany(orphanFilter),
    prisma.goal.updateMany(orphanFilter),
    prisma.riskAssessment.updateMany(orphanFilter),
    prisma.investmentRecommendation.updateMany(orphanFilter),
    prisma.budgetPlan.updateMany(orphanFilter),
  ]);

  const adopted =
    profiles.count + goals.count + risks.count + recs.count + budgets.count;
  console.log(
    `Baris data lama diadopsi ke akun demo: ${adopted} ` +
      `(profil ${profiles.count}, goal ${goals.count}, risiko ${risks.count}, ` +
      `rekomendasi ${recs.count}, anggaran ${budgets.count}).`,
  );

  // 3. Bila belum ada profil sama sekali untuk akun demo, buat satu contoh.
  const hasProfile = await prisma.financialProfile.findFirst({
    where: { userId: user.id },
  });
  if (!hasProfile) {
    const profile = await prisma.financialProfile.create({
      data: {
        userId: user.id,
        income: 10_000_000,
        expense: 6_000_000,
        currentSavings: 20_000_000,
      },
    });
    console.log(`Profil contoh dibuat untuk akun demo: ${profile.id}.`);
  }

  console.log("Seed selesai.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
