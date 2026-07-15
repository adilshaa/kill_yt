export interface Channel {
  id: string;
  title: string;
  avatarUrl: string;
  bannerUrl: string | null;
  subscriberCount: string;
  description: string;
}

export interface Video {
  id: string;
  title: string;
  thumbnailUrl: string;
  publishedAt: string;
  viewCount: string;
  isLive: boolean;
  isUpcoming: boolean;
  liveViewers: string | null;
}
