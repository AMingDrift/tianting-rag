import { defineConfig } from "drizzle-kit";
import fs from "fs";

export default defineConfig({
  schema: "./scripts/db.ts",
  out: "./drizzle/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url:
      process.env.DATABASE_URL ||
      "postgresql://postgres:123456@localhost:5432/tianting",
    ssl: {
      rejectUnauthorized: true, // 启用验证
      ca: process.env.SUPABASE_CA_CERT
        ? fs.readFileSync(process.env.SUPABASE_CA_CERT, "utf8")
        : undefined, // 信任指定 CA 证书
    },
  },
  verbose: true,
  strict: true,
});
