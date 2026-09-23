import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Driver adapter `pg`: koneksi TCP memakai OpenSSL Node (mendukung TLS 1.3),
// menghindari engine native Prisma di macOS yang macet di TLS 1.2 sementara
// pooler Supabase hanya menerima TLS 1.3.
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

// Prisma Client singleton yang aman terhadap hot reload di Next.js dev.
// Tanpa ini, setiap reload membuat instance baru dan menguras koneksi DB.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
