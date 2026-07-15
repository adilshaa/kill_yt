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
