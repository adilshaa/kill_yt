"use client";

import { useEffect, useState } from "react";

export default function VideoPlayer({ videoId }: { videoId: string }) {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
