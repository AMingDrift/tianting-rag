# 天听计划 RAG 个人知识库项目

## 本地开发环境启动

1. 启动 pgvector 数据库（需先安装 Docker Compose）：

```bash
docker-compose up -d
```

2. 安装依赖（需先安装 pnpm）：

```bash
pnpm install
```

3. 配置环境变量：

复制 `.env.example` 为 `.env`，并填写 HuggingFace API Key。

4. 运行分块脚本（chunking）：

```bash
pnpm chunking
```

5. 运行分块单元测试：

```bash
pnpm test:chunking
```

## 目录说明
- `doc/tianting.md`：小说原文
- `scripts/chunking.ts`：分块与 embedding 脚本
- `scripts/chunking.test.ts`：分块与 embedding 单元测试
- `docker-compose.yml`：本地 pgvector 数据库

## 说明
- embedding 通过 LangChain.js 调用 HuggingFace bge-m3 Inference API
- 所有环境（开发/生产）均用 HF API
- 数据库连接参数见 `.env.example`
