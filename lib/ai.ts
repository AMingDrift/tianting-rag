// lib/ai.ts
import { createOpenAI } from "@ai-sdk/openai";

// 创建通义千问的 OpenAI 兼容 provider
export const qwen = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY || "", // 你的通义千问 API Key
  baseURL: process.env.OPENAI_API_BASE || "", // 通义千问的兼容接口地址
});
