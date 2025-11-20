import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { InferenceClient } from "@huggingface/inference";
// 仅在 Node.js 环境下动态引入 undici

/**
 * Sleep for ms milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 获取文本 embedding
 */
export async function getEmbedding(
  text: string,
  apiKey: string,
  model: string
): Promise<number[]> {
  const client = new InferenceClient(apiKey);
  const res = await client.featureExtraction({
    model,
    inputs: text,
  });
  if (Array.isArray(res)) return res as number[];
  throw new Error("Embedding API 返回异常");
}

export async function setProxy() {
  if (typeof process !== "undefined" && process.versions?.node) {
    console.log("---------------setProxy---------------");
    const PROXY_URL = process.env.PROXY_URL || "";
    if (PROXY_URL) {
      // 动态引入 undici，避免在非 Node.js 环境下引入
      const { ProxyAgent, setGlobalDispatcher } = await import("undici");
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
  }
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
