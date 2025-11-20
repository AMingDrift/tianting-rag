import path from "path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import dotenv from "dotenv";
import { getEmbedding, sleep } from "../lib/utils.ts";
import { Client } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";

import { ProxyAgent, setGlobalDispatcher } from "undici";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({
  path: path.resolve(__dirname, "../.env"),
  override: false,
  quiet: true,
});

const HF_API_KEY = process.env.HF_API_KEY || "";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || ""; // 通义千问的API Key
const OPENAI_API_BASE = process.env.OPENAI_API_BASE || ""; // 通义千问兼容OpenAI的endpoint

const PROXY_URL = process.env.PROXY_URL || "";
if (PROXY_URL) {
  // 设置全局 dispatcher
  const proxyAgent = new ProxyAgent({
    uri: PROXY_URL,
    keepAliveTimeout: 10000,
    keepAliveMaxTimeout: 10000,
    connect: {
      rejectUnauthorized: false, // 开发环境
    },
  });
  setGlobalDispatcher(proxyAgent);
}

const QUERY_LIST = [
  "“天听计划”是在哪一年正式启动的？其核心原则是什么？",
  "丁仪发现了罗斯信号中的哪两处“地球专属”的异常细节，从而怀疑这是伪造的？",
  "文中丁仪提到的“伪清洁鱼”比喻，想要说明什么道理？",
  "为什么丁仪认为，即使人类文明在未来百年内技术突飞猛进，也无法对罗斯文明构成威胁？",
  "《天听计划》如何通过“开拓者舰队”与“火种计划”的对比，体现对“黑暗森林”理论的不同应对策略？",
];

const EMBEDDING_MODEL = "BAAI/bge-m3";
const TOP_K = 5;

async function main() {
  // 1. 连接数据库
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  const db = drizzle(client);

  for (const QUERY_TEXT of QUERY_LIST) {
    // 2. 获取 query embedding
    const queryEmbedding = await getEmbedding(
      QUERY_TEXT,
      HF_API_KEY,
      EMBEDDING_MODEL
    );

    //   console.log("queryEmbedding:", queryEmbedding);

    // 3. pgvector 余弦相似度检索（直接用 SQL）
    // 注意：embedding <=> $1 是 pgvector 的欧氏距离，cosine 距离用 embedding <#> $1
    // drizzle.execute 不支持参数绑定数组，需手动拼接 embedding
    const embeddingStr = `ARRAY[${queryEmbedding.join(",")}]::vector`;
    const result = await db.execute(
      sql.raw(
        `SELECT chunk, meta, embedding, embedding <#> ${embeddingStr} AS cosine_distance
       FROM chunks
       ORDER BY embedding <#> ${embeddingStr}
       LIMIT ${TOP_K}`
      )
    );
    const topChunks = result.rows as {
      chunk: string;
      meta: unknown;
      embedding: number[];
      cosine_distance: number;
    }[];
    const context = topChunks
      .map((c, i) => `【片段${i + 1}】${c.chunk}`)
      .join("\n\n");

    // 4. 用 langchain.js 调用通义千问大模型（OpenAI 兼容接口）
    const llm = new ChatOpenAI({
      openAIApiKey: OPENAI_API_KEY,
      configuration: {
        baseURL: OPENAI_API_BASE,
      },
      modelName: "qwen-turbo", // 通义千问的模型名
      temperature: 0.2,
    });

    const systemPrompt = `你是《天听计划：罗斯陷阱》小说问答助手，请结合给定片段和用户问题，精准、简洁地回答。优先用片段内容作答，不要编造。`;
    const messages = [
      new SystemMessage(systemPrompt),
      new HumanMessage(`已检索片段：\n${context}\n\n用户问题：${QUERY_TEXT}`),
    ];
    const res = await llm.invoke(messages);
    console.log("AI回答：", res.content);

    console.log("--------------------------------------------------------");
    await sleep(3000);
  }

  await client.end();
}

main().catch(console.error);
