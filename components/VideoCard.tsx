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
