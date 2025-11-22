// query-supabase.ts
import path from "path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import dotenv from "dotenv";
import { getEmbedding, setProxy, sleep } from "../lib/utils.ts";
import { createClient } from "@supabase/supabase-js";
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { QUERY_LIST } from "../lib/constant.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({
  path: path.resolve(__dirname, "../.env"),
  override: false,
  quiet: true,
});

const HF_API_KEY = process.env.HF_API_KEY || "";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const OPENAI_API_BASE = process.env.OPENAI_API_BASE || "";

// 👇 使用 service_role_key（高权限，可调用 RPC）
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
}

const EMBEDDING_MODEL = "BAAI/bge-m3";
const TOP_K = 5;

async function main() {
  await setProxy();
  // 👇 创建 Supabase 客户端（服务端模式）
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  for (const QUERY_TEXT of QUERY_LIST) {
    console.log(`\n🔍 查询: ${QUERY_TEXT}`);

    // 1. 获取 query embedding
    const queryEmbedding = await getEmbedding(
      QUERY_TEXT,
      HF_API_KEY,
      EMBEDDING_MODEL
    );
    let embeddingArray: number[] = [];
    if (Array.isArray(queryEmbedding)) {
      embeddingArray = Array.isArray(queryEmbedding[0])
        ? queryEmbedding[0]
        : queryEmbedding;
    } else {
      embeddingArray = [queryEmbedding];
    }

    // 2. 调用 Supabase RPC 函数进行向量检索
    const { data, error } = await supabase
      .rpc("match_chunks", {
        query_embedding: embeddingArray,
        match_count: TOP_K,
      })
      .select("chunk, meta, cosine_distance");

    if (error) {
      console.error("向量检索失败:", error);
      continue;
    }

    const topChunks = data as {
      chunk: string;
      meta: unknown;
      cosine_distance: number;
    }[];
    const context = topChunks
      .map((c, i) => `【片段${i + 1}】${c.chunk}`)
      .join("\n\n");

    // 3. 调用大模型
    const llm = new ChatOpenAI({
      openAIApiKey: OPENAI_API_KEY,
      configuration: { baseURL: OPENAI_API_BASE },
      modelName: "qwen-turbo",
      temperature: 0.2,
    });

    const systemPrompt = `你是《天听计划：罗斯陷阱》小说问答助手，请结合给定片段和用户问题，精准、简洁地回答。优先用片段内容作答，不要编造。`;
    const messages = [
      new SystemMessage(systemPrompt),
      new HumanMessage(`已检索片段：\n${context}\n\n用户问题：${QUERY_TEXT}`),
    ];

    const res = await llm.invoke(messages);
    console.log("🤖 AI回答：", res.content);
    console.log("--------------------------------------------------------");

    await sleep(3000);
  }
}

main().catch(console.error);
