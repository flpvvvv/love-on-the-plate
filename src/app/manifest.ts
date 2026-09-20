import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Love on the Plate",
    short_name: "Love on Plate",
    description: "Celebrating homemade meals with love",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#FFF3E4",
    theme_color: "#FF4B23",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  }
}
