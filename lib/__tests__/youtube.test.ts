import { test } from "node:test";
import assert from "node:assert/strict";
import {
  mapChannelResponse,
  mapVideosResponse,
  formatCount,
  type ChannelsResponse,
  type VideosResponse,
} from "../youtube";

const channelJson: ChannelsResponse = {
  items: [
    {
      id: "UC123",
      snippet: {
        title: "Test Channel",
        description: "desc",
        thumbnails: { high: { url: "https://x/a.jpg" } },
      },
      statistics: { subscriberCount: "1234567" },
      brandingSettings: { image: { bannerExternalUrl: "https://x/b.jpg" } },
    },
  ],
};

test("mapChannelResponse maps fields and formats subs", () => {
  const c = mapChannelResponse(channelJson);
  assert.equal(c.id, "UC123");
  assert.equal(c.title, "Test Channel");
  assert.equal(c.avatarUrl, "https://x/a.jpg");
  assert.equal(c.bannerUrl, "https://x/b.jpg");
  assert.equal(c.subscriberCount, "1.2M");
});

test("mapVideosResponse detects live and upcoming", () => {
  const json: VideosResponse = {
    items: [
      {
        id: "v1",
        snippet: {
          title: "Live now",
          publishedAt: "2026-01-01T00:00:00Z",
          thumbnails: { default: { url: "t.jpg" } },
        },
        statistics: { viewCount: "500" },
        liveStreamingDetails: {
          actualStartTime: "2026-01-01T00:00:00Z",
          concurrentViewers: "1234",
        },
      },
      {
        id: "v2",
        snippet: {
          title: "Soon",
          publishedAt: "2026-01-02T00:00:00Z",
          thumbnails: { default: { url: "t2.jpg" } },
        },
        statistics: { viewCount: "0" },
        liveStreamingDetails: { scheduledStartTime: "2026-02-01T00:00:00Z" },
      },
    ],
  };
  const vids = mapVideosResponse(json);
  assert.equal(vids[0].isLive, true);
  assert.equal(vids[0].liveViewers, "1.2K");
  assert.equal(vids[1].isUpcoming, true);
  assert.equal(vids[1].isLive, false);
});

test("formatCount abbreviates", () => {
  assert.equal(formatCount(950), "950");
  assert.equal(formatCount(1500), "1.5K");
  assert.equal(formatCount(2_300_000), "2.3M");
  assert.equal(formatCount("0"), "0");
});
