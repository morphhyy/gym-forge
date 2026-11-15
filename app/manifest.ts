import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "GymForge - Your Personal Workout Companion",
    short_name: "GymForge",
    description:
      "Track your workouts, build strength, and visualize your progress with GymForge.",
    // Installed app opens straight into the authenticated area; signed-out
    // users are redirected to sign-in by proxy.ts.
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    background_color: "#0a0a0a",
    theme_color: "#10b981",
    orientation: "portrait-primary",
    categories: ["health", "fitness", "lifestyle"],
    icons: [
      {
        src: "/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      // TODO(design): these reuse the full-bleed icons. The background fills
      // the canvas (good), but the outer dumbbell plates extend past the 80%
      // maskable safe zone and get slightly clipped by circular masks.
      // Replace with a dedicated asset with ~20% padding around the glyph.
      {
        src: "/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Log workout",
        short_name: "Log",
        description: "Start or continue today's workout log",
        url: "/log",
        icons: [{ src: "/icon-192x192.png", sizes: "192x192", type: "image/png" }],
      },
      {
        name: "Progress",
        short_name: "Progress",
        description: "View your strength and volume progress",
        url: "/progress",
        icons: [{ src: "/icon-192x192.png", sizes: "192x192", type: "image/png" }],
      },
    ],
  };
}
