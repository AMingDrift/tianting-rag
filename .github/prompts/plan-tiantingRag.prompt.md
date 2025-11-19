## Plan: 天听计划 RAG 个人知识库项目说明文档

本项目基于原创小说《天听计划：罗斯陷阱》，构建一个支持 RAG（检索增强生成）的 AI 个人知识库应用。用户可通过网页界面向 AI 提问，AI 基于小说内容和结构化知识进行智能检索与回答。技术栈采用 Next.js + Vercel AI SDK + LangChain.js + Supabase pgvector + Drizzle + TypeScript + TailwindCSS 4，支持通义千问（OpenAI 兼容）大模型和 BAAI/bge-m3 向量模型。

---

### 项目结构与功能

1. **依赖与环境配置**

   - 包管理器：pnpm@10.12.4（`package.json`中声明）
   - Node.js 版本：22.21.1（`.nvmrc`中声明）
   - 搭配 MCP 工具：context7（用来查阅下载依赖最新版本）
   - 主要依赖：Next.js(开启 React compiler)、@vercel/ai、langchain、@supabase/pgvector、drizzle-orm、tailwindcss@4、typescript
   - 向量模型：BAAI/bge-m3（HuggingFace 链接：<https://huggingface.co/BAAI/bge-m3）>

2. **小说内容分块（Chunking）**

   - 采用分层语义分块法：先按章节，再按段落/场景，最后可选重叠滑动窗口（80 字重叠）
   - 推荐 chunk size：600 字（±100），分隔符包括 `\n\n`、`。`、`！`、`？`、对话结束符
   - 每个 chunk 自动添加元数据（章节、标题、主题、人物、地点等）
   - chunking 过程可单独写为 TypeScript 脚本（如 `pnpm chunking`），在 `package.json` 中配置

3. **向量数据库与检索**

   - 使用 Supabase pgvector 存储 chunk 向量及元数据
   - 通过 LangChain.js 与 Drizzle ORM 实现 embedding、存储、检索与过滤
   - 支持基于元数据的过滤检索（如按人物、主题、地点等）

4. **前端界面与 AI 问答**

   - Next.js + TailwindCSS 4 实现响应式界面
   - 用户输入问题，Vercel AI SDK 调用通义千问（OpenAI 兼容）API
   - 支持上下文增强的 RAG 问答，返回相关小说片段及答案

5. **环境变量与部署**
   - API Key、数据库连接等敏感信息通过 `.env` 管理
   - 支持 Vercel 一键部署

---

### chunking 脚本与流程优化建议

1. 建议 chunking 阶段直接生成 embedding 并写入数据库，减少后续同步成本。
2. 可考虑支持多种分块策略（如按场景、对话、时间线等），便于后续扩展。
3. 建议 chunk 元数据结构标准化（如 JSON Schema），方便前后端协作。
4. chunking 脚本建议支持 Markdown 输入与元数据自动提取。
5. embedding 需适配 BAAI/bge-m3，在 chunking 阶段使用本地部署，在检索阶段使用 HuggingFace 的免费 API。

---

前端可扩展为多轮对话、片段高亮、元数据筛选等功能
