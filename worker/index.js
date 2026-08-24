export default {
  async fetch(request, env) {
    const requestUrl = new URL(request.url);
    if (requestUrl.pathname === "/api/generate-douyin-copy") {
      if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(request, env) });
      return generateDouyinCopy(request, env);
    }
    if (requestUrl.pathname === "/api/image-proxy") {
      if (request.method !== "GET") return new Response("Method not allowed", { status: 405 });
      const source = requestUrl.searchParams.get("url");
      let imageUrl;
      try {
        imageUrl = new URL(source);
        if (!["http:", "https:"].includes(imageUrl.protocol) || isPrivateHost(imageUrl.hostname)) throw new Error("invalid URL");
      } catch {
        return new Response("Invalid image URL", { status: 400 });
      }

      try {
        const upstream = await fetch(imageUrl, {
          headers: {
            Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
            "User-Agent": "Mozilla/5.0 (compatible; TianceTweetCard/1.0)",
            Referer: `${imageUrl.protocol}//${imageUrl.host}/`,
          },
          redirect: "follow",
        });
        const contentType = upstream.headers.get("content-type") || "";
        if (!upstream.ok || !contentType.toLowerCase().startsWith("image/")) {
          return new Response("The URL did not return an image", { status: 422 });
        }
        return new Response(upstream.body, {
          headers: {
            "Content-Type": contentType,
            "Cache-Control": "public, max-age=3600",
            "Access-Control-Allow-Origin": "*",
          },
        });
      } catch {
        return new Response("Unable to load remote image", { status: 502 });
      }
    }

    const response = await env.ASSETS.fetch(request);
    const acceptsHtml = request.headers.get("accept")?.includes("text/html");

    if (response.status !== 404 || !acceptsHtml || !["GET", "HEAD"].includes(request.method)) {
      return response;
    }

    const indexUrl = new URL(request.url);
    indexUrl.pathname = "/index.html";
    indexUrl.search = "";
    return env.ASSETS.fetch(new Request(indexUrl, request));
  },
};

const copyStylePrompts = {
  concise: "简洁、克制、观点明确，适合知识类账号",
  resonance: "有情绪共鸣和生活代入感，但不要煽情",
  discussion: "强调讨论价值，并以自然的问题引导评论",
};

function corsHeaders(request, env) {
  const origin = request.headers.get("Origin") || "";
  const allowed = String(env.ALLOWED_ORIGIN || "").split(",").map((item) => item.trim()).filter(Boolean);
  const headers = { "Access-Control-Allow-Headers": "Content-Type", "Access-Control-Allow-Methods": "POST, OPTIONS", "Vary": "Origin" };
  if (origin && allowed.includes(origin)) headers["Access-Control-Allow-Origin"] = origin;
  return headers;
}

function jsonResponse(value, status = 200, request, env) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...corsHeaders(request, env) },
  });
}

async function generateDouyinCopy(request, env) {
  if (request.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405, request, env);
  if (!env.DEEPSEEK_API_KEY) return jsonResponse({ code: "AI_NOT_CONFIGURED", error: "DeepSeek API 尚未配置" }, 503, request, env);

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "请求内容不是有效 JSON" }, 400, request, env);
  }

  const text = typeof body.text === "string" ? body.text.trim() : "";
  const style = Object.hasOwn(copyStylePrompts, body.style) ? body.style : "concise";
  const accountName = typeof body.accountName === "string" ? body.accountName.trim().slice(0, 30) : "";
  if (text.length < 8 || text.length > 6000) return jsonResponse({ error: "卡片正文长度需在 8–6000 字之间" }, 400, request, env);

  const systemPrompt = `你是抖音知识内容编辑。用户会给你一张推文卡片里的原文。你只能为这张卡片生成“发布配文”，绝对不能修改或替换卡片原文。\n\n要求：\n1. 输出 3 个明显不同的中文候选文案，每个 80–180 字。\n2. 配文应补充观看理由、现实场景或讨论角度，不要逐句复述原文。\n3. 不得虚构数据、经历、身份、收益或原作者没有表达的结论。\n4. 不写“私信领取”“点击链接”等强导流话术。\n5. 每个版本结尾包含 2–4 个相关话题标签。\n6. 语气要求：${copyStylePrompts[style]}。\n7. ${accountName ? `账号显示名称为“${accountName}”，可以自然贴合该账号语气，但不要冒充原作者。` : "保持自然的中文口语表达。"}\n8. 只输出 JSON，格式为 {"candidates":["文案1","文案2","文案3"]}。`;

  try {
    const upstream = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${env.DEEPSEEK_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "deepseek-v4-flash",
        thinking: { type: "disabled" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `卡片原文：\n${text}` },
        ],
        response_format: { type: "json_object" },
        temperature: 0.75,
        max_tokens: 1000,
      }),
    });
    if (!upstream.ok) return jsonResponse({ code: "AI_UPSTREAM_ERROR", error: "DeepSeek 暂时无法生成文案" }, 502, request, env);
    const result = await upstream.json();
    const content = result?.choices?.[0]?.message?.content;
    const parsed = JSON.parse(content || "{}");
    const candidates = Array.isArray(parsed.candidates)
      ? parsed.candidates.filter((item) => typeof item === "string" && item.trim()).map((item) => item.trim()).slice(0, 3)
      : [];
    if (candidates.length !== 3) return jsonResponse({ code: "AI_INVALID_OUTPUT", error: "DeepSeek 返回的文案格式不完整" }, 502, request, env);
    return jsonResponse({ candidates }, 200, request, env);
  } catch {
    return jsonResponse({ code: "AI_REQUEST_FAILED", error: "AI 服务请求失败" }, 502, request, env);
  }
}

function isPrivateHost(hostname) {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".localhost") || host === "0.0.0.0" || host === "::1") return true;
  if (/^127\./.test(host) || /^10\./.test(host) || /^192\.168\./.test(host) || /^169\.254\./.test(host)) return true;
  const match = host.match(/^172\.(\d+)\./);
  return Boolean(match && Number(match[1]) >= 16 && Number(match[1]) <= 31);
}
