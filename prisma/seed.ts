import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Seed sederhana: satu Financial_Profile contoh agar dev punya data awal.
async function main() {
  const existing = await prisma.financialProfile.findFirst();
  if (existing) {
    console.log("Seed dilewati: sudah ada FinancialProfile.");
    return;
  }

  const profile = await prisma.financialProfile.create({
    data: {
      income: 10_000_000,
      expense: 6_000_000,
      currentSavings: 20_000_000,
    },
  });

  console.log(`Seed selesai. FinancialProfile dibuat: ${profile.id}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
