// scripts/ingest.ts
import fs from "fs";
import path from "path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import dotenv from "dotenv";
import { getEmbedding, sleep, setProxy } from "../lib/utils.ts";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
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

interface ChunkWithMeta {
  chunk: string;
  meta: {
    chapter: string;
    startInChapter: number; // 在章节内的起始位置（可选）
    globalStart: number; // 在全文中的起始位置（可选）
  };
}

async function chunkText(
  text: string,
  chunkSize = CHUNK_SIZE,
  overlap = CHUNK_OVERLAP
): Promise<ChunkWithMeta[]> {
  // 1. 提取章节边界（保持你的原有逻辑）
  const chapterRegex = /^##\s+第[零一二三四五六七八九十百千\d]+章\s+(.+)$/gm;
  let match;
  const chapters: { title: string; start: number; end: number }[] = [];

  while ((match = chapterRegex.exec(text)) !== null) {
    chapters.push({ title: match[1], start: match.index, end: 0 });
  }

  // 设置每个章节的结束位置
  for (let i = 0; i < chapters.length; i++) {
    chapters[i].end =
      i < chapters.length - 1 ? chapters[i + 1].start : text.length;
  }

  // 如果没有章节，则视为一个整体章节
  if (chapters.length === 0) {
    chapters.push({ title: "Untitled", start: 0, end: text.length });
  }

  console.log("[INFO] 检测到章节：", chapters);

  // 2. 初始化 splitter（支持中日泰等语言）
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize,
    chunkOverlap: overlap,
    separators: [
      "\r\n",
      "\n\n", // 段落
      "\n", // 行
      "。",
      "．",
      ".", // 中文/全角/英文句号
      "？",
      "！",
      "?",
      "!",
      "；",
      ";",
      "，",
      ",",
      "、",
      " ", // 空格
    ],
    keepSeparator: false, // 分隔符不保留在 chunk 中
  });

  const allChunks: ChunkWithMeta[] = [];

  // 3. 对每个章节单独切分
  for (const chapter of chapters) {
    const chapterText = text.slice(chapter.start, chapter.end).trim();
    if (!chapterText) continue;

    console.log(`[INFO] 正在处理章节：${chapterText.slice(0, 30)}...`);

    // 使用 splitter 切分该章节
    const docs = await splitter.createDocuments([chapterText]);

    // 记录该章节在原文中的起始偏移，用于计算 globalStart
    const chapterGlobalStart = chapter.start;

    docs.forEach((doc, idx) => {
      // 估算该 chunk 在章节内的起始位置（近似，因 splitter 可能 trim）
      // 更精确的做法需自定义 lengthFunction 或解析 offset，但通常 meta 足够
      const startInChapter = idx === 0 ? 0 : undefined; // 精确位置较复杂，可省略或估算

      allChunks.push({
        chunk: doc.pageContent,
        meta: {
          chapter: chapter.title,
          globalStart: chapterGlobalStart, // 可用于定位原文
          // 若需更精确位置，可结合源文本匹配，但通常非必需
          startInChapter: startInChapter || 0,
        },
      });
    });
  }

  console.log("[INFO] 检测到 chunk：", allChunks);

  return allChunks;
}

async function main() {
  const novel = readNovel(NOVEL_PATH);
  const chunks = await chunkText(novel);

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
        ? (embeddingRaw[0] as number[])
        : (embeddingRaw as number[]);
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
