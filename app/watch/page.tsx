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
