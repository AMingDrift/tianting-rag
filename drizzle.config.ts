import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./lib/schema.ts",
  out: "./drizzle/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url:
      process.env.DATABASE_URL ||
      "postgresql://postgres:123456@localhost:5432/tianting",
    ssl: {
      rejectUnauthorized: true, // 启用验证
    },
  },
  verbose: true,
  strict: true,
});
