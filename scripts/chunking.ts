import fs from "fs";
import path from "path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import dotenv from "dotenv";
import { getEmbedding, sleep, setProxy } from "../lib/utils.ts";

import { Client } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { chunks as chunksTable } from "./db.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({
  path: path.resolve(__dirname, "../.env"),
  override: false,
  quiet: true,
});

const HF_API_KEY = process.env.HF_API_KEY || "";

setProxy();

// 配置
const NOVEL_PATH = path.resolve(__dirname, "../doc/tianting.md");
const CHUNK_SIZE = 600;
const CHUNK_OVERLAP = 80;
const EMBEDDING_MODEL = "BAAI/bge-m3";
// 读取小说内容
function readNovel(filePath: string): string {
  return fs.readFileSync(filePath, "utf-8");
}

// 简单分块（按章节、段落、滑窗）
function chunkText(
  text: string,
  chunkSize = CHUNK_SIZE,
  overlap = CHUNK_OVERLAP
): { chunk: string; meta: unknown }[] {
  // 按章节分割
  const chapterRegex = /^##+\s*(.+)$/gm;
  let match;
  const chapters: { title: string; start: number; end: number }[] = [];
  while ((match = chapterRegex.exec(text)) !== null) {
    chapters.push({ title: match[1], start: match.index, end: 0 });
  }
  chapters.forEach((c, i) => {
    c.end = i < chapters.length - 1 ? chapters[i + 1].start : text.length;
  });

  // 生成 chunk
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

// 主流程
async function main() {
  const novel = readNovel(NOVEL_PATH);
  const chunks = chunkText(novel);

  // 连接数据库
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  const db = drizzle(client);

  for (let i = 0; i < chunks.length; i++) {
    const { chunk, meta } = chunks[i];
    console.log(`[${i + 1}/${chunks.length}] 正在生成 embedding...`);
    const embedding = await getEmbedding(chunk, HF_API_KEY, EMBEDDING_MODEL);
    // 写入数据库
    await db.insert(chunksTable).values({
      chunk,
      meta,
      embedding,
    });
    console.log({
      meta,
      chunk: chunk.slice(0, 40) + "...",
      embedding: embedding.slice(0, 5),
    });
    await sleep(3000);
  }

  await client.end();
}

main();

// 导出供测试
export { chunkText, readNovel };
