import { useEffect, useMemo, useRef, useState } from "react";
import { toPng } from "html-to-image";
import {
  ArrowsClockwise, BookmarkSimple, Check, CopySimple, DownloadSimple, DotsThree,
  ImageSquare, LinkSimple, MagnifyingGlass, SealCheck, ShieldCheck, Shuffle,
  Sparkle, UploadSimple, WarningCircle,
} from "@phosphor-icons/react";
import tweets from "./tweets.json";
import baseContentSources from "./content-sources.json";
import feishuContentSources from "./feishu-content-sources.json";

function interleaveContentSources(featured, base) {
  const mixed = [];
  const basePerFeatured = 2;
  for (let index = 0; index < Math.max(featured.length, Math.ceil(base.length / basePerFeatured)); index += 1) {
    if (featured[index]) mixed.push(featured[index]);
    mixed.push(...base.slice(index * basePerFeatured, index * basePerFeatured + basePerFeatured));
  }
  return mixed;
}

const contentSources = interleaveContentSources(feishuContentSources, baseContentSources);

const publicAsset = (path) => `${import.meta.env.BASE_URL || "/"}${path.replace(/^\/+/, "")}`;
const aiApiBase = (import.meta.env.VITE_AI_API_BASE_URL || "").replace(/\/$/, "");
const defaultAvatar = publicAsset("assets/enheng-brand.jpg");
const initialTweet = tweets[0];
const backgrounds = [
  { id: "city-night", name: "城市夜色", tags: "城市 夜景 蓝色 建筑 倒影", src: publicAsset("backgrounds/photos/city-night.webp") },
  { id: "fog-railway", name: "雾林铁轨", tags: "森林 雾 铁轨 秋天 氛围", src: publicAsset("backgrounds/photos/fog-railway.webp") },
  { id: "misty-lake", name: "雾中湖泊", tags: "湖泊 森林 雾 绿色 安静", src: publicAsset("backgrounds/photos/misty-lake.webp") },
  { id: "alpine-lake", name: "高山秘境", tags: "高山 湖泊 日出 倒影 自然", src: publicAsset("backgrounds/photos/alpine-lake.webp") },
  { id: "starry-lake", name: "星河湖面", tags: "星空 银河 湖泊 夜晚 蓝色", src: publicAsset("backgrounds/photos/starry-lake.webp") },
  { id: "golden-coast", name: "金色海岸", tags: "海边 日落 橙色 海浪 治愈", src: publicAsset("backgrounds/photos/golden-coast.webp") },
  { id: "snow-mountain", name: "雪山蓝调", tags: "雪山 冬天 蓝色 极简 冰川", src: publicAsset("backgrounds/photos/snow-mountain.webp") },
  { id: "green-architecture", name: "绿意建筑", tags: "建筑 绿色 现代 极简 城市", src: publicAsset("backgrounds/photos/green-architecture.webp") },
  { id: "rainy-bokeh", name: "雨夜光斑", tags: "雨夜 城市 光斑 霓虹 氛围", src: publicAsset("backgrounds/photos/rainy-bokeh.webp") },
  { id: "mountain-road", name: "山间公路", tags: "公路 山脉 旅行 加拿大 风景", src: publicAsset("backgrounds/photos/mountain-road.webp") },
  { id: "japan-neon", name: "东京夜巷", tags: "日本 夜晚 街道 霓虹 城市", src: publicAsset("backgrounds/photos/japan-neon.webp") },
  { id: "sunset-pier", name: "落日码头", tags: "海边 日落 码头 橙色 剪影", src: publicAsset("backgrounds/photos/sunset-pier.webp") },
];

function formatNativeDate(value) {
  const date = new Date(`${value}T00:00:00+08:00`);
  return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
}
function formatMetric(value) {
  if (value === null || value === undefined) return "—";
  if (value >= 10000) {
    const amount = value / 10000;
    return `${amount >= 100 ? Math.round(amount) : amount.toFixed(amount < 10 ? 1 : 0)}万`;
  }
  return value.toLocaleString("zh-CN");
}
function getAdaptiveFontSize(text, preferred, poster = false) {
  const length = text.replace(/\s+/g, "").length;
  const limit = poster
    ? length > 900 ? 12 : length > 700 ? 13 : length > 520 ? 14 : length > 360 ? 16 : length > 260 ? 18 : length > 180 ? 20 : preferred
    : length > 1000 ? 15 : length > 720 ? 17 : length > 520 ? 18 : length > 360 ? 20 : length > 240 ? 21 : preferred;
  return Math.min(preferred, limit);
}
function cleanSentence(value) {
  return value.replace(/https?:\/\/\S+/g, "").split(/[。！？\n]/).map((item) => item.trim()).find((item) => item.length >= 8 && item.length <= 52);
}
const rewriteStyles = [
  { id: "auto", label: "自动换风格" },
  { id: "efficiency", label: "效率对比" },
  { id: "era", label: "时代判断" },
  { id: "practice", label: "具体实操" },
  { id: "cognition", label: "认知反转" },
  { id: "life", label: "生活场景" },
  { id: "codex", label: "Codex工作流" },
  { id: "token", label: "Token自动化" },
];

