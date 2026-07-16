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
    contentDetails?: {
      relatedPlaylists?: { uploads?: string };
    };
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

export interface PlaylistItemsResponse {
  items: Array<{
    contentDetails: { videoId: string };
  }>;
}

function shouldUseMock(): boolean {
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

export async function getUploadsPlaylistId(
  channelIdOrHandle: string,
): Promise<string | null> {
  // Try direct channel id lookup first.
  try {
    const byId = await ytFetch<ChannelsResponse>("channels", {
      part: "contentDetails",
      id: channelIdOrHandle,
    });
    const up = byId.items[0]?.contentDetails?.relatedPlaylists?.uploads;
    if (up) return up;
  } catch {
    /* fall through to handle lookup */
  }
  // Fallback: the value may be a @handle (search.list id= quirk for some channels).
  try {
    const handle = channelIdOrHandle.replace(/^@/, "");
    const byHandle = await ytFetch<ChannelsResponse>("channels", {
      part: "contentDetails",
      forHandle: handle,
    });
    return byHandle.items[0]?.contentDetails?.relatedPlaylists?.uploads ?? null;
  } catch {
    return null;
  }
}

export async function getChannelData(): Promise<YouTubeResult<Channel>> {
  if (shouldUseMock()) return { data: mockChannel, isMock: true };
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

export async function getWatchData(
  videoId: string,
): Promise<YouTubeResult<{ video: Video; suggestions: Video[] }>> {
  if (shouldUseMock()) {
    const current =
      mockVideos.find((v) => v.id === videoId) ??
      { ...mockVideos[0], id: videoId, title: "Selected Stream" };
    const suggestions = mockVideos.filter((v) => v.id !== current.id);
    return { data: { video: current, suggestions }, isMock: true };
  }
  try {
    const [videoJson, uploadsId] = await Promise.all([
      ytFetch<VideosResponse>("videos", {
        part: "snippet,statistics,liveStreamingDetails",
        id: videoId,
      }),
      getUploadsPlaylistId(CHANNEL_ID!),
    ]);

    const mapped = mapVideosResponse(videoJson);
    const video = mapped[0] ?? {
      id: videoId,
      title: "Video",
      thumbnailUrl: "/placeholder-thumb.svg",
      publishedAt: new Date().toISOString(),
      viewCount: "0",
      isLive: false,
      isUpcoming: false,
      liveViewers: null,
    };

    if (!uploadsId) {
      return { data: { video, suggestions: [] }, isMock: false };
    }

    const items = await ytFetch<PlaylistItemsResponse>("playlistItems", {
      part: "contentDetails",
      playlistId: uploadsId,
      maxResults: "12",
    });
    const ids = items.items
      .map((i) => i.contentDetails.videoId)
      .filter((id) => id && id !== videoId);
    if (ids.length === 0) {
      return { data: { video, suggestions: [] }, isMock: false };
    }

    const stats = await ytFetch<VideosResponse>("videos", {
      part: "snippet,statistics,liveStreamingDetails",
      id: ids.join(","),
    });
    const suggestions = mapVideosResponse(stats).sort(
      (a, b) =>
        Number(b.isLive) - Number(a.isLive) ||
        Number(b.isUpcoming) - Number(a.isUpcoming),
    );

    return { data: { video, suggestions }, isMock: false };
  } catch {
    const current = { ...mockVideos[0], id: videoId, title: "Selected Stream" };
    return {
      data: { video: current, suggestions: mockVideos.filter((v) => v.id !== videoId) },
      isMock: true,
    };
  }
}

export async function getStreams(): Promise<YouTubeResult<Video[]>> {
  if (shouldUseMock()) return { data: mockVideos, isMock: true };
  try {
    const uploadsId = await getUploadsPlaylistId(CHANNEL_ID!);
    if (!uploadsId) return { data: [], isMock: false };

    const items = await ytFetch<PlaylistItemsResponse>("playlistItems", {
      part: "contentDetails",
      playlistId: uploadsId,
      maxResults: "20",
    });
    const ids = items.items
      .map((i) => i.contentDetails.videoId)
      .filter(Boolean);
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
