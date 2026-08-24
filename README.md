# 嗯哼推文卡片生成器（20 条预览版）

基于 `tiance-tweet-card-generator` 制作的轻量预览版，默认使用 EnHeng嗯哼.Ai（@EnHeng456）的公开推文。

本版本用于确认视觉和操作流程，包含约 20 条公开内容快照、恩亨头像、12 张本地生成背景、推文卡片和 3:4 海报导出。涉及投资、收益、产品活动和时效性数据的内容，发布前必须回到原推及官方来源复核；页面内容不构成投资建议。

## GitHub Pages 与 DeepSeek

仓库已包含 GitHub Pages 自动部署流程。Pages 只负责公开前端，不能安全保存 DeepSeek API Key。AI 文案通过独立的服务端接口调用：前端只配置公开的 `VITE_AI_API_BASE_URL`，服务端把 `DEEPSEEK_API_KEY` 保存为 Secret，并通过 `ALLOWED_ORIGIN` 限制允许调用的 Pages 域名。不要把真实密钥写入源码、`.env.example` 或任何以 `VITE_` 开头的变量。
