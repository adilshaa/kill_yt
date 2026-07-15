# kill_yt — Mobile YouTube Channel Clone (PWA) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a mobile-only, installable PWA that clones a single YouTube channel's page and surfaces its daily live-stream videos, using the YouTube Data API v3 (client-side) with mock fallback.

**Architecture:** Next.js 16 App Router + Tailwind v4. A client-side data layer (`lib/youtube.ts`) reads `NEXT_PUBLIC_` env vars and calls the YouTube Data API, falling back to `lib/mock.ts` sample data when unset/errored. UI is composed of server/client components; PWA support is provided by a native `app/manifest.ts` plus a `public/sw.js` service worker registered by a client component.

**Tech Stack:** Next.js 16.2.10 (App Router), React 19.2.4, TypeScript 5, Tailwind CSS v4, Node 22. `tsx` (dev dep) for running `node:test` unit tests. No other runtime deps.

**Next.js 16 conventions verified against bundled docs (`node_modules/next/dist/docs`):**
- `app/manifest.ts` returns `MetadataRoute.Manifest` (incl. `theme_color`, `display`, `icons`).
- `themeColor` MUST live in an exported `viewport` object (`export const viewport: Viewport`), not in `metadata`.
- `NEXT_PUBLIC_` vars are inlined at build time; client uses `process.env.NEXT_PUBLIC_*`.
- Service worker registered via `navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' })`. `public/sw.js` is served as-is.
- `searchParams` in page props is a `Promise` and must be `await`ed.
- Plain `<img>` is used (not `next/image`) to avoid configuring remote image domains for YouTube thumbnails.

## Global Constraints

