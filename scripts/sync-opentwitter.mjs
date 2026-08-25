import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const API_BASE_URL = "https://ai.6551.io";
const DEFAULT_USERNAME = "EnHeng456";
const MAX_RESULTS = 100;

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

function shanghaiDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) throw new Error(`Invalid tweet date: ${value}`);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (type) => parts.find((part) => part.type === type)?.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

function isReply(tweet) {
  return tweet.isReply === true
    || Boolean(tweet.replyStatus)
    || Boolean(tweet.inReplyToStatusId || tweet.inReplyToStatusIdStr)
    || (tweet.conversationId && String(tweet.conversationId) !== String(tweet.id));
}

function isRetweet(tweet) {
  return tweet.isRetweet === true
    || Boolean(tweet.retweetedStatus)
    || /^RT\s+@/i.test(String(tweet.text || ""));
}

export function convertTweets(tweets, { username = DEFAULT_USERNAME, since, until } = {}) {
  const start = since ? new Date(`${since}T00:00:00+08:00`) : null;
  const end = until ? new Date(`${until}T00:00:00+08:00`) : null;
  return tweets
    .filter((tweet) => tweet?.id && tweet?.text && tweet?.createdAt)
    .filter((tweet) => !isReply(tweet) && !isRetweet(tweet))
    .filter((tweet) => {
      const createdAt = new Date(tweet.createdAt);
      return (!start || createdAt >= start) && (!end || createdAt < end);
    })
    .map((tweet) => {
      const likes = numeric(tweet.favoriteCount ?? tweet.likeCount);
      const reposts = numeric(tweet.retweetCount);
      return {
        id: String(tweet.id),
        date: shanghaiDate(tweet.createdAt),
        text: String(tweet.text).trim(),
        likes,
        reposts,
        engagement: likes + reposts,
        replies: numeric(tweet.replyCount),
        views: numeric(tweet.viewCount),
        url: `https://x.com/${username}/status/${tweet.id}`,
        categories: [],
        source: "opentwitter-6551",
        isExcerpt: false,
      };
    });
}

export function mergeTweets(existing, incoming) {
  const merged = existing.map((tweet) => ({ ...tweet }));
  let replaced = 0;
  let duplicateContent = 0;

  for (const candidate of incoming) {
    const sameRecord = merged.findIndex((tweet) => tweet.id === candidate.id || tweet.url === candidate.url);
    if (sameRecord >= 0) {
      merged.splice(sameRecord, 1, candidate);
      replaced += 1;
      continue;
    }

    const normalized = normalizeText(candidate.text);
    if (normalized && merged.some((tweet) => normalizeText(tweet.text) === normalized)) {
      duplicateContent += 1;
      continue;
    }
    merged.push(candidate);
  }

  merged.sort((left, right) => right.date.localeCompare(left.date) || String(right.id).localeCompare(String(left.id)));
  return { merged, replaced, duplicateContent };
}

function parseArguments(argv) {
  const options = { username: DEFAULT_USERNAME, input: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--username") options.username = argv[++index];
    else if (value === "--since") options.since = argv[++index];
    else if (value === "--until") options.until = argv[++index];
    else if (value === "--input") options.input.push(...argv[++index].split(",").filter(Boolean));
    else throw new Error(`Unknown argument: ${value}`);
  }
  return options;
}

async function callApi(path, body, token) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`OpenTwitter request failed: ${response.status} ${await response.text()}`);
  const payload = await response.json();
  if (!payload.success || !Array.isArray(payload.data)) throw new Error("OpenTwitter returned an unexpected response");
  return payload.data;
}

async function loadInput(paths) {
  const collected = [];
  for (const path of paths) {
    const payload = JSON.parse(await readFile(resolve(path), "utf8"));
    if (!payload.success || !Array.isArray(payload.data)) throw new Error(`Invalid OpenTwitter response: ${path}`);
    collected.push(...payload.data);
  }
  return collected;
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  const targetPath = resolve("src/tweets.json");
  const statePath = resolve("src/tweet-sync-state.json");
  const existing = JSON.parse(await readFile(targetPath, "utf8"));
  let state = { username: options.username, lastSeenId: "0", lastSeenCreatedAt: null };
  try {
    state = { ...state, ...JSON.parse(await readFile(statePath, "utf8")) };
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }

  const rawTweets = options.input.length
    ? await loadInput(options.input)
    : await callApi("/open/twitter_user_tweets", {
      username: options.username,
      maxResults: MAX_RESULTS,
      product: "Latest",
      includeReplies: false,
      includeRetweets: false,
    }, process.env.OPENNEWS_TOKEN || "");

  const uniqueRaw = [...new Map(rawTweets.map((tweet) => [String(tweet.id), tweet])).values()];
  const newestSeen = uniqueRaw
    .filter((tweet) => tweet?.id && !isReply(tweet) && !isRetweet(tweet))
    .sort((left, right) => BigInt(String(right.id)) > BigInt(String(left.id)) ? 1 : -1)[0];
  const incremental = options.input.length || options.since
    ? uniqueRaw
    : uniqueRaw.filter((tweet) => BigInt(String(tweet.id)) > BigInt(String(state.lastSeenId || "0")));
  const converted = convertTweets(incremental, options);
  const { merged, replaced, duplicateContent } = mergeTweets(existing, converted);

  if (JSON.stringify(merged) !== JSON.stringify(existing)) {
    await writeFile(targetPath, `${JSON.stringify(merged, null, 2)}\n`, "utf8");
  }

  const previousSeenId = String(state.lastSeenId || "0");
  const nextSeenId = newestSeen && BigInt(String(newestSeen.id)) > BigInt(previousSeenId)
    ? String(newestSeen.id)
    : previousSeenId;
  if (nextSeenId !== previousSeenId) {
    await writeFile(statePath, `${JSON.stringify({
      username: options.username,
      lastSeenId: nextSeenId,
      lastSeenCreatedAt: new Date(newestSeen.createdAt).toISOString(),
    }, null, 2)}\n`, "utf8");
  }

  console.log(JSON.stringify({
    fetched: rawTweets.length,
    uniqueFetched: uniqueRaw.length,
    considered: incremental.length,
    independentPosts: converted.length,
    excludedRepliesOrRetweets: incremental.length - converted.length,
    replaced,
    duplicateContent,
    added: merged.length - existing.length,
    totalTweets: merged.length,
    lastSeenId: nextSeenId,
  }, null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
