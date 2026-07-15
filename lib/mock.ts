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
