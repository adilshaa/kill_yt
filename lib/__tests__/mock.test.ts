import { test } from "node:test";
import assert from "node:assert/strict";
import { mockChannel, mockVideos } from "../mock";
import type { Video } from "../types";

test("mockChannel has required fields", () => {
  assert.equal(typeof mockChannel.id, "string");
  assert.ok(mockChannel.title.length > 0);
  assert.ok(mockChannel.avatarUrl.startsWith("/"));
  assert.equal(typeof mockChannel.subscriberCount, "string");
});

test("mockVideos is a non-empty array of valid Video objects", () => {
  assert.ok(Array.isArray(mockVideos));
  assert.ok(mockVideos.length > 0);
  for (const v of mockVideos as Video[]) {
    assert.ok(v.id.length > 0);
    assert.ok(v.title.length > 0);
    assert.ok(v.thumbnailUrl.length > 0);
    assert.equal(typeof v.isLive, "boolean");
    assert.equal(typeof v.isUpcoming, "boolean");
  }
});