function createDraft(source, style = "auto", variant = 0) {
  const anchor = cleanSentence(source.text) || "真正重要的不是听懂一个道理，而是把它放进现实里检验";
  const styleIds = rewriteStyles.slice(1).map((item) => item.id);
  const resolved = style === "auto" ? styleIds[variant % styleIds.length] : style;
  const templates = {
    efficiency: [
      `以前看到“${anchor}”，很多人会先花几个小时找资料、列提纲、反复修改。\n\n现在可以换个顺序：把背景、目标和限制交给AI，让它先完成搜索、整理和第一版。人只负责判断哪里不对、哪里值得继续。\n\nAI真正省下来的，不是几分钟打字时间，而是从空白到能动手的那段路。`,
      `“${anchor}”这件事，放到今天可以再往前走一步。\n\n凡是重复搜索、整理、归类和改格式的工作，都可以先让AI跑一遍。你不需要把判断交出去，只需要少做那些没有必要的机械劳动。\n\n同样一天，有人还在从零开始，有人已经拿着AI的初稿做第二轮了。`,
    ],
    era: [
      `“${anchor}。”\n\n这句话放在AI时代，会变得更现实。答案正在越来越便宜，真正拉开差距的，是谁能提出具体问题、验证结果，再把有效做法沉淀下来。\n\n以后不会是AI淘汰所有人，更可能是会调用AI完成工作的人，慢慢替代只会用旧方法重复劳动的人。`,
      `AI带来的变化，不只是多了一个聊天工具。\n\n“${anchor}。”过去这类判断可能只能停在脑子里，现在普通人可以马上让AI帮自己研究、拆解、写出第一版，再拿到现实里验证。\n\n时代变化最明显的地方，就是想法到结果之间的距离正在变短。`,
    ],
    practice: [
      `如果你认同“${anchor}”，不要只收藏。\n\n今天找一个真实任务，把这四样东西一次发给AI：\n1. 事情的背景\n2. 你想得到的结果\n3. 不能碰的边界\n4. 最终交付格式\n\n先让它做出第一版，再逐条检查。AI好不好用，做完一个任务就知道了。`,
      `拿“${anchor}”做一次AI实验。\n\n先让AI反驳这个观点，再让它补充证据，最后要求它给出一个今天能执行的小动作。不要问“你怎么看”，要让它交付一个可以检查的结果。\n\n会不会用AI，不看提示词收藏了多少，只看有没有完成闭环。`,
    ],
    cognition: [
      `很多人以为AI最值钱的是答案。\n\n其实答案越容易得到，“${anchor}”这种判断反而越需要人自己负责。AI可以给你十种解释，却不能替你决定相信哪一种，更不能替你承担结果。\n\n未来更稀缺的可能不是知识，而是提问、判断和行动。`,
      `“${anchor}。”\n\nAI不会让思考变得不重要，恰恰相反。它会迅速生成一堆看起来都对的东西，逼着人分辨什么是真的、什么适合自己。\n\n模型负责扩大选项，人负责收敛选择。这才是比较舒服的人机分工。`,
    ],
    life: [
      `AI改变生活，通常不是从一件很宏大的事开始。\n\n可能只是读一份看不懂的文件、比较几个选择、整理一次旅行计划，或者把“${anchor}”解释成自己听得懂的话。\n\n当这些小事不再持续消耗注意力，人才能把时间留给更重要的人和决定。`,
      `“${anchor}。”\n\n以前遇到复杂问题，第一反应可能是拖着。现在可以先把材料交给AI，让它整理重点、列出缺失信息，再告诉你下一步问谁、做什么。\n\nAI不一定替你生活，但它可以让很多原本很麻烦的事情，变得更容易开始。`,
    ],
    codex: [
      `“${anchor}”不一定只能写成一段话，也可以直接做成一个工具。\n\n把用户是谁、遇到什么问题、输入什么、输出什么告诉Codex，让它先搭一个最小版本。不会写代码也没关系，先看结果能不能跑，再继续修改。\n\nAI编程最有意思的地方，是普通人的很多想法终于有机会被做出来。`,
      `以前有个小工具的想法，第一道门槛是“我不会写代码”。\n\n现在可以把“${anchor}”背后的需求拆成页面、数据和操作流程，交给Codex做出第一版。你负责描述问题、测试结果、指出哪里不对。\n\n从想法到原型，已经不一定要先学几个月技术。`,
    ],
    token: [
      `如果一件AI任务只做一次，聊天窗口就够了。\n\n如果“${anchor}”背后的工作每天要重复几十次，就应该考虑把模型接进流程：自动读取、分类、生成，再把异常留给人检查。\n\nToken的价值不是多聊几句话，而是让一次有效操作可以持续运行。`,
      `“${anchor}。”\n\n当一个流程已经验证有效，下一步不是每天手动复制粘贴，而是通过模型调用把它批量跑起来。先从最稳定、最重复、结果最容易检查的一步开始。\n\nAI从工具变成生产力，往往就发生在这一步。`,
    ],
  };
  const options = templates[resolved] || templates.efficiency;
  const optionIndex = style === "auto" ? Math.floor(variant / styleIds.length) % options.length : variant % options.length;
  return options[optionIndex];
}

function createSourceDraft(source) {
  if (source.draft) return source.draft;
  return `${source.title}\n\n${source.insight}\n\n${source.angle}\n\n${source.action || "别急着收藏更多工具。先找一件你今天真的要完成的事，用AI跑完一次，再根据结果继续调整。"}`;
}

