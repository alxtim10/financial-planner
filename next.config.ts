import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // `pg` (dipakai @prisma/adapter-pg) harus tetap di luar bundle server
  // agar dynamic require internalnya tidak diproses Turbopack.
  serverExternalPackages: ["@prisma/adapter-pg", "pg"],
};

export default nextConfig;
