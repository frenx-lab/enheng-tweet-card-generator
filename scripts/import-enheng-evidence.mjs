import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const sourcePath = process.argv[2];
if (!sourcePath) {
  console.error("Usage: npm run content:import -- /path/to/evidence.jsonl");
  process.exit(1);
}

const targetPath = resolve("src/tweets.json");
const existing = JSON.parse(await readFile(targetPath, "utf8"));
const evidence = (await readFile(resolve(sourcePath), "utf8"))
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter(Boolean)
  .map((line, index) => {
    try {
      return JSON.parse(line);
    } catch {
      throw new Error(`Invalid JSON on evidence line ${index + 1}`);
    }
  });

function numeric(value) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? Math.round(number) : 0;
}

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, "")
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, "");
}

function bigrams(value) {
  const normalized = normalizeText(value);
  const result = new Set();
  for (let index = 0; index < normalized.length - 1; index += 1) result.add(normalized.slice(index, index + 2));
  return result;
}

function similarity(left, right) {
  const a = bigrams(left);
  const b = bigrams(right);
  let overlap = 0;
  for (const item of a) if (b.has(item)) overlap += 1;
  return overlap / (a.size + b.size - overlap || 1);
}

const converted = evidence
  .filter((item) => item.kind === "post" && !item.reply_to)
  .filter((item) => item.id && item.excerpt && item.url && item.created_at)
  .map((item) => {
    const likes = numeric(item.metrics?.likes);
    const reposts = numeric(item.metrics?.reposts);
    const date = new Date(item.created_at);
    if (Number.isNaN(date.valueOf())) throw new Error(`Invalid date for evidence ${item.id}`);
    return {
      id: String(item.id),
      date: date.toISOString().slice(0, 10),
      text: String(item.excerpt).trim(),
      likes,
      reposts,
      engagement: likes + reposts,
      replies: numeric(item.metrics?.replies),
      views: numeric(item.metrics?.views),
      url: String(item.url),
      categories: Array.isArray(item.categories) ? item.categories : [],
      source: "enheng-skill-evidence",
      isExcerpt: true,
    };
  });

const merged = [...existing];
let fuzzyDuplicates = 0;
for (const candidate of converted) {
  for (let index = merged.length - 1; index >= 0; index -= 1) {
    if (merged[index].id === candidate.id || merged[index].url === candidate.url) merged.splice(index, 1);
  }

  const similarIndex = merged.findIndex((item) => !item.isExcerpt && similarity(item.text, candidate.text) >= 0.46);
  if (similarIndex >= 0) {
    merged.splice(similarIndex, 1);
    fuzzyDuplicates += 1;
  }
  merged.push(candidate);
}

merged.sort((left, right) => right.date.localeCompare(left.date) || String(right.id).localeCompare(String(left.id)));
await writeFile(targetPath, `${JSON.stringify(merged, null, 2)}\n`, "utf8");

console.log(JSON.stringify({
  evidence: evidence.length,
  independentPosts: converted.length,
  excludedReplies: evidence.length - converted.length,
  fuzzyDuplicates,
  totalTweets: merged.length,
}, null, 2));