- Mobile-only: content constrained to a 480px-centered shell; no desktop layout work. (Spec §4/§5)
- Personal use; only one channel; no auth, no comments, no chat, no push, no background audio. (Spec §1)
- API key is client-side in `NEXT_PUBLIC_YOUTUBE_API_KEY` (user's explicit choice); code must keep it swappable to a server proxy. (Spec §3)
- All data functions must fall back to `lib/mock.ts` on missing key / API error / network failure, setting `isMock`. (Spec §3/§6)
- YouTube-dark palette: background `#0f0f0f`, foreground `#f1f1f1`, accent `#ff0000`. (Spec §4/§5)
- `.env.local` is git-ignored; `.env.example` is committed (requires a `.gitignore` exception). (Spec §7)

---

## File Structure

```
app/
  layout.tsx              # MODIFY: metadata, viewport themeColor, app-shell wrapper, SW register
  page.tsx                # MODIFY: client channel page (fetch + render)
  watch/page.tsx          # CREATE: server watch route, reads ?v=, renders VideoPlayer
  manifest.ts             # CREATE: PWA manifest (MetadataRoute.Manifest)
  globals.css             # MODIFY: dark youtube theme + .app-shell
  globals.css (unchanged import)
components/
  ServiceWorkerRegister.tsx  # CREATE: registers /sw.js
  ChannelHeader.tsx          # CREATE: banner, avatar, title, subs, Subscribe
  VideoGrid.tsx              # CREATE: list of VideoCard
  VideoCard.tsx              # CREATE: thumbnail + LIVE/Upcoming badge + meta, links to /watch
  VideoPlayer.tsx            # CREATE: YouTube IFrame embed + offline guard
lib/
  types.ts                  # CREATE: Channel, Video
  mock.ts                   # CREATE: sample channel + videos
  youtube.ts                # CREATE: data layer + exported pure mappers + response types
  __tests__/
    youtube.test.ts         # CREATE: unit tests for mappers/formatCount
    mock.test.ts            # CREATE: unit test for mock shape
public/
  sw.js                     # CREATE: service worker (precache shell + runtime caches)
  icon.svg                  # CREATE: PWA icon (any)
  icon-maskable.svg         # CREATE: PWA icon (maskable, safe zone)
  placeholder-thumb.svg     # CREATE: mock thumbnail
  placeholder-avatar.svg    # CREATE: mock avatar
  placeholder-banner.svg    # CREATE: mock banner
.env.example                # CREATE: committed template
.gitignore                  # MODIFY: add !.env.example exception
next.config.ts              # MODIFY: no-cache headers for /sw.js
package.json                # MODIFY: add tsx devDependency
tsconfig.json               # (already has @/* alias — no change)
```

---

### Task 1: Project config, theme, env, SW mount

**Files:**
- Create: `.env.example`
- Create: `public/placeholder-thumb.svg`, `public/placeholder-avatar.svg`, `public/placeholder-banner.svg`
- Modify: `.gitignore` (add `!.env.example` after `.env*`)
- Modify: `app/globals.css`
- Modify: `app/layout.tsx`
- Modify: `next.config.ts`
- Create: `components/ServiceWorkerRegister.tsx`

**Interfaces:** Consumes nothing (first task). Produces `ServiceWorkerRegister` (used by layout) and the `.app-shell` CSS class (used by all pages).

- [ ] **Step 1: Create `.env.example`**

```bash
# .env.example  (committed; real values go in .env.local which is git-ignored)
NEXT_PUBLIC_YOUTUBE_API_KEY=
NEXT_PUBLIC_YOUTUBE_CHANNEL_ID=UCPLACEHOLDER
```

- [ ] **Step 2: Allow committing `.env.example`**

Edit `.gitignore`: after the line `.env*` add:

```gitignore
!.env.example
```

- [ ] **Step 3: Add placeholder SVGs to `public/`**

`public/placeholder-thumb.svg`:
```svg
<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180" viewBox="0 0 320 180">
  <rect width="320" height="180" fill="#272727"/>
  <circle cx="160" cy="90" r="30" fill="#ff0000"/>
  <polygon points="150,76 150,104 176,90" fill="#fff"/>
</svg>
```

`public/placeholder-avatar.svg`:
```svg
<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">
  <circle cx="48" cy="48" r="48" fill="#3a3a3a"/>
  <circle cx="48" cy="38" r="16" fill="#9a9a9a"/>
  <path d="M20 84 a28 28 0 0 1 56 0 z" fill="#9a9a9a"/>
</svg>
```

`public/placeholder-banner.svg`:
```svg
<svg xmlns="http://www.w3.org/2000/svg" width="640" height="180" viewBox="0 0 640 180">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#3a0d0d"/><stop offset="1" stop-color="#0d0d3a"/>
  </linearGradient></defs>
  <rect width="640" height="180" fill="url(#g)"/>
</svg>
```

- [ ] **Step 4: Replace `app/globals.css`**

```css
@import "tailwindcss";

:root {
  --bg: #0f0f0f;
  --fg: #f1f1f1;
  --muted: #aaaaaa;
  --accent: #ff0000;
}

html,
body {
  background: var(--bg);
  color: var(--fg);
}

body {
  font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
}

/* Mobile shell: constrain content to phone width, centered on larger screens */
.app-shell {
  max-width: 480px;
  margin: 0 auto;
  min-height: 100dvh;
  background: var(--bg);
}
```

- [ ] **Step 5: Replace `app/layout.tsx`**

```tsx
import type { Metadata, Viewport } from "next";
import "./globals.css";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";

export const metadata: Metadata = {
  title: "kill_yt",
  description: "Personal mobile YouTube channel viewer",
  applicationName: "kill_yt",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "kill_yt",
  },
};

export const viewport: Viewport = {
  themeColor: "#0f0f0f",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">
        <div className="app-shell">{children}</div>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
```

- [ ] **Step 6: Create `components/ServiceWorkerRegister.tsx`**

```tsx
"use client";

import { useEffect } from "react";

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/", updateViaCache: "none" })
        .catch(() => {
          /* registration failures are non-fatal */
        });
    }
  }, []);

  return null;
}
```

- [ ] **Step 7: Update `next.config.ts` (no-cache for the service worker)**

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          {
            key: "Content-Type",
            value: "application/javascript; charset=utf-8",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
```

- [ ] **Step 8: Verify lint + build**

Run: `npm run lint && npm run build`
Expected: lint passes; build succeeds and emits a `.next` production bundle.

- [ ] **Step 9: Commit**

```bash
git add .env.example .gitignore app/globals.css app/layout.tsx next.config.ts components/ServiceWorkerRegister.tsx public/placeholder-thumb.svg public/placeholder-avatar.svg public/placeholder-banner.svg
git commit -m "chore: project config, dark mobile theme, env template, SW mount"
```

---

### Task 2: Types, mock data, and a mock-shape test

**Files:**
- Create: `lib/types.ts`
- Create: `lib/mock.ts`
- Create: `lib/__tests__/mock.test.ts`

**Interfaces:** Produces `Channel` / `Video` types (consumed by every later task and `lib/youtube.ts`). Produces `mockChannel` / `mockVideos` (consumed by `lib/youtube.ts` fallback).

- [ ] **Step 1: Write the failing test for the mock shape**

`lib/__tests__/mock.test.ts`:
```ts
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
```

- [ ] **Step 2: Run the test to confirm it fails**

Run: `node --import tsx --test lib/__tests__/mock.test.ts`
Expected: FAIL — `Cannot find module '../mock'` / `../types`.

- [ ] **Step 3: Create `lib/types.ts`**

```ts
export interface Channel {
  id: string;
  title: string;
  avatarUrl: string;
  bannerUrl: string | null;
  subscriberCount: string;
  description: string;
}

export interface Video {
  id: string;
  title: string;
  thumbnailUrl: string;
  publishedAt: string;
  viewCount: string;
  isLive: boolean;
  isUpcoming: boolean;
  liveViewers: string | null;
}
```

- [ ] **Step 4: Create `lib/mock.ts`**

```ts
import type { Channel, Video } from "./types";

export const mockChannel: Channel = {
  id: "UCPLACEHOLDER",
  title: "Sample Live Channel",
  avatarUrl: "/placeholder-avatar.svg",
  bannerUrl: "/placeholder-banner.svg",
  subscriberCount: "1.2M",
  description:
    "Demo channel — set NEXT_PUBLIC_YOUTUBE_API_KEY and NEXT_PUBLIC_YOUTUBE_CHANNEL_ID in .env.local to load real data.",
};

export const mockVideos: Video[] = [
  {
    id: "mock-live-1",
    title: "🔴 LIVE: Daily Morning Stream",
    thumbnailUrl: "/placeholder-thumb.svg",
    publishedAt: new Date().toISOString(),
    viewCount: "0",
    isLive: true,
    isUpcoming: false,
    liveViewers: "3.4K",
  },
  {
    id: "mock-up-1",
    title: "Tonight's Stream (Scheduled)",
    thumbnailUrl: "/placeholder-thumb.svg",
    publishedAt: new Date(Date.now() + 6 * 3600 * 1000).toISOString(),
    viewCount: "0",
    isLive: false,
    isUpcoming: true,
    liveViewers: null,
  },
  {
    id: "mock-v-1",
    title: "Yesterday's Full Stream — Q&A and Build",
    thumbnailUrl: "/placeholder-thumb.svg",
    publishedAt: new Date(Date.now() - 20 * 3600 * 1000).toISOString(),
    viewCount: "12K",
    isLive: false,
    isUpcoming: false,
    liveViewers: null,
  },
  {
    id: "mock-v-2",
    title: "Daily Stream Replay #42",
    thumbnailUrl: "/placeholder-thumb.svg",
    publishedAt: new Date(Date.now() - 44 * 3600 * 1000).toISOString(),
    viewCount: "8.1K",
    isLive: false,
    isUpcoming: false,
    liveViewers: null,
  },
  {
    id: "mock-v-3",
    title: "Weekend Special Live Replay",
    thumbnailUrl: "/placeholder-thumb.svg",
    publishedAt: new Date(Date.now() - 68 * 3600 * 1000).toISOString(),
    viewCount: "21K",
    isLive: false,
    isUpcoming: false,
    liveViewers: null,
  },
];
```

- [ ] **Step 5: Run the test to confirm it passes**

Run: `node --import tsx --test lib/__tests__/mock.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
git add lib/types.ts lib/mock.ts lib/__tests__/mock.test.ts
git commit -m "feat: channel/video types and mock data with shape test"
```

---

### Task 3: YouTube data layer + unit tests

**Files:**
- Create: `lib/youtube.ts`
- Create: `lib/__tests__/youtube.test.ts`
- Modify: `package.json` (add `tsx` devDependency), then `npm install`

**Interfaces:** Produces `getChannelData(): Promise<YouTubeResult<Channel>>` and `getStreams(): Promise<YouTubeResult<Video[]>>` (consumed by `app/page.tsx`). Also exports pure, tested helpers `mapChannelResponse`, `mapVideosResponse`, `formatCount` and the response types `ChannelsResponse`, `VideosResponse`, `SearchResponse`.

- [ ] **Step 1: Write the failing tests**

`lib/__tests__/youtube.test.ts`:
```ts
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
```

- [ ] **Step 2: Run the test to confirm it fails**

Run: `node --import tsx --test lib/__tests__/youtube.test.ts`
Expected: FAIL — `Cannot find module '../youtube'`.

- [ ] **Step 3: Add `tsx` dev dependency**

Edit `package.json` `devDependencies` to add `"tsx": "^4"`. Then run `npm install`.

- [ ] **Step 4: Create `lib/youtube.ts`**

```ts
import type { Channel, Video } from "./types";
import { mockChannel, mockVideos } from "./mock";

const API = "https://www.googleapis.com/youtube/v3";
const KEY = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY;
const CHANNEL_ID = process.env.NEXT_PUBLIC_YOUTUBE_CHANNEL_ID;

export interface YouTubeResult<T> {
  data: T;
  isMock: boolean;
}

export interface ChannelsResponse {
  items: Array<{
    id: string;
    snippet: {
      title: string;
      description?: string;
      thumbnails: {
        default?: { url: string };
        high?: { url: string };
        medium?: { url: string };
      };
    };
    statistics: { subscriberCount: string };
    brandingSettings?: { image?: { bannerExternalUrl?: string } };
  }>;
}

export interface SearchResponse {
  items: Array<{
    id: { videoId: string };
    snippet: {
      title: string;
      publishedAt: string;
      thumbnails: {
        default?: { url: string };
        medium?: { url: string };
        high?: { url: string };
        maxres?: { url: string };
      };
    };
  }>;
}

export interface VideosResponse {
  items: Array<{
    id: string;
    snippet: {
      title: string;
      publishedAt: string;
      thumbnails: {
        default?: { url: string };
        medium?: { url: string };
        high?: { url: string };
        maxres?: { url: string };
      };
    };
    statistics?: { viewCount?: string };
    liveStreamingDetails?: {
      actualStartTime?: string;
      actualEndTime?: string;
      scheduledStartTime?: string;
      concurrentViewers?: string;
    };
  }>;
}

function useMock(): boolean {
  return (
    !KEY ||
    KEY.trim() === "" ||
    !CHANNEL_ID ||
    CHANNEL_ID.trim() === "" ||
    CHANNEL_ID === "UCPLACEHOLDER"
  );
}

async function ytFetch<T>(
  path: string,
  params: Record<string, string>,
): Promise<T> {
  const url = new URL(`${API}/${path}`);
  url.searchParams.set("key", KEY!);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`YouTube API ${res.status}`);
  return (await res.json()) as T;
}

export function formatCount(n: string | number): string {
  const num = typeof n === "string" ? Number(n) : n;
  if (!isFinite(num)) return "0";
  if (num >= 1e9) return (num / 1e9).toFixed(1).replace(/\.0$/, "") + "B";
  if (num >= 1e6) return (num / 1e6).toFixed(1).replace(/\.0$/, "") + "M";
  if (num >= 1e3) return (num / 1e3).toFixed(1).replace(/\.0$/, "") + "K";
  return String(num);
}

export function mapChannelResponse(json: ChannelsResponse): Channel {
  const item = json.items[0];
  const sn = item.snippet;
  const banner = item.brandingSettings?.image?.bannerExternalUrl ?? null;
  const avatar =
    sn.thumbnails.high?.url ??
    sn.thumbnails.medium?.url ??
    sn.thumbnails.default?.url ??
    "/placeholder-avatar.svg";
  return {
    id: item.id,
    title: sn.title,
    avatarUrl: avatar,
    bannerUrl: banner,
    subscriberCount: formatCount(item.statistics.subscriberCount),
    description: sn.description ?? "",
  };
}

export function mapVideosResponse(json: VideosResponse): Video[] {
  return json.items.map((item) => {
    const live = item.liveStreamingDetails;
    const isLive = !!live?.actualStartTime && !live?.actualEndTime;
    const isUpcoming = !!live?.scheduledStartTime && !live?.actualStartTime;
    const thumb =
      item.snippet.thumbnails.maxres?.url ??
      item.snippet.thumbnails.high?.url ??
      item.snippet.thumbnails.medium?.url ??
      item.snippet.thumbnails.default?.url ??
      "/placeholder-thumb.svg";
    return {
      id: item.id,
      title: item.snippet.title,
      thumbnailUrl: thumb,
      publishedAt: item.snippet.publishedAt,
      viewCount: formatCount(item.statistics?.viewCount ?? "0"),
      isLive,
      isUpcoming,
      liveViewers: live?.concurrentViewers
        ? formatCount(live.concurrentViewers)
        : null,
    };
  });
}

export async function getChannelData(): Promise<YouTubeResult<Channel>> {
  if (useMock()) return { data: mockChannel, isMock: true };
  try {
    const json = await ytFetch<ChannelsResponse>("channels", {
      part: "snippet,statistics,brandingSettings",
      id: CHANNEL_ID!,
    });
    return { data: mapChannelResponse(json), isMock: false };
  } catch {
    return { data: mockChannel, isMock: true };
  }
}

export async function getStreams(): Promise<YouTubeResult<Video[]>> {
  if (useMock()) return { data: mockVideos, isMock: true };
  try {
    const [live, recent] = await Promise.all([
      ytFetch<SearchResponse>("search", {
        part: "snippet",
        channelId: CHANNEL_ID!,
        eventType: "live",
        type: "video",
        order: "date",
        maxResults: "5",
      }),
      ytFetch<SearchResponse>("search", {
        part: "snippet",
        channelId: CHANNEL_ID!,
        type: "video",
        order: "date",
        maxResults: "20",
      }),
    ]);

    const ids = Array.from(
      new Set(
        [...live.items, ...recent.items]
          .map((i) => i.id.videoId)
          .filter(Boolean),
      ),
    );
    if (ids.length === 0) return { data: [], isMock: false };

    const stats = await ytFetch<VideosResponse>("videos", {
      part: "snippet,statistics,liveStreamingDetails",
      id: ids.join(","),
    });
    const videos = mapVideosResponse(stats);
    videos.sort(
      (a, b) =>
        Number(b.isLive) - Number(a.isLive) ||
        Number(b.isUpcoming) - Number(a.isUpcoming),
    );
    return { data: videos, isMock: false };
  } catch {
    return { data: mockVideos, isMock: true };
  }
}
```

- [ ] **Step 5: Run the tests to confirm they pass**

Run: `node --import tsx --test lib/__tests__/youtube.test.ts lib/__tests__/mock.test.ts`
Expected: PASS (all tests green).

- [ ] **Step 6: Commit**

```bash
git add lib/youtube.ts lib/__tests__/youtube.test.ts package.json package-lock.json
git commit -m "feat: YouTube data layer with mappers, fallback, and unit tests"
```

---

### Task 4: PWA manifest + service worker + icons

**Files:**
- Create: `app/manifest.ts`
- Create: `public/sw.js`
- Create: `public/icon.svg`, `public/icon-maskable.svg`

**Interfaces:** Produces `/manifest.webmanifest` (auto-served by Next) and `/sw.js` (registered by `ServiceWorkerRegister` from Task 1). Icons referenced by the manifest.

- [ ] **Step 1: Create `app/manifest.ts`**

```ts
import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "kill_yt — Channel Viewer",
    short_name: "kill_yt",
    description: "Personal mobile YouTube channel viewer",
    start_url: "/",
    display: "standalone",
    background_color: "#0f0f0f",
    theme_color: "#0f0f0f",
    orientation: "portrait",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      {
        src: "/icon-maskable.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
```

- [ ] **Step 2: Create `public/sw.js`**

```js
const CACHE = "kill-yt-v1";
const OFFLINE_URL = "/";

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then((c) => c.add(OFFLINE_URL)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // Cross-origin (e.g. YouTube thumbnails): cache-first for images.
  if (url.origin !== self.location.origin) {
    if (req.destination === "image") {
      event.respondWith(
        caches.open(CACHE).then(async (c) => {
          const hit = await c.match(req);
          if (hit) return hit;
          try {
            const res = await fetch(req);
            c.put(req, res.clone());
            return res;
          } catch {
            return hit || Response.error();
          }
        }),
      );
    }
    return;
  }

  // Same-origin navigations: network-first, fall back to cached shell offline.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).catch(() => caches.match(req) || caches.match(OFFLINE_URL)),
    );
    return;
  }

  // Same-origin static assets: stale-while-revalidate.
  event.respondWith(
    caches.open(CACHE).then(async (c) => {
      const hit = await c.match(req);
      if (hit) {
        fetch(req)
          .then((res) => c.put(req, res.clone()))
          .catch(() => {});
        return hit;
      }
      try {
        const res = await fetch(req);
        c.put(req, res.clone());
        return res;
      } catch {
        return Response.error();
      }
    }),
  );
});
```

- [ ] **Step 3: Create `public/icon.svg`**

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="96" fill="#0f0f0f"/>
  <circle cx="256" cy="256" r="90" fill="#ff0000"/>
  <polygon points="232,212 232,300 312,256" fill="#fff"/>
</svg>
```

