import { defineConfig } from "prisma/config";

// DATABASE_URL is provided by Railway. `prisma generate` does not need a live
// database, so a placeholder keeps local builds working without one.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env.DATABASE_URL ?? "postgresql://placeholder:placeholder@localhost:5432/placeholder",
  },
});
