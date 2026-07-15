# Design: kill_yt — Mobile YouTube Channel Clone (PWA)

**Date:** 2026-07-15
**Status:** Approved (design phase)

## 1. Goal & Scope

Build a personal-use, **mobile-only** web app that clones a single YouTube channel's
page and surfaces that channel's **daily live-stream videos**. The app is installable
as a PWA and works offline via a cached app shell.

Out of scope (explicitly): live chat, push/go-live alerts, background audio playback,
desktop layout, multiple channels, account/login, comments.

### Confirmed decisions
- **Primary view:** Channel page clone — banner, avatar, subscribe button, then a video
  grid of the channel's live/daily streams.
- **Extra capabilities:** Installable + offline shell only (no chat, no alerts, no
  background audio).
- **Channel source:** Placeholder for now; real channel ID + API key supplied later via
  env vars.
- **Data fetch:** Client-side, using a `NEXT_PUBLIC_` env var for the API key (user's
  explicit choice). Key lives in the browser bundle — acceptable for personal use on the
  owner's device. Code structured so switching to a server proxy is a one-line change.

## 2. Tech Stack

- **Next.js 16.2.10** (App Router), **React 19.2.4**, **TypeScript 5**, **Tailwind CSS v4**.
- IMPORTANT: This Next.js version has breaking changes vs. training-data Next.js. Before
  writing code, read the bundled docs under `node_modules/next/dist/docs/` for:
  `app/getting-started`, Route Handlers, Metadata/Manifest, and any PWA/service-worker
  guidance. Follow the framework's native conventions (e.g. `app/manifest.ts`).

## 3. Architecture

```
app/
  layout.tsx            # root layout, mobile viewport, dark theme, SW register
  page.tsx              # channel page (ChannelHeader + VideoGrid)
  watch/
    page.tsx            # full-screen player route (?v=VIDEO_ID)
  manifest.ts           # Next native PWA manifest
  globals.css           # Tailwind v4 + YouTube-dark theme tokens
components/
  ChannelHeader.tsx     # banner, round avatar, title, subscriber count, Subscribe btn
  VideoGrid.tsx         # responsive mobile grid of VideoCard
  VideoCard.tsx         # thumbnail, title, LIVE/Upcoming badge, views, relative time
  VideoPlayer.tsx       # YouTube IFrame embed
  ServiceWorkerRegister.tsx  # registers /sw.js on client
lib/
  youtube.ts            # data layer (getChannel, getLiveStreams, getRecentStreams)
  mock.ts               # realistic sample data when key unset / fetch fails
  types.ts              # Channel, Video, LiveStatus models
public/
  sw.js                 # service worker: precache shell + runtime caches
  icons/                # PWA icons (192, 512, maskable)
.env.example            # committed template
.env.local              # user-supplied (git-ignored)
```

### Data layer (`lib/youtube.ts`)
- `getChannel(channelId, key)` → `channels.list?part=snippet,statistics` →
  banner/avatar/title/subscriberCount.
- `getLiveStreams(channelId, key)` → `search.list?channelId=&eventType=live&type=video&order=date`.
- `getRecentStreams(channelId, key)` → `search.list?channelId=&type=video&order=date`
  (omit `eventType` to get all uploads = the channel's daily streams); a populated
  `liveStreamingDetails` ⇒ currently live or upcoming. Combine with `getLiveStreams` so
  live items are pinned to the top of the grid.
- All functions: if `key` missing or fetch throws/non-200 ⇒ return `lib/mock.ts` data and
  flag `isMock` so the UI can show a subtle "sample data" notice.

### Models (`lib/types.ts`)
- `Channel { id, title, avatarUrl, bannerUrl, subscriberCount, description }`
- `Video { id, title, thumbnailUrl, publishedAt, viewCount, isLive, isUpcoming, liveViewers? }`

## 4. Pages & Components

### `/` — Channel page (mobile)
- `ChannelHeader`: full-width banner (16:9-ish), overlapping round avatar, channel title,
  subscriber count ("1.2M subscribers"), Subscribe button (visual only, opens YouTube).
- `VideoGrid`: single-column (or 2-col on wider phones) scroll of `VideoCard`.
- `VideoCard`: 16:9 thumbnail, red LIVE pill when `isLive`, "Upcoming" pill when
  `isUpcoming`, title (1-2 lines), view count + relative time. Tap → `/watch?v=ID`.

### `/watch?v=ID` — Player
- Full-screen `VideoPlayer` (YouTube IFrame API embed, autoplay). Back button returns to
  channel page. Chosen as a route (not modal) for correct PWA back-button/share behavior.
- If offline and not cached, show "unavailable offline" message.

### Mobile chrome
- Sticky top bar: small avatar + channel name. Content constrained to ~480px, centered on
  larger screens. YouTube-dark background (#0f0f0f). No desktop adaptations.

## 5. PWA

- `app/manifest.ts`: `name`, `short_name`, `start_url: "/"`, `display: "standalone"`,
  `background_color`/`theme_color: #0f0f0f`, `icons` (192 + 512 + maskable).
- `public/sw.js`:
  - `install`: precache app shell (HTML, CSS, core JS, manifest, icons).
  - `fetch` (navigations): network-first, fall back to cached shell when offline.
  - `fetch` (images/thumbnails): cache-first, runtime-populate.
- `ServiceWorkerRegister`: client component, registers `/sw.js` in `useEffect`
  (only in production/`navigator.serviceWorker` present).
- Offline behavior: cached channel shell + cached thumbnails render; live data unavailable
  ⇒ "You're offline — showing cached content" notice (no crash).

## 6. Error Handling & Fallbacks

- Missing API key → mock data + subtle notice.
- API error / quota exceeded / network fail → mock data (or last cached on SW) + notice.
- Offline → cached shell; uncached watch → friendly message.
- No unhandled exceptions on any of the above.

## 7. Configuration

`.env.example` (committed):
```
NEXT_PUBLIC_YOUTUBE_API_KEY=
NEXT_PUBLIC_YOUTUBE_CHANNEL_ID=UCPLACEHOLDER
```
`.env.local` is git-ignored; user fills real values. App runs with zeros config via mock.

## 8. Verification

- `npm run lint` passes.
- `npm run build` succeeds.
- Dev manual check in browser device mode (mobile): channel page renders, grid shows
  cards with LIVE/Upcoming badges, tapping a card plays the stream, install prompt appears
  (or manifest valid), offline reload shows cached shell.
- Mock mode verified by running with empty `.env.local`.

## 9. Out of Scope / Future

- Server-side proxy (drop-in later for key secrecy).
- Live chat, go-live push, background audio.
- Desktop responsive layout, multiple channels, auth.
