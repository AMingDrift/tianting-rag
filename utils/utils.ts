import { InferenceClient } from "@huggingface/inference";

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
