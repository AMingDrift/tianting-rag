-- 创建 PostgreSQL 函数（在 Supabase SQL Editor 中执行）

-- 创建向量扩展
CREATE EXTENSION IF NOT EXISTS vector;

-- 创建向量搜索函数（假设 embedding 维度为 1024，按你实际调整）
CREATE OR REPLACE FUNCTION match_chunks(
  query_embedding vector(1024),  -- 👈 替换为你的真实维度，如 1536 / 1024 / 768
  match_count integer DEFAULT 5
)
RETURNS TABLE (
  chunk text,
  meta jsonb,
  embedding vector(1024),
  cosine_distance float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    chunks.chunk,
    chunks.meta,
    chunks.embedding,
    (chunks.embedding <#> query_embedding) AS cosine_distance
  FROM chunks
  ORDER BY chunks.embedding <#> query_embedding
  LIMIT match_count;
END;
$$;

-- 授权给 anon 或 authenticated（根据你的安全策略）
GRANT EXECUTE ON FUNCTION match_chunks TO anon;  -- 如果允许未登录用户搜索
-- 或
-- GRANT EXECUTE ON FUNCTION match_chunks TO authenticated; -- 更安全