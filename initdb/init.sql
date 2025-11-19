-- 启用 pgvector 扩展
CREATE EXTENSION IF NOT EXISTS vector;

-- 可选：创建索引以加速向量相似性搜索
-- CREATE INDEX IF NOT EXISTS idx_chunks_embedding ON chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);