function seededNumber(key, min, max) {
  let hash = 2166136261;
  for (const character of String(key)) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return min + ((hash >>> 0) % (max - min + 1));
}
function buildDemoMetrics(key, variant = 0) {
  return {
    replies: seededNumber(`${key}-${variant}-replies`, 120, 480),
    reposts: seededNumber(`${key}-${variant}-reposts`, 300, 1400),
    likes: seededNumber(`${key}-${variant}-likes`, 4200, 18000),
    views: seededNumber(`${key}-${variant}-views`, 280000, 4200000),
    bookmarks: seededNumber(`${key}-${variant}-bookmarks`, 520, 5600),
  };
}
function buildPublishCopy(text) {
  const clean = text.replace(/https?:\/\/\S+/g, "").replace(/[#@][^\s]+/g, "").replace(/\s+/g, " ").trim();
  let sentence = "真正有价值的改变，永远从一次具体行动开始";
  if (/(AI|GPT|ChatGPT|Gemini|Token|人工智能)/i.test(clean)) sentence = "AI真正拉开差距的，不是知道多少工具，而是能不能用它解决一个真实问题";
  else if (/(执行|行动|拖延|验证|去做)/.test(clean)) sentence = "真正拉开差距的，从来不是想得多明白，而是愿不愿意马上去做";
  else if (/(问题|思考|认知|判断|理解)/.test(clean)) sentence = "一个真正的好问题，会让你再也回不到原来的看法里";
  else if (/(创业|赚钱|商业|项目|收入|利润)/.test(clean)) sentence = "很多机会并不复杂，真正稀缺的是看见之后愿意马上验证的人";
  else if (/(写作|内容|口播|自媒体|流量|观众)/.test(clean)) sentence = "好内容不是把道理说得更大，而是让人听完愿意多走一步";
  else {
    const candidate = clean.split(/[。！？；]/).map((item) => item.trim()).find((item) => item.length >= 10 && item.length <= 42);
    if (candidate) sentence = candidate;
  }

  const tags = [];
  const add = (tag) => { if (!tags.includes(tag) && tags.length < 2) tags.push(tag); };
  if (/(AI|GPT|ChatGPT|Gemini|Token|人工智能)/i.test(clean)) add("#AI");
  if (/(创业|赚钱|商业|项目|收入|利润)/.test(clean)) { add("#创业"); add("#财富"); }
  if (/(写作|内容|口播|自媒体|流量)/.test(clean)) add("#自媒体");
  if (/(认知|思考|问题|判断)/.test(clean)) add("#认知");
  if (/(自由职业|副业)/.test(clean)) add("#自由职业");
  if (/(成长|学习|执行|行动|拖延)/.test(clean)) add("#个人成长");
  if (tags.length === 0) add("#认知");
  if (tags.length === 1) add("#个人成长");
  return `${sentence} ${tags.join(" ")} #嗯哼`;
}

const publishCopyStyles = [
  { id: "concise", label: "简洁观点", hint: "直接、克制，适合知识号" },
  { id: "resonance", label: "情绪共鸣", hint: "更有代入感，适合成长号" },
  { id: "discussion", label: "引导讨论", hint: "以问题收尾，适合互动号" },
];

function buildLocalPublishCopies(text, style) {
  const base = buildPublishCopy(text);
  const anchor = cleanSentence(text) || "很多真正有价值的改变，都是从一次具体行动开始";
  const tags = base.match(/#[^\s#]+/g)?.slice(0, 3).join(" ") || "#认知 #个人成长 #嗯哼";
  const templates = {
    concise: [
      base,
      `${anchor}。\n\n与其收藏更多道理，不如选一件今天能做的事马上验证。\n\n${tags}`,
      `值得反复提醒自己的一句话：${anchor}。\n\n知道只是开始，真正产生变化的是下一步行动。\n\n${tags}`,
    ],
    resonance: [
      `以前总觉得懂得越多，改变就会自然发生。后来才发现，真正困难的不是听懂，而是把“${anchor}”放进自己的生活。\n\n${tags}`,
      `有些话第一次看到没什么感觉，等真正经历过，才知道它说中了什么。\n\n${anchor}。\n\n${tags}`,
      `我们缺的可能从来不是更多答案，而是在看懂之后，愿意认真走出第一步。\n\n${anchor}。\n\n${tags}`,
    ],
    discussion: [
      `${anchor}。\n\n如果把这个观点放进你的现实经历里，你最认同哪一部分？\n\n${tags}`,
      `这段话最值得讨论的不是结论，而是：我们真的会按照自己相信的东西行动吗？\n\n你怎么看？\n\n${tags}`,
      `${anchor}。\n\n同一件事，不同阶段的人可能会有完全不同的答案。你现在会怎么选择？\n\n${tags}`,
    ],
  };
  return templates[style] || templates.concise;
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

async function fetchImageAsDataUrl(source) {
  let lastError;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetch(source, { cache: attempt === 0 ? "force-cache" : "reload" });
      if (!response.ok) throw new Error(`image ${response.status}`);
      return await blobToDataUrl(await response.blob());
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

async function createStableExportClone(node) {
  if (document.fonts?.ready) await document.fonts.ready;
  const host = document.createElement("div");
  host.className = "stable-export-host";
  const clone = node.cloneNode(true);
  clone.style.width = `${node.offsetWidth}px`;
  if (node.classList.contains("douyin-poster")) clone.style.height = `${node.offsetHeight}px`;
  host.appendChild(clone);
  document.body.appendChild(host);
  try {
    const images = [...clone.querySelectorAll("img")];
    await Promise.all(images.map(async (image) => {
      const source = image.getAttribute("src") || image.src;
      if (!source || source.startsWith("data:")) return;
      image.src = await fetchImageAsDataUrl(new URL(source, window.location.href).href);
      if (image.decode) await image.decode();
    }));
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    return { clone, cleanup: () => host.remove() };
  } catch (error) {
    host.remove();
    throw error;
  }
}

function TweetCard({ cardRef, text, fontSize, metrics, cardTheme, orientation = "portrait", poster = false, profile }) {
  return <article className={`tweet-card theme-${cardTheme} card-${orientation} ${poster ? "poster-tweet-card" : ""}`} ref={cardRef} aria-label="推文图片预览">
    <div className="tweet-detail-nav" aria-hidden="true">
      <span className="tweet-back">←</span>
      <strong>帖子</strong>
      <DotsThree weight="bold" />
    </div>
    <header className="tweet-header">
      <img className="tweet-avatar" src={profile.avatar} alt={`${profile.name}头像`} />
      <div className="tweet-identity">
        <div className="tweet-name-line"><strong>{profile.name}</strong><SealCheck weight="fill" className="verified-icon" /></div>
        <span className="tweet-handle">{profile.handle}</span>
      </div>
    </header>
    <div className="tweet-body" style={{ fontSize: `${fontSize}px` }}>{text}</div>
    <footer className="tweet-native-meta">
      <span>16:27</span><i>·</i><span>{formatNativeDate(profile.date)}</span><i>·</i><strong>{formatMetric(metrics.views)}</strong><span>次查看</span>
    </footer>
  </article>;
}

export function App() {
  const [mode, setMode] = useState("history");
  const [outputMode, setOutputMode] = useState("poster");
  const [orientation, setOrientation] = useState("portrait");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(initialTweet?.id);
  const [draft, setDraft] = useState(() => createDraft(initialTweet));
  const [draftStyle, setDraftStyle] = useState("auto");
  const [draftVariant, setDraftVariant] = useState(0);
  const [sourceQuery, setSourceQuery] = useState("");
  const [sourceCategory, setSourceCategory] = useState("全部");
  const [selectedSourceId, setSelectedSourceId] = useState(contentSources[0].id);
  const [sourceDraft, setSourceDraft] = useState(() => createSourceDraft(contentSources[0]));
  const [fontSize, setFontSize] = useState(22);
  const [cardTheme, setCardTheme] = useState("light");
  const [background, setBackground] = useState(backgrounds[0].src);
  const [backgroundQuery, setBackgroundQuery] = useState("");
  const [backgroundUrl, setBackgroundUrl] = useState("");
  const [overlay, setOverlay] = useState(18);
  const [cardScale, setCardScale] = useState(0.9);
  const [cardPosition, setCardPosition] = useState({ x: 0, y: 0 });
  const [exporting, setExporting] = useState(false);
  const [exported, setExported] = useState(false);
  const [publishCopies, setPublishCopies] = useState([]);
  const [publishCopyIndex, setPublishCopyIndex] = useState(0);
  const [publishCopyStyle, setPublishCopyStyle] = useState("concise");
  const [publishCopyLoading, setPublishCopyLoading] = useState(false);
  const [publishCopySource, setPublishCopySource] = useState("");
  const [publishCopyError, setPublishCopyError] = useState("");
  const [metricsTick, setMetricsTick] = useState(0);
  const [copyStatus, setCopyStatus] = useState("");
  const [profileAvatar, setProfileAvatar] = useState(defaultAvatar);
  const [profileName, setProfileName] = useState("EnHeng嗯哼.Ai");
  const [profileHandle, setProfileHandle] = useState("@EnHeng456");
  const [publishDate, setPublishDate] = useState(() => initialTweet?.date || new Date().toISOString().slice(0, 10));
  const exportRef = useRef(null);
  const posterExportRef = useRef(null);
  const directCardRef = useRef(null);
  const dragStateRef = useRef(null);
  const pinchRef = useRef(null);
  const isMobile = typeof navigator !== "undefined" && /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
  const selected = useMemo(() => tweets.find((tweet) => tweet.id === selectedId) || tweets[0], [selectedId]);
  const selectedSource = useMemo(() => contentSources.find((source) => source.id === selectedSourceId) || contentSources[0], [selectedSourceId]);
  const metricKey = mode === "sources" ? selectedSourceId : selectedId;
  const metrics = useMemo(() => buildDemoMetrics(metricKey, metricsTick), [metricKey, metricsTick]);
  const profile = useMemo(() => ({
    avatar: profileAvatar,
    name: profileName.trim() || "未命名",
    handle: `@${profileHandle.trim().replace(/^@+/, "") || "username"}`,
    date: publishDate || new Date().toISOString().slice(0, 10),
  }), [profileAvatar, profileName, profileHandle, publishDate]);
  const activeText = mode === "history" ? selected.text : mode === "sources" ? sourceDraft : draft;
  const publishCopy = publishCopies[publishCopyIndex] || "";
  const adaptiveCardFontSize = getAdaptiveFontSize(activeText, fontSize, false);
  const adaptivePosterFontSize = getAdaptiveFontSize(activeText, fontSize, true);
  const posterFitScale = activeText.length > 900 ? 0.62 : activeText.length > 700 ? 0.7 : activeText.length > 520 ? 0.78 : activeText.length > 360 ? 0.86 : 1;
  const sourceCategories = ["全部", ...new Set(contentSources.map((source) => source.category))];
  const sourceCategoryCounts = useMemo(() => contentSources.reduce((counts, source) => {
    counts[source.category] = (counts[source.category] || 0) + 1;
    return counts;
  }, {}), []);
  const sourceResults = useMemo(() => {
    const needle = sourceQuery.trim().toLowerCase();
    return contentSources.filter((source) => (sourceCategory === "全部" || source.category === sourceCategory) && (!needle || `${source.title} ${source.insight} ${source.angle} ${source.draft || ""} ${source.action || ""} ${source.sourceName || ""} ${(source.tags || []).join(" ")} ${(source.productFit || []).join(" ")}`.toLowerCase().includes(needle)));
  }, [sourceCategory, sourceQuery]);
  const visibleSourceResults = sourceResults.slice(0, 100);
  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return tweets.slice(0, 12);
    return tweets.filter((tweet) => `${tweet.text} ${tweet.date}`.toLowerCase().includes(needle)).slice(0, 20);
  }, [query]);
  const backgroundResults = useMemo(() => {
    const needle = backgroundQuery.trim().toLowerCase();
    return backgrounds.filter((item) => !needle || `${item.name} ${item.tags}`.toLowerCase().includes(needle));
  }, [backgroundQuery]);
  useEffect(() => setExported(false), [mode, outputMode, orientation, selectedId, draft, fontSize, cardTheme, background, overlay, cardScale, cardPosition, metricsTick, profile]);
  useEffect(() => setCardPosition({ x: 0, y: 0 }), [orientation]);
  useEffect(() => {
    setPublishCopies([]);
    setPublishCopyIndex(0);
    setPublishCopySource("");
    setPublishCopyError("");
    setCopyStatus("");
  }, [mode, selectedId, draft, sourceDraft]);

  function rewriteDraft(tweet = selected, style = draftStyle, nextVariant = draftVariant) { setDraftVariant(nextVariant); setDraft(createDraft(tweet, style, nextVariant)); }
  function selectTweet(tweet) { setSelectedId(tweet.id); setPublishDate(tweet.date); if (mode === "draft") rewriteDraft(tweet); }
  function switchMode(nextMode) { setMode(nextMode); if (nextMode === "draft") rewriteDraft(selected); }
  function chooseDraftStyle(style) { setDraftStyle(style); rewriteDraft(selected, style, draftVariant + 1); }
  function selectSource(source) { setSelectedSourceId(source.id); setSourceDraft(createSourceDraft(source)); }
  function pickRandomSource() {
    const pool = sourceResults.length ? sourceResults : contentSources;
    const alternatives = pool.filter((source) => source.id !== selectedSourceId);
    selectSource((alternatives.length ? alternatives : pool)[Math.floor(Math.random() * (alternatives.length ? alternatives.length : pool.length))]);
  }
  function pickRandom() { const pool = tweets.slice(0, Math.min(100, tweets.length)); selectTweet(pool[Math.floor(Math.random() * pool.length)]); }
  function loadUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setBackground(String(reader.result));
    reader.readAsDataURL(file);
  }
  function loadProfileAvatar(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setProfileAvatar(String(reader.result));
    reader.readAsDataURL(file);
  }
  function applyBackgroundUrl() {
    const value = backgroundUrl.trim();
    if (!value) return;
    try {
      const parsed = new URL(value);
      if (!["http:", "https:"].includes(parsed.protocol)) throw new Error("unsupported protocol");
      setBackground(`${aiApiBase}/api/image-proxy?url=${encodeURIComponent(parsed.href)}`);
    } catch {
      window.alert("请粘贴以 http:// 或 https:// 开头的图片地址。");
    }
  }
  async function generatePublishCopy() {
    if (publishCopyLoading) return publishCopy;
    setPublishCopyLoading(true);
    setPublishCopyError("");
    setCopyStatus("");
    try {
      const response = await fetch(`${aiApiBase}/api/generate-douyin-copy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: activeText, style: publishCopyStyle, accountName: profile.name }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        const error = new Error(payload.error || "AI 服务暂时不可用");
        error.code = payload.code;
        throw error;
      }
      const next = Array.isArray(payload.candidates) ? payload.candidates.filter((item) => typeof item === "string" && item.trim()).slice(0, 3) : [];
      if (!next.length) throw new Error("AI 没有返回可用文案");
      setPublishCopies(next);
      setPublishCopyIndex(0);
      setPublishCopySource("deepseek");
      return next[0];
    } catch (error) {
      const fallback = buildLocalPublishCopies(activeText, publishCopyStyle);
      setPublishCopies(fallback);
      setPublishCopyIndex(0);
      setPublishCopySource("local");
      setPublishCopyError(error?.code === "AI_NOT_CONFIGURED" ? "DeepSeek 尚未配置，当前先使用基础模板。" : "AI 暂时不可用，已自动切换为基础模板。");
      return fallback[0];
    } finally {
      setPublishCopyLoading(false);
    }
  }
  function updatePublishCopy(value) {
    setPublishCopies((current) => current.map((item, index) => index === publishCopyIndex ? value : item));
    setCopyStatus("");
  }
  async function copyDescription() {
    const value = publishCopy || await generatePublishCopy();
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      const input = document.createElement("textarea"); input.value = value; document.body.appendChild(input); input.select(); document.execCommand("copy"); input.remove();
    }
    setCopyStatus("已复制，可直接粘贴到抖音");
    window.setTimeout(() => setCopyStatus(""), 2200);
  }
  function resetCardPlacement() { setCardScale(0.9); setCardPosition({ x: 0, y: 0 }); }
  function startDragging(event) {
    if (outputMode !== "poster") return;
    if (pinchRef.current) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragStateRef.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, origin: cardPosition };
  }
  function dragCard(event) {
    const drag = dragStateRef.current;
    if (!drag || drag.pointerId !== event.pointerId || !exportRef.current) return;
    const rect = exportRef.current.getBoundingClientRect();
    const canvasWidth = 720;
    const canvasHeight = 960;
    const nextX = drag.origin.x + (event.clientX - drag.startX) * (canvasWidth / rect.width);
    const nextY = drag.origin.y + (event.clientY - drag.startY) * (canvasHeight / rect.height);
    const maxX = 260;
    const maxY = 360;
    setCardPosition({ x: Math.max(-maxX, Math.min(maxX, nextX)), y: Math.max(-maxY, Math.min(maxY, nextY)) });
  }
  function stopDragging(event) {
    if (dragStateRef.current?.pointerId === event.pointerId) dragStateRef.current = null;
  }
  function handleTouchStart(e) {
    if (outputMode !== "poster" || e.touches.length !== 2) return;
    dragStateRef.current = null;
    const dx = e.touches[0].clientX - e.touches[1].clientX;
    const dy = e.touches[0].clientY - e.touches[1].clientY;
    pinchRef.current = { dist: Math.hypot(dx, dy), scale: cardScale };
  }
  function handleTouchMove(e) {
    if (!pinchRef.current || e.touches.length !== 2) return;
    e.preventDefault();
    const dx = e.touches[0].clientX - e.touches[1].clientX;
    const dy = e.touches[0].clientY - e.touches[1].clientY;
    const ratio = Math.hypot(dx, dy) / pinchRef.current.dist;
    setCardScale(Math.max(0.55, Math.min(1.2, pinchRef.current.scale * ratio)));
  }
  function handleTouchEnd() { pinchRef.current = null; }
  async function deliverImage(dataUrl, filename) {
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], filename, { type: "image/png" });
      if (isMobile && navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) {
        await navigator.share({ files: [file], title: filename });
      } else if (isMobile) {
        const imageUrl = URL.createObjectURL(blob);
        const previewLink = document.createElement("a");
        previewLink.href = imageUrl;
        previewLink.target = "_blank";
        previewLink.rel = "noopener noreferrer";
        document.body.appendChild(previewLink);
        previewLink.click();
        previewLink.remove();
        window.setTimeout(() => URL.revokeObjectURL(imageUrl), 60000);
        window.alert("图片已打开，请长按图片，选择“存储图像”或“保存到相册”。");
      } else {
        const link = document.createElement("a");
        link.download = filename;
        link.href = dataUrl;
        link.click();
      }
  }
  async function exportNode(node, filename, backgroundColor) {
    if (!node || exporting) return;
    setExporting(true);
    let cleanup = () => {};
    try {
      const stable = await createStableExportClone(node);
      cleanup = stable.cleanup;
      const dataUrl = await toPng(stable.clone, { cacheBust: false, pixelRatio: 2, backgroundColor });
      await deliverImage(dataUrl, filename);
      setExported(true);
      window.setTimeout(() => setExported(false), 1800);
    } catch (error) {
      if (error?.name === "AbortError") return;
      window.alert("这张网络图片禁止跨站导出。请先保存图片，再用“上传自己的背景”导入。");
    } finally {
      cleanup();
      setExporting(false);
    }
  }
  async function downloadImage() {
    const fileLabel = mode === "history" ? selected.date : new Date().toISOString().slice(0, 10);
    const direction = orientation === "landscape" ? "横版" : "竖版";
    const filename = outputMode === "poster" ? `抖音图文-${direction}-${fileLabel}.png` : `推文卡片-${direction}-${fileLabel}.png`;
    return exportNode(outputMode === "poster" ? posterExportRef.current : exportRef.current, filename, outputMode === "poster" ? "#161616" : cardTheme === "light" ? "#ffffff" : "#000000");
  }
  async function exportDirectCard() {
    const fileLabel = mode === "history" ? selected.date : new Date().toISOString().slice(0, 10);
    const direction = orientation === "landscape" ? "横版" : "竖版";
    return exportNode(directCardRef.current, `纯推文卡片-${direction}-${fileLabel}.png`, cardTheme === "light" ? "#ffffff" : "#000000");
  }

  const hasEditor = mode === "draft" || mode === "sources";
  const outputStep = hasEditor ? "04" : "03";
  const backgroundStep = hasEditor ? "05" : "04";
  const finishStep = hasEditor ? (outputMode === "poster" ? "06" : "05") : (outputMode === "poster" ? "05" : "04");

  return <main className="app-shell">
    <header className="topbar"><img className="brand-mark" src={defaultAvatar} alt="嗯哼品牌 Logo" /><div><p className="eyebrow">ENHENG RED SAND STUDIO</p><h1>嗯哼推文卡片生成器</h1></div><div className="privacy-badge"><ShieldCheck weight="fill" /> {tweets.length} 条公开内容 · 本地生成</div></header>
    <div className="app-grid">
      <aside className="control-panel">
        <section className="panel-section mode-section"><div className="section-heading"><span className="step-number">01</span><div><h2>选择内容方式</h2><p>先看公开内容快照，也可以选中后自由改写</p></div></div><div className="segmented-control"><button className={mode === "history" ? "active" : ""} onClick={() => switchMode("history")}>公开内容快照</button><button className={mode === "draft" ? "active" : ""} onClick={() => switchMode("draft")}>自由改写</button></div></section>
        {mode === "sources" && <section className="panel-section source-library-section">
          <div className="section-heading compact"><span className="step-number">02</span><div><h2>{contentSources.length.toLocaleString("zh-CN")} 条中文成品素材</h2><p>当前筛选 {sourceResults.length} 条，选一个就能生成</p></div></div>
          <div className="search-row"><label className="search-box"><MagnifyingGlass /><input value={sourceQuery} onChange={(event) => setSourceQuery(event.target.value)} placeholder="搜：效率、赚钱、Codex、Token" /></label><button className="icon-button" onClick={pickRandomSource} title="从当前结果随机一条" aria-label="随机一条素材"><Shuffle /></button></div>
          <div className="category-pills">{sourceCategories.map((category) => <button key={category} className={sourceCategory === category ? "active" : ""} onClick={() => setSourceCategory(category)}>{category} <em>{category === "全部" ? contentSources.length : sourceCategoryCounts[category]}</em></button>)}</div>
          <div className="source-list">{visibleSourceResults.map((source) => <article key={source.id} className={`source-item ${source.id === selectedSource.id ? "selected" : ""}`}><button className="source-main" onClick={() => selectSource(source)}><span className="source-meta"><b>{source.category}</b><em>{source.productFit.join(" · ")}</em></span><strong>{source.title}</strong><p>{source.insight}</p></button><a href={source.sourceUrl} target="_blank" rel="noreferrer"><LinkSimple /> {source.sourceName}</a></article>)}</div>
          <p className="source-note"><ShieldCheck weight="fill" /> 为保证页面流畅，每次展示前 100 条，搜索和分类会检索完整素材库。数据、个人经历和收入在发布前必须复核，不得虚构。</p>
        </section>}
        {mode !== "sources" && <section className="panel-section archive-section">
          <div className="section-heading compact"><span className="step-number">02</span><div><h2>搜索 {tweets.length} 条公开内容快照</h2><p>已优先挑选 AI、投资认知与个人成长内容</p></div></div>
          <div className="search-row"><label className="search-box"><MagnifyingGlass /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="例如：AI、英伟达、SpaceX、投资" /></label><button className="icon-button" onClick={pickRandom}><Shuffle /></button></div>
          <div className="tweet-list" role="listbox">{results.map((tweet) => <button key={tweet.id} className={`tweet-list-item ${tweet.id === selected.id ? "selected" : ""}`} onClick={() => selectTweet(tweet)}><span className="item-date">{tweet.date}</span><strong>{tweet.text.replace(/\s+/g, " ").slice(0, 58)}</strong><span className="item-stats">{tweet.likes.toLocaleString("zh-CN")} 赞 · {tweet.reposts.toLocaleString("zh-CN")} 转</span></button>)}{results.length === 0 && <div className="empty-state">没有找到，换一个关键词。</div>}</div>
          {selected.isExcerpt && <p className="source-note"><ShieldCheck weight="fill" /> 这条来自 enheng-skill 精选原文摘录；长文或时效性内容请点“查看来源”核对完整原推。</p>}
        </section>}
        {mode === "sources" && <section className="panel-section editor-section"><div className="section-heading compact"><span className="step-number">03</span><div><h2>调整生成内容</h2><p>保留事实，改成你自己真实说话的方式</p></div></div><textarea value={sourceDraft} onChange={(event) => setSourceDraft(event.target.value)} rows={10} /><div className="editor-actions"><span>{sourceDraft.length} 字</span><button className="secondary-button" onClick={() => setSourceDraft(createSourceDraft(selectedSource))}><Sparkle weight="fill" /> 重新生成</button></div></section>}
        {mode === "draft" && <section className="panel-section editor-section"><div className="section-heading compact"><span className="step-number">03</span><div><h2>选择改写感觉</h2><p>不是换一句话，而是整篇换结构</p></div></div><div className="rewrite-style-pills">{rewriteStyles.map((style) => <button key={style.id} className={draftStyle === style.id ? "active" : ""} onClick={() => chooseDraftStyle(style.id)}>{style.label}</button>)}</div><textarea value={draft} onChange={(event) => setDraft(event.target.value)} rows={10} /><div className="editor-actions"><span>{draft.length} 字</span><button className="secondary-button" onClick={() => rewriteDraft(selected, draftStyle, draftVariant + 1)}><Shuffle weight="fill" /> 换一种写法</button></div><p className="rewrite-note">内容只营造“尽快真正用上AI”的认知，不写收益承诺、诱导购买或无法核实的个人经历。</p></section>}
        <section className="panel-section output-section"><div className="section-heading compact"><span className="step-number">{outputStep}</span><div><h2>选择发布样式</h2><p>卡片采用原生帖子详情页结构，正文高度自然增长</p></div></div><div className="output-picker"><button className={outputMode === "poster" ? "active" : ""} onClick={() => setOutputMode("poster")}><ImageSquare weight="fill" /><strong>背景图成品</strong><span>固定竖版 3:4 背景</span></button><button className={outputMode === "card" ? "active" : ""} onClick={() => setOutputMode("card")}><BookmarkSimple weight="fill" /><strong>原生帖子截图</strong><span>尺寸随正文自然增高</span></button></div><div className="orientation-control"><span>推文卡片版式</span><div className="orientation-picker" role="group" aria-label="选择推文卡片版式"><button type="button" className={orientation === "portrait" ? "active" : ""} onClick={() => setOrientation("portrait")}><i className="orientation-icon portrait" />原生竖版</button><button type="button" className={orientation === "landscape" ? "active" : ""} onClick={() => setOrientation("landscape")}><i className="orientation-icon landscape" />宽版适配</button></div><small>原生竖版最接近手机端 X 帖子截图，长文不会强制裁切。</small></div></section>
        {outputMode === "poster" && <section className="panel-section background-section">
          <div className="section-heading compact"><span className="step-number">{backgroundStep}</span><div><h2>选择背景</h2><p>内置图库、本地上传、网络图片都能用</p></div></div>
          <label className="search-box background-search"><MagnifyingGlass /><input value={backgroundQuery} onChange={(event) => setBackgroundQuery(event.target.value)} placeholder="搜：香港、城市、夜景、山海" /></label>
          <div className="background-grid">{backgroundResults.map((item) => <button key={item.id} className={background === item.src ? "active" : ""} onClick={() => setBackground(item.src)}><img src={item.src} alt={item.name} loading="lazy" /><span>{item.name}</span></button>)}</div>
          <div className="background-actions"><label className="upload-button"><UploadSimple /> 上传自己的背景<input type="file" accept="image/*" onChange={loadUpload} /></label><div className="url-row"><input value={backgroundUrl} onChange={(event) => setBackgroundUrl(event.target.value)} placeholder="或粘贴网上的图片地址" /><button onClick={applyBackgroundUrl}>使用</button></div></div>
          <label className="range-label"><span>背景压暗 <b>{overlay}%</b></span><input type="range" min="0" max="55" value={overlay} onChange={(event) => setOverlay(Number(event.target.value))} /></label>
          <div className="placement-controls">
            <label className="range-label"><span>卡片大小 <b>{Math.round(cardScale * 100)}%</b></span><input type="range" min="55" max="120" value={Math.round(cardScale * 100)} onChange={(event) => setCardScale(Number(event.target.value) / 100)} /></label>
            <div className="drag-help"><span>在右侧直接拖动卡片调整位置</span><button onClick={resetCardPlacement}>居中重置</button></div>
          </div>
        </section>}
        <section className="panel-section visual-section"><div className="section-heading compact"><span className="step-number">{finishStep}</span><div><h2>检查并下载</h2><p>右侧看到的就是最终图片</p></div></div><div className="profile-editor"><div className="profile-avatar-editor"><img src={profileAvatar} alt="当前头像" /><label><UploadSimple /> 自定义头像<input type="file" accept="image/*" onChange={loadProfileAvatar} /></label></div><div className="profile-fields"><label><span>显示名称</span><input value={profileName} maxLength={30} onChange={(event) => setProfileName(event.target.value)} /></label><label><span>用户名</span><input value={profileHandle} maxLength={32} onChange={(event) => setProfileHandle(event.target.value)} placeholder="@username" /></label><label><span>发布日期</span><input type="date" value={publishDate} onChange={(event) => setPublishDate(event.target.value)} /></label></div></div><div className="card-theme-control"><span>卡片背景</span><div className="card-theme-picker" role="group" aria-label="选择卡片背景"><button type="button" className={cardTheme === "light" ? "active" : ""} onClick={() => setCardTheme("light")}><i className="theme-swatch light" />白色</button><button type="button" className={cardTheme === "dark" ? "active" : ""} onClick={() => setCardTheme("dark")}><i className="theme-swatch dark" />黑色</button></div></div><label className="range-label"><span>正文字号 <b>{fontSize}px</b>{adaptiveCardFontSize < fontSize && <em>长文自动适配为 {adaptiveCardFontSize}px</em>}</span><input type="range" min="16" max="28" value={fontSize} onChange={(event) => setFontSize(Number(event.target.value))} /></label><button className="direct-export-button" onClick={exportDirectCard} disabled={exporting}><BookmarkSimple weight="fill" /><span><strong>{isMobile ? "保存原生帖子截图到相册" : "直接导出原生帖子截图"}</strong><small>保持手机帖子详情页结构，尺寸随正文自然增高</small></span></button>{outputMode === "poster" && activeText.length > 700 && <div className="length-warning"><WarningCircle weight="fill" /><span>这条内容很长，系统已经自动缩小卡片。纯卡片导出不会截断，抖音竖图建议适当精简。</span></div>}</section>
        <section className="panel-section publish-copy-section">
          <div className="section-heading compact"><span className="step-number">{String(Number(finishStep) + 1).padStart(2, "0")}</span><div><h2>生成抖音发布文案</h2><p>卡片原文不变，只生成发布时填写的配文</p></div></div>
          <div className="publish-style-picker" role="group" aria-label="选择抖音文案风格">{publishCopyStyles.map((style) => <button key={style.id} className={publishCopyStyle === style.id ? "active" : ""} onClick={() => { setPublishCopyStyle(style.id); setPublishCopies([]); setPublishCopySource(""); setPublishCopyError(""); }}><strong>{style.label}</strong><span>{style.hint}</span></button>)}</div>
          {publishCopies.length > 1 && <div className="candidate-tabs" role="tablist" aria-label="文案候选版本">{publishCopies.map((_, index) => <button key={index} type="button" role="tab" aria-selected={publishCopyIndex === index} className={publishCopyIndex === index ? "active" : ""} onClick={() => { setPublishCopyIndex(index); setCopyStatus(""); }}>版本 {index + 1}</button>)}</div>}
          {publishCopy ? <textarea className="publish-copy-result" value={publishCopy} onChange={(event) => updatePublishCopy(event.target.value)} aria-label="抖音发布文案" /> : <div className="publish-copy-empty"><Sparkle weight="fill" /><span>选择一种风格，根据当前卡片生成 3 个候选文案。</span></div>}
          <div className="publish-copy-actions"><button className="secondary-button" onClick={generatePublishCopy} disabled={publishCopyLoading}><Sparkle weight="fill" /> {publishCopyLoading ? "正在生成…" : publishCopy ? "重新生成 3 版" : "AI 生成 3 版文案"}</button><button className="copy-button" onClick={copyDescription} disabled={publishCopyLoading}><CopySimple weight="bold" /> 一键复制</button></div>
          <p className={`copy-check-note ${publishCopyError ? "warning" : ""}`}>{copyStatus || publishCopyError || (publishCopySource === "deepseek" ? "由 DeepSeek 生成；发布前请检查事实、语气和话题。" : "配文会补充观点和互动问题，不会修改卡片原文。")}</p>
        </section>
      </aside>
      <section className="preview-panel">
        <div className="preview-toolbar"><div><span className={`status-dot ${mode}`} /><strong>{outputMode === "poster" ? `竖版 3:4 背景 · ${orientation === "portrait" ? "竖版" : "横版"}卡片` : `${orientation === "portrait" ? "竖版" : "横版"}纯推文卡片预览`}</strong></div><div className="toolbar-actions">{mode === "history" && <a href={selected.url} target="_blank" rel="noreferrer"><LinkSimple /> 查看来源</a>}{mode === "sources" && <a href={selectedSource.sourceUrl} target="_blank" rel="noreferrer"><LinkSimple /> 查看来源</a>}<button type="button" className="ghost-button" onClick={() => setMetricsTick((t) => t + 1)}><ArrowsClockwise /> 换一组数据</button></div></div>
        <div className={`preview-stage ${outputMode} ${orientation}`}>{outputMode === "poster" ? <div className="douyin-poster" ref={exportRef}><img className="poster-background" src={background} crossOrigin="anonymous" alt="" /><div className="poster-overlay" style={{ background: `rgba(0,0,0,${overlay / 100})` }} /><div className={`poster-card-wrap wrap-${orientation}`} style={{ left: `calc(50% + ${cardPosition.x}px)`, top: `calc(50% + ${cardPosition.y}px)`, transform: `translate(-50%, -50%) scale(${cardScale * posterFitScale})` }} onPointerDown={startDragging} onPointerMove={dragCard} onPointerUp={stopDragging} onPointerCancel={stopDragging} onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}><TweetCard text={activeText} fontSize={adaptivePosterFontSize} metrics={metrics} cardTheme={cardTheme} orientation={orientation} profile={profile} poster /></div></div> : <TweetCard cardRef={exportRef} text={activeText} fontSize={adaptiveCardFontSize} metrics={metrics} cardTheme={cardTheme} orientation={orientation} profile={profile} />}</div>
        <div className="export-bar"><div className="export-note"><Check weight="bold" /><span>{isMobile ? "生成后在系统面板选择“存储图像”，即可保存到相册。" : outputMode === "poster" ? "下载图片，再复制发布文案，就能直接发抖音。" : "下载纯推文卡片 PNG。"}</span></div><div className="export-actions"><button className="copy-export-button" onClick={copyDescription}><CopySimple weight="bold" /> 复制发布文案</button><button className="download-button" onClick={downloadImage} disabled={exporting}>{exported ? <Check weight="bold" /> : <DownloadSimple weight="bold" />}{exporting ? "正在生成…" : exported ? (isMobile ? "已生成" : "已下载") : (isMobile ? "保存到相册" : "一键下载成品")}</button></div></div>
      </section>
    </div>
    <div className="poster-export-surface" aria-hidden="true"><div className="douyin-poster" ref={posterExportRef}><img className="poster-background" src={background} crossOrigin="anonymous" alt="" /><div className="poster-overlay" style={{ background: `rgba(0,0,0,${overlay / 100})` }} /><div className={`poster-card-wrap wrap-${orientation}`} style={{ left: `calc(50% + ${cardPosition.x}px)`, top: `calc(50% + ${cardPosition.y}px)`, transform: `translate(-50%, -50%) scale(${cardScale * posterFitScale})` }}><TweetCard text={activeText} fontSize={adaptivePosterFontSize} metrics={metrics} cardTheme={cardTheme} orientation={orientation} profile={profile} poster /></div></div></div>
    <div className="direct-card-export" aria-hidden="true"><TweetCard cardRef={directCardRef} text={activeText} fontSize={adaptiveCardFontSize} metrics={metrics} cardTheme={cardTheme} orientation={orientation} profile={profile} /></div>
  </main>;
}
