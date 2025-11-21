import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import {
  type FeatureExtractionOutput,
  InferenceClient,
} from "@huggingface/inference";

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
): Promise<FeatureExtractionOutput> {
  const client = new InferenceClient(apiKey);
  return await client.featureExtraction({
    model: model,
    inputs: text,
    provider: "auto",
  });
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
