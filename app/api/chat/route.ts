import { setProxy } from "@/lib/utils";
import {
  streamText,
  UIMessage,
  convertToModelMessages,
  APICallError,
} from "ai";
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
  // 取用户最新一条消息作为 query
  const userMsg = messages.filter((m) => m.role === "user").pop();
  // 拼接 parts 里的 text
  const queryText =
    userMsg?.parts?.map((p) => (p.type === "text" ? p.text : "")).join("") ||
    "";
  if (!queryText) {
    return new Response("No user query", { status: 400 });
  }

  try {
    // 1. 获取 query embedding
    const queryEmbedding = await getEmbedding(
      queryText,
      HF_API_KEY,
      EMBEDDING_MODEL
    );

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
  } catch (error) {
    // 1. 捕获并判断 AI 调用相关错误（如 403、401、500 等）
    if (error instanceof APICallError) {
      console.error("AI API 调用错误：", error); // 日志记录错误详情

      // 解析错误信息（从 error 对象中提取关键信息）
      const errorDetails = {
        status: error.statusCode || 500,
        message: error.responseBody
          ? JSON.parse(error.responseBody).error?.message || "API 调用失败"
          : "未知的 API 错误",
        reason:
          error.statusCode === 403
            ? "可能是 API 密钥无效、权限不足或模型访问受限"
            : error.statusCode === 401
            ? "API 密钥未提供或无效"
            : error.statusCode === 429
            ? "API 调用频率超限"
            : "服务端异常",
      };

      // 2. 向前端返回 SSE 格式的错误响应（适配前端 useChat 钩子）
      const errorStream = new ReadableStream({
        async start(controller) {
          // SSE 格式：data: {JSON}\n\n（前端可解析为错误消息）
          const errorMessage = JSON.stringify({
            type: "error",
            ...errorDetails,
          });
          controller.enqueue(
            new TextEncoder().encode(`data: ${errorMessage}\n\n`)
          );
          controller.close(); // 关闭流
        },
      });

      return new Response(errorStream, {
        status: errorDetails.status,
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
        },
      });
    }

    // 3. 捕获其他普通错误（如参数解析失败、工具函数错误）
    console.error("通用错误：", error);
    const commonError = {
      type: "error",
      status: 400,
      message: "请求处理失败",
      reason: error instanceof Error ? error.message : "未知错误",
    };

    // 返回 SSE 格式错误（或 JSON 格式，根据前端需求选择）
    const errorStream = new ReadableStream({
      start(controller) {
        controller.enqueue(
          new TextEncoder().encode(`data: ${JSON.stringify(commonError)}\n\n`)
        );
        controller.close();
      },
    });

    return new Response(errorStream, {
      status: 400,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
      },
    });
  }
}
