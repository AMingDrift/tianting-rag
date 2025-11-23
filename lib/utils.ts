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
      // 动态引入 undici，避免在非 Node.js 环境(Next.js)下引入
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

// 多级限流器配置接口
interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

// 多级内存限流器实现
export class MultiRateLimiter {
  private requests: Map<string, number[]> = new Map();
  private limits: RateLimitConfig[];

  constructor(limits: RateLimitConfig[]) {
    this.limits = limits;
  }

  isAllowed(ip: string): boolean {
    const now = Date.now();
    const timestamps = this.requests.get(ip) || [];

    // 为每个限流级别检查是否超过限制
    for (const limit of this.limits) {
      const recentTimestamps = timestamps.filter(
        (timestamp) => now - timestamp < limit.windowMs
      );

      // 如果任何一个级别超过限制，则拒绝请求
      if (recentTimestamps.length >= limit.maxRequests) {
        return false;
      }
    }

    // 记录当前请求
    timestamps.push(now);
    this.requests.set(ip, timestamps);
    return true;
  }

  // 清理过期的记录以节省内存
  cleanup() {
    const now = Date.now();
    for (const [ip, timestamps] of this.requests.entries()) {
      // 使用最宽松的时间窗口来清理过期记录
      const maxWindow = Math.max(...this.limits.map((l) => l.windowMs));
      const recentTimestamps = timestamps.filter(
        (timestamp) => now - timestamp < maxWindow
      );

      if (recentTimestamps.length === 0) {
        this.requests.delete(ip);
      } else {
        this.requests.set(ip, recentTimestamps);
      }
    }
  }
}
