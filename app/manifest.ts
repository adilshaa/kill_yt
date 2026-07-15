import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "kill_yt — Channel Viewer",
    short_name: "kill_yt",
    description: "Personal mobile YouTube channel viewer",
    start_url: "/",
    display: "standalone",
    background_color: "#0f0f0f",
    theme_color: "#0f0f0f",
    orientation: "portrait",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      {
        src: "/icon-maskable.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