- [ ] **Step 4: Create `public/icon-maskable.svg`** (safe-zone padding for maskable)

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#0f0f0f"/>
  <circle cx="256" cy="256" r="64" fill="#ff0000"/>
  <polygon points="240,224 240,288 296,256" fill="#fff"/>
</svg>
```

- [ ] **Step 5: Verify manifest is served and build passes**

Run: `npm run build`
Expected: build succeeds; no manifest/sw errors.
Then (in a later manual step) `/manifest.webmanifest` returns the JSON above and `/sw.js` is served with `Content-Type: application/javascript`.

- [ ] **Step 6: Commit**

```bash
git add app/manifest.ts public/sw.js public/icon.svg public/icon-maskable.svg
git commit -m "feat: PWA manifest, service worker, and icons"
```

---

### Task 5: Channel page UI (header + grid + cards)

**Files:**
- Create: `components/ChannelHeader.tsx`
- Create: `components/VideoGrid.tsx`
- Create: `components/VideoCard.tsx`
- Modify: `app/page.tsx`

**Interfaces:** Consumes `getChannelData` / `getStreams` and `Channel` / `Video` types from Tasks 2–3. `VideoCard` links to `/watch?v=<id>` (consumed by Task 6).

- [ ] **Step 1: Create `components/VideoCard.tsx`**

```tsx
import Link from "next/link";
import type { Video } from "@/lib/types";

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export default function VideoCard({ video }: { video: Video }) {
  return (
    <Link
      href={{ pathname: "/watch", query: { v: video.id } }}
      className="block border-b border-zinc-900"
    >
      <div className="relative aspect-video w-full bg-zinc-800">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={video.thumbnailUrl}
          alt=""
          className="h-full w-full object-cover"
        />
        {video.isLive && (
          <span className="absolute left-2 top-2 rounded bg-[var(--accent)] px-2 py-0.5 text-xs font-bold text-white">
            LIVE
          </span>
        )}
        {video.isUpcoming && (
          <span className="absolute left-2 top-2 rounded bg-zinc-900/80 px-2 py-0.5 text-xs font-bold text-white">
            Upcoming
          </span>
        )}
      </div>
      <div className="px-3 py-2">
        <h3 className="line-clamp-2 text-sm font-medium">{video.title}</h3>
        <p className="mt-1 text-xs text-[var(--muted)]">
          {video.isLive && video.liveViewers
            ? `${video.liveViewers} watching · `
            : ""}
          {video.isUpcoming
            ? "Scheduled"
            : `${video.viewCount} views · ${timeAgo(video.publishedAt)}`}
        </p>
      </div>
    </Link>
  );
}
```

- [ ] **Step 2: Create `components/VideoGrid.tsx`**

```tsx
import type { Video } from "@/lib/types";
import VideoCard from "./VideoCard";

