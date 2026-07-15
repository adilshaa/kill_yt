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
