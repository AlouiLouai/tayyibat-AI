import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Tayyibat AI",
    short_name: "Tayyibat",
    description: "فاحص التزام غذائي عربي بمنهج الطيبات.",
    start_url: "/",
    display: "standalone",
    background_color: "#050505",
    theme_color: "#FF5722",
    lang: "ar",
    dir: "rtl",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
