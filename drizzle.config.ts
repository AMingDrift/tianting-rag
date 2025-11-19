import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./scripts/db.ts",
  out: "./drizzle/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url:
      process.env.DATABASE_URL ||
      "postgresql://postgres:123456@localhost:5432/tianting",
  },
});
