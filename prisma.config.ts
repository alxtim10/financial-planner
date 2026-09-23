import path from "node:path";
import { existsSync } from "node:fs";
import { defineConfig } from "prisma/config";

const envLocal = path.join(process.cwd(), ".env.local");
if (existsSync(envLocal)) {
  process.loadEnvFile(envLocal);
}

export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  migrations: {
    path: path.join("prisma", "migrations"),
    seed: "npx tsx prisma/seed.ts",
  },
});
