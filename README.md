# 嗯哼推文卡片生成器

基于 `tiance-tweet-card-generator` 制作的轻量预览版，默认使用 EnHeng嗯哼.Ai（@EnHeng456）的公开推文。

当前素材库包含 85 条公开内容快照、嗯哼品牌头像、12 张本地摄影背景、原生帖子详情截图和 3:4 海报导出。编辑器采用原创红金品牌主题，帖子截图按照手机端详情页结构排版，正文高度会自然增长。其中 66 条独立推文来自 `0xiang/enheng-skill` 的 111 条精选证据；45 条回复已自动排除，并对现有内容做了去重。证据库字段是公开原文摘录，长文、投资、收益、产品活动和时效性数据在发布前必须回到原推及官方来源复核；页面内容不构成投资建议。

内置摄影背景来自 Unsplash，并已裁切、压缩为本地 1080×1440 WebP 文件，避免外链防盗链导致加载失败。摄影师与原图链接见 [`BACKGROUND_CREDITS.md`](./BACKGROUND_CREDITS.md)。

需要重新导入新版证据库时，下载 `references/evidence.jsonl` 后运行 `npm run content:import -- /path/to/evidence.jsonl`。导入器只保留独立帖子，转换日期与互动数据，按推文 ID、来源链接和正文相似度去重，并保留原推链接及摘录标记。

## 推文自动更新

`.github/workflows/sync-tweets.yml` 每天北京时间 08:20 获取 `@EnHeng456` 最新推文。同步状态保存在 `src/tweet-sync-state.json`，每次只处理上次成功同步之后的内容；回复、转推和重复正文会自动排除。发现新增内容后，GitHub Actions 会更新 `src/tweets.json` 并提交到 `main`，随后触发 Pages 自动部署；没有新增内容时不会产生提交。

在仓库的 `Settings → Secrets and variables → Actions` 中添加名为 `OPENNEWS_TOKEN` 的 Repository secret。密钥只允许保存在 GitHub Secret 中，不得写入源码。也可以在 Actions 页面手动运行 `Sync latest EnHeng tweets`，立即检查新推文。

## GitHub Pages 与 DeepSeek

仓库已包含 GitHub Pages 自动部署流程。Pages 只负责公开前端，不能安全保存 DeepSeek API Key。AI 文案通过独立的服务端接口调用：前端只配置公开的 `VITE_AI_API_BASE_URL`，服务端把 `DEEPSEEK_API_KEY` 保存为 Secret，并通过 `ALLOWED_ORIGIN` 限制允许调用的 Pages 域名。不要把真实密钥写入源码、`.env.example` 或任何以 `VITE_` 开头的变量。

线上后端使用 Cloudflare Worker，配置文件为 `wrangler.jsonc`。部署后通过 `wrangler secret put DEEPSEEK_API_KEY` 交互式保存密钥；密钥不会写入仓库。`ALLOWED_ORIGIN` 固定为 `https://frenx-lab.github.io`，接口还会拒绝不在允许列表中的浏览器来源。`GET /health` 只返回服务状态和密钥是否已配置，不返回密钥内容。

当前生产接口为 `https://enheng-tweet-card-api.faithful-princess.workers.dev`，GitHub Pages 的构建流程已直接使用该公开地址。生产密钥仍需在 Cloudflare Worker 的 Variables and Secrets 中以 Secret 类型添加，变量名必须为 `DEEPSEEK_API_KEY`。
