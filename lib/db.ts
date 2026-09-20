import { PrismaClient } from "@prisma/client";

// Prisma Client singleton yang aman terhadap hot reload di Next.js dev.
// Tanpa ini, setiap reload membuat instance baru dan menguras koneksi DB.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
