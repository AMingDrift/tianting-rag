# 天听计划 RAG 个人知识库项目

## 项目功能

- 智能分块处理：自动将小说内容按章节进行语义分块，保留上下文关联
- 向量嵌入生成：使用 HuggingFace bge-m3 模型将文本转换为高维向量
- 相似性检索：利用 pgvector 数据库实现高效的余弦相似度检索
- 智能问答：结合检索到的相关文本片段和通义千问大模型，生成精准回答

## 技术栈

- 前端框架：Next.js 16
- 向量数据库：PostgreSQL + pgvector
- AI 集成：
  - LangChain.js（RAG 框架）+ Vercel AI SDK
  - HuggingFace API（文本嵌入）
  - 通义千问大模型（回答生成）
- 数据库 ORM：Drizzle ORM

## 工作流程

1. 数据预处理：通过 chunking.ts 脚本将小说分块并生成向量嵌入
2. 向量存储：将文本块和对应嵌入存储到 pgvector 数据库
3. 查询处理：
   - 生成查询文本的向量嵌入
   - 在向量数据库中检索最相似的文本片段
   - 将检索结果和问题发送给大模型生成回答

## 应用场景

- 科幻小说内容智能问答和知识检索
- RAG 技术在文学作品分析中的应用示例
- 个人知识库构建与检索增强生成技术的实践项目

项目通过 Docker 提供完整的开发环境，支持本地快速部署和测试，适合学习和探索 RAG 技术的开发者使用。

## 本地开发环境启动

1. 启动 pgvector 数据库（需先安装 Docker Compose）：

```bash
docker compose up -d
```

2. 安装依赖（需先安装 pnpm）：

```bash
pnpm install
```

3. 配置环境变量：

复制 `.env.example` 为 `.env`，并填写 HuggingFace API Key。

4. 生成并运行数据库迁移：

```
pnpm drizzle:generate && pnpm drizzle:migrate
```

5. 运行分块脚本（chunking）：

```bash
pnpm chunking
```

6. 查询脚本：

```bash
pnpm query
```

## 目录说明

- `doc/tianting.md`：自己的随笔小说原文（已同步个人博客 <https://www.amingdrift.com/blog/posts/tian-ting-ji-hua-luo-si-xian-jing> _仅作为测试 RAG 项目，小说设定太多，文学描写较少，可读性不高_
- `scripts/chunking.ts`：分块与 embedding 脚本
- `scripts/query.ts`：查询与问答脚本
- `docker-compose.yml`：本地 pgvector 数据库

## 说明

- embedding 通过 LangChain.js 调用 HuggingFace bge-m3 Inference API
- 所有环境（开发/生产）均用 HF API
- 数据库连接参数见 `.env.example`

## 脚本效果

```typescript
// scripts/query.ts
const QUERY_TEXT = "丁仪和李默在鱼塘边的谈话具体是什么内容";

...
console.log(`查询文本：${QUERY_TEXT}`);

// AI回答： 丁仪和李默在鱼塘边的谈话中，丁仪提到他发现了罗斯信号中的两处疑点。其中一处是1970年4月美国“大力神-3C”火箭因燃料阀批次缺陷爆炸，导致L波段出现72小时频谱空白，这是一次连NASA内部都极少提及的工程事故。丁仪指出，在罗斯信号中出现了与这次事故相关的异常，暗示罗斯文明可能对地球早期信号有深入了解。他进一步比喻说，罗斯文明就像“伪清洁鱼”，通过精准模仿人类来达到某种目的。他警告李默，罗斯文明的技术水平远超人类，甚至可能早已监控地球，并等待人类上钩。

```
