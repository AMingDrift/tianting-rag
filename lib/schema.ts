import { pgTable, serial, text, jsonb, vector } from "drizzle-orm/pg-core";

export const chunks = pgTable("chunks", {
  id: serial("id").primaryKey(),
  chunk: text("chunk").notNull(),
  meta: jsonb("meta").notNull(),
  embedding: vector("embedding", { dimensions: 1024 }).notNull(),
});
