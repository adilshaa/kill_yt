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