export default function VideoGrid({ videos }: { videos: Video[] }) {
  if (videos.length === 0) {
    return (
      <p className="px-4 py-10 text-center text-sm text-[var(--muted)]">
        No streams found.
      </p>
    );
  }
  return (
    <div className="flex flex-col">
      {videos.map((v) => (
        <VideoCard key={v.id} video={v} />
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Create `components/ChannelHeader.tsx`**

```tsx
import type { Channel } from "@/lib/types";

export default function ChannelHeader({ channel }: { channel: Channel }) {
  return (
    <header className="w-full">
      <div className="relative h-28 w-full bg-zinc-800">
        {channel.bannerUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={channel.bannerUrl}
            alt=""
            className="h-full w-full object-cover"
          />
        )}
      </div>
      <div className="flex items-center gap-3 px-4 py-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={channel.avatarUrl}
          alt=""
          className="h-16 w-16 rounded-full bg-zinc-700 object-cover"
        />
        <div className="min-w-0">
          <h1 className="truncate text-lg font-semibold">{channel.title}</h1>
          <p className="text-sm text-[var(--muted)]">
            {channel.subscriberCount} subscribers
          </p>
        </div>
        <a
          href={`https://www.youtube.com/channel/${channel.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white"
        >
          Subscribe
        </a>
      </div>
    </header>
  );
}
```

- [ ] **Step 4: Replace `app/page.tsx` (client component)**

```tsx
"use client";

import { useEffect, useState } from "react";
import ChannelHeader from "@/components/ChannelHeader";
import VideoGrid from "@/components/VideoGrid";
import { getChannelData, getStreams } from "@/lib/youtube";
import type { Channel, Video } from "@/lib/types";

export default function Home() {
  const [channel, setChannel] = useState<Channel | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [isMock, setIsMock] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [c, s] = await Promise.all([getChannelData(), getStreams()]);
        if (!active) return;
        setChannel(c.data);
        setVideos(s.data);
        setIsMock(c.isMock || s.isMock);
      } catch {
        if (active) setError(true);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  return (
    <main>
      <StickyBar channel={channel} />
      {channel && <ChannelHeader channel={channel} />}
      {loading && (
        <p className="px-4 py-10 text-center text-sm text-[var(--muted)]">
          Loading…
        </p>
      )}
      {error && (
        <p className="px-4 py-10 text-center text-sm text-[var(--muted)]">
          Something went wrong.
        </p>
      )}
      {!loading && !error && <VideoGrid videos={videos} />}
      {isMock && (
        <p className="px-4 py-3 text-center text-xs text-[var(--muted)]">
          Showing sample data — set your API key in .env.local
        </p>
      )}
    </main>
  );
}

function StickyBar({ channel }: { channel: Channel | null }) {
  return (
    <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-zinc-800 bg-[var(--bg)]/95 px-4 py-2 backdrop-blur">
      {channel?.avatarUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={channel.avatarUrl} alt="" className="h-7 w-7 rounded-full" />
      )}
      <span className="text-sm font-semibold">{channel?.title ?? "kill_yt"}</span>
    </div>
  );
}
```

- [ ] **Step 5: Verify lint + build**

Run: `npm run lint && npm run build`
Expected: lint passes (no-img-element disabled inline); build succeeds.

- [ ] **Step 6: Commit**

```bash
git add components/ChannelHeader.tsx components/VideoGrid.tsx components/VideoCard.tsx app/page.tsx
git commit -m "feat: channel page UI (header, grid, cards) with client fetch"
```

---

### Task 6: Watch page (player)

**Files:**
- Create: `components/VideoPlayer.tsx`
- Create: `app/watch/page.tsx`

**Interfaces:** Consumes `VideoCard` link target (`/watch?v=<id>`). Renders the YouTube IFrame embed.

- [ ] **Step 1: Create `components/VideoPlayer.tsx`**

```tsx
"use client";

import { useEffect, useState } from "react";

export default function VideoPlayer({ videoId }: { videoId: string }) {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    setOnline(navigator.onLine);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  if (!online) {
    return (
      <p className="px-4 py-10 text-center text-sm text-[var(--muted)]">
        You&apos;re offline — this stream can&apos;t play right now.
      </p>
    );
  }

  return (
    <div className="aspect-video w-full bg-black">
      <iframe
        className="h-full w-full"
        src={`https://www.youtube.com/embed/${videoId}?autoplay=1&playsinline=1`}
        title="YouTube video player"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
      />
    </div>
  );
}
```

- [ ] **Step 2: Create `app/watch/page.tsx` (server component, awaits searchParams)**

```tsx
import Link from "next/link";
import VideoPlayer from "@/components/VideoPlayer";

export default async function WatchPage({
  searchParams,
}: {
  searchParams: Promise<{ v?: string }>;
}) {
  const { v } = await searchParams;

  return (
    <main className="min-h-dvh">
      <div className="sticky top-0 flex items-center bg-[var(--bg)] px-3 py-2">
        <Link href="/" className="text-sm text-[var(--fg)]">
          ‹ Back
        </Link>
      </div>
      {v ? (
        <VideoPlayer videoId={v} />
      ) : (
        <p className="px-4 py-10 text-center text-sm text-[var(--muted)]">
          No video specified.
        </p>
      )}
    </main>
  );
}
```

- [ ] **Step 3: Verify lint + build**

Run: `npm run lint && npm run build`
Expected: lint passes; build succeeds; `/watch` route compiled.

- [ ] **Step 4: Commit**

```bash
git add components/VideoPlayer.tsx app/watch/page.tsx
git commit -m "feat: watch page with YouTube IFrame player and offline guard"
```

---

### Task 7: Final verification & commit

**Files:** None new — verification only.

- [ ] **Step 1: Run unit tests**

Run: `node --import tsx --test lib/__tests__/*.test.ts`
Expected: all pass.

- [ ] **Step 2: Lint + production build**

Run: `npm run lint && npm run build`
Expected: clean lint, successful build.

- [ ] **Step 3: Manual smoke (document results, no code change)**

Run: `npm run build && npm start` then open `http://localhost:3000` in browser device mode (mobile):
1. Channel page renders: banner, avatar, title, subscriber count, Subscribe.
2. Video grid shows cards; at least one LIVE/Upcoming badge visible (mock mode).
3. Clicking a card opens `/watch?v=...` and the YouTube embed loads.
4. Install prompt appears (or manifest valid via DevTools > Application > Manifest).
5. With SW active, reload offline (DevTools > Network > Offline) → cached shell + cached thumbnails render; uncached watch shows the offline message.

- [ ] **Step 4: Commit any final tidy-ups**

```bash
git add -A
git commit -m "chore: final verification of clone UI, PWA, and tests" || echo "nothing to commit"
```

---

## Self-Review Summary

- **Spec coverage:** §1 scope → Task 5/6 (mobile, channel clone, daily live grid). §2 stack → all tasks use Next 16 + Tailwind v4. §3 data layer + mock fallback → Task 2/3. §4 pages/components → Task 5/6. §5 PWA → Task 1/4. §6 error/offline handling → Task 3 fallback, Task 4 SW, Task 6 offline guard. §7 env → Task 1 `.env.example` + gitignore exception. §8 verification → Task 7.
- **No placeholders:** every code step contains complete, runnable code.
- **Type consistency:** `Channel`/`Video` defined in Task 2; reused identically in Tasks 3, 5. `getChannelData`/`getStreams` signatures stable. `mapChannelResponse`/`mapVideosResponse`/`formatCount` exported from Task 3 and imported by tests. Response types `ChannelsResponse`/`VideosResponse`/`SearchResponse` exported from Task 3 and used in tests.
- **Next 16 specifics honored:** `viewport` for themeColor, `searchParams` as Promise, `NEXT_PUBLIC_` inlined, native `manifest.ts`, SW at `public/sw.js`.
