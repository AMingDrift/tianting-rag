// scripts/ingest.ts
import fs from "fs";
import path from "path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import dotenv from "dotenv";
import { getEmbedding, sleep, setProxy } from "../lib/utils.ts";

// 👇 创建专用的 Supabase 服务端客户端（用于脚本）
import { createClient } from "@supabase/supabase-js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({
  path: path.resolve(__dirname, "../.env"),
  override: false,
  quiet: true,
});

const HF_API_KEY = process.env.HF_API_KEY || "";
const SUPABASE_URL = process.env.SUPABASE_URL!; // 注意：不是 NEXT_PUBLIC_ 前缀
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY in .env");
}

// 配置
const NOVEL_PATH = path.resolve(__dirname, "../doc/tianting.md");
const CHUNK_SIZE = 600;
const CHUNK_OVERLAP = 80;
const EMBEDDING_MODEL = "BAAI/bge-m3";

function readNovel(filePath: string): string {
  return fs.readFileSync(filePath, "utf-8");
}

function chunkText(
  text: string,
  chunkSize = CHUNK_SIZE,
  overlap = CHUNK_OVERLAP
): { chunk: string; meta: unknown }[] {
  const chapterRegex = /^##+\s*(.+)$/gm;
  let match;
  const chapters: { title: string; start: number; end: number }[] = [];
  while ((match = chapterRegex.exec(text)) !== null) {
    chapters.push({ title: match[1], start: match.index, end: 0 });
  }
  chapters.forEach((c, i) => {
    c.end = i < chapters.length - 1 ? chapters[i + 1].start : text.length;
  });

  const chunks: { chunk: string; meta: unknown }[] = [];
  for (const chapter of chapters) {
    const chapterText = text.slice(chapter.start, chapter.end).trim();
    let pos = 0;
    while (pos < chapterText.length) {
      const chunk = chapterText.slice(pos, pos + chunkSize);
      const meta = {
        chapter: chapter.title,
        start: pos,
        end: pos + chunk.length,
      };
      chunks.push({ chunk, meta });
      if (pos + chunkSize >= chapterText.length) break;
      pos += chunkSize - overlap;
    }
  }
  return chunks;
}

async function main() {
  const novel = readNovel(NOVEL_PATH);
  const chunks = chunkText(novel);

  await setProxy();

  // 👇 使用 service role key 创建客户端（高权限）
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  for (let i = 0; i < chunks.length; i++) {
    const { chunk, meta } = chunks[i];
    console.log(`[${i + 1}/${chunks.length}] 正在生成 embedding...`);

    const embeddingRaw = await getEmbedding(chunk, HF_API_KEY, EMBEDDING_MODEL);
    let embedding: number[] = [];
    if (typeof embeddingRaw === "number") {
      embedding = [embeddingRaw];
    } else if (Array.isArray(embeddingRaw)) {
      embedding = Array.isArray(embeddingRaw[0])
        ? embeddingRaw[0]
        : embeddingRaw;
    }

    // 👇 直接用 Supabase SDK 插入
    const { error } = await supabase.from("chunks").insert({
      chunk,
      meta,
      embedding, // Supabase 自动转为 vector
    });

    if (error) {
      console.error("插入失败:", error);
      throw error;
    }

    console.log({
      meta,
      chunk: chunk.slice(0, 40) + "...",
      embedding: embedding.slice(0, 5),
    });

    await sleep(3000); // 避免 API 限流
  }

  console.log("✅ 所有 chunks 已成功写入 Supabase！");
}

main().catch(console.error);

export { chunkText, readNovel };
