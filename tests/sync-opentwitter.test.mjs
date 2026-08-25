import test from "node:test";
import assert from "node:assert/strict";
import { convertTweets, mergeTweets } from "../scripts/sync-opentwitter.mjs";

const base = {
  createdAt: "Mon Aug 24 11:37:55 +0000 2026",
  favoriteCount: 10,
  retweetCount: 2,
  replyCount: 3,
  viewCount: 100,
  userScreenName: "EnHeng456",
};

test("converts independent tweets and excludes replies and retweets", () => {
  const converted = convertTweets([
    { ...base, id: "3", text: "独立推文", conversationId: "3" },
    { ...base, id: "2", text: "回复", conversationId: "1", isReply: true },
    { ...base, id: "1", text: "RT @someone 转推" },
  ]);
  assert.equal(converted.length, 1);
  assert.deepEqual(converted[0], {
    id: "3",
    date: "2026-08-24",
    text: "独立推文",
    likes: 10,
    reposts: 2,
    engagement: 12,
    replies: 3,
    views: 100,
    url: "https://x.com/EnHeng456/status/3",
    categories: [],
    source: "opentwitter-6551",
    isExcerpt: false,
  });
});

test("replaces matching ids and skips duplicate content", () => {
  const existing = [
    { id: "1", url: "https://x.com/EnHeng456/status/1", date: "2026-08-01", text: "旧正文", likes: 1 },
    { id: "2", url: "https://x.com/EnHeng456/status/2", date: "2026-08-02", text: "相同 正文 https://t.co/a", likes: 1 },
  ];
  const incoming = [
    { id: "1", url: "https://x.com/EnHeng456/status/1", date: "2026-08-01", text: "更新正文", likes: 2 },
    { id: "3", url: "https://x.com/EnHeng456/status/3", date: "2026-08-03", text: "相同正文", likes: 3 },
  ];
  const result = mergeTweets(existing, incoming);
  assert.equal(result.replaced, 1);
  assert.equal(result.duplicateContent, 1);
  assert.equal(result.merged.length, 2);
  assert.equal(result.merged.find((tweet) => tweet.id === "1").likes, 2);
});
