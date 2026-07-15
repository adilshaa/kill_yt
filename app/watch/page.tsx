"use client";

import { useEffect, useState } from "react";
import VideoPlayer from "@/components/VideoPlayer";
import VideoCard from "@/components/VideoCard";
import { getChannelData, getWatchData } from "@/lib/youtube";
import type { Channel, Video } from "@/lib/types";

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export default function WatchPage({
  searchParams,
}: {
  searchParams: Promise<{ v?: string }>;
}) {
  const [videoId, setVideoId] = useState<string | null>(null);
  const [video, setVideo] = useState<Video | null>(null);
  const [channel, setChannel] = useState<Channel | null>(null);
  const [suggestions, setSuggestions] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    searchParams.then((sp) => setVideoId(sp.v ?? null));
  }, [searchParams]);

  useEffect(() => {
    if (!videoId) return;
    let active = true;
    (async () => {
      try {
        const [watch, chan] = await Promise.all([
          getWatchData(videoId),
          getChannelData(),
        ]);
        if (!active) return;
        setVideo(watch.data.video);
        setSuggestions(watch.data.suggestions);
        setChannel(chan.data);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [videoId]);

  if (!videoId) {
    return (
      <main className="min-h-dvh">
        <TopBar onBack={() => {}} />
        <p className="px-4 py-10 text-center text-sm text-[var(--muted)]">
          No video specified.
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-dvh">
      <TopBar onBack={() => history.back()} />
      {loading ? (
        <p className="px-4 py-10 text-center text-sm text-[var(--muted)]">
          Loading…
        </p>
      ) : (
        <>
          <VideoPlayer videoId={videoId} />
          <section className="px-3 py-3">
            <h1 className="text-base font-semibold leading-snug">
              {video?.title}
            </h1>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {video?.isLive && video.liveViewers
                ? `${video.liveViewers} watching · `
                : ""}
              {video?.isUpcoming
                ? "Scheduled"
                : `${video?.viewCount ?? "0"} views · ${
                    video ? timeAgo(video.publishedAt) : ""
                  }`}
            </p>

            {channel && (
              <div className="mt-3 flex items-center gap-3 border-y border-zinc-800 py-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={channel.avatarUrl}
                  alt=""
                  className="h-10 w-10 rounded-full bg-zinc-700 object-cover"
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">
                    {channel.title}
                  </p>
                  <p className="text-xs text-[var(--muted)]">
                    {channel.subscriberCount} subscribers
                  </p>
                </div>
                <a
                  href={`https://www.youtube.com/channel/${channel.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-auto rounded-full bg-[var(--accent)] px-4 py-1.5 text-sm font-semibold text-white"
                >
                  Subscribe
                </a>
              </div>
            )}

            <h2 className="mb-1 mt-4 text-sm font-bold">Up next</h2>
            <div className="flex flex-col">
              {suggestions.map((s) => (
                <VideoCard key={s.id} video={s} />
              ))}
            </div>
          </section>
        </>
      )}
    </main>
  );
}

function TopBar({ onBack }: { onBack: () => void }) {
  return (
    <div className="sticky top-0 z-10 flex items-center bg-[var(--bg)] px-3 py-2">
      <button onClick={onBack} className="text-sm text-[var(--fg)]">
        ‹ Back
      </button>
    </div>
  );
}
