import { setProxy, sleep } from "@/lib/utils";
import { createHuggingFace } from "@ai-sdk/huggingface";
import { streamText, UIMessage, convertToModelMessages } from "ai";
import { Client } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";
import { getEmbedding } from "@/lib/utils";
import { groq } from "@ai-sdk/groq";

export const maxDuration = 30;

const EMBEDDING_MODEL = "BAAI/bge-m3";
const TOP_K = 5;

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  await setProxy();
  const HF_API_KEY = process.env.HF_API_KEY || "";
  const huggingface = createHuggingFace({
    apiKey: HF_API_KEY,
  });
  // 取用户最新一条消息作为 query
  const userMsg = messages.filter((m) => m.role === "user").pop();
  // 拼接 parts 里的 text
  const queryText =
    userMsg?.parts?.map((p) => (p.type === "text" ? p.text : "")).join("") ||
    "";
  if (!queryText) {
    return new Response("No user query", { status: 400 });
  }

  // 1. 获取 query embedding
  const queryEmbedding = await getEmbedding(
    queryText,
    HF_API_KEY,
    EMBEDDING_MODEL
  );

  await sleep(2000);

  // 2. 检索数据库相关片段
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  const db = drizzle(client);
  const embeddingStr = `ARRAY[${queryEmbedding.join(",")}]::vector`;
  const result = await db.execute(
    sql.raw(
      `SELECT chunk, meta, embedding, embedding <#> ${embeddingStr} AS cosine_distance
       FROM chunks
       ORDER BY embedding <#> ${embeddingStr}
       LIMIT ${TOP_K}`
    )
  );
  await client.end();
  const topChunks = result.rows as {
    chunk: string;
    meta: unknown;
    embedding: number[];
    cosine_distance: number;
  }[];
  const context = topChunks.map((c) => `${c.chunk}`).join("\n\n");

  // 3. 拼接 prompt，调用大模型
  const systemPrompt = `你是《天听计划：罗斯陷阱》小说问答助手，请结合给定片段和用户问题，精准、简洁地回答。优先用片段内容作答，不要编造。并给出引用的片段内容。`;
  const ragMessages: Omit<UIMessage, "id">[] = [
    {
      role: "system",
      parts: [{ type: "text", text: systemPrompt }],
    },
    {
      role: "user",
      parts: [
        {
          type: "text",
          text: `已检索片段：\n${context}\n\n用户问题：${queryText}`,
        },
      ],
    },
  ];

  const resultStream = streamText({
    model: groq("qwen/qwen3-32b"),
    messages: convertToModelMessages(ragMessages),
  });

  return resultStream.toUIMessageStreamResponse();
}
