import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    // Versions the service worker (public/sw.js?v=...) per build so each
    // deploy gets fresh caches. Inlined into the client bundle at build time.
    NEXT_PUBLIC_SW_BUILD_ID:
      process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) ?? Date.now().toString(36),
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
        ],
      },
      {
        // Per the Next.js PWA guide: never HTTP-cache the service worker so
        // updates are picked up immediately.
        source: "/sw.js",
        headers: [
          {
            key: "Content-Type",
            value: "application/javascript; charset=utf-8",
          },
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
          {
            // The worker only fetches same-origin resources and Google Fonts.
            key: "Content-Security-Policy",
            value:
              "default-src 'self'; script-src 'self'; connect-src 'self' https://fonts.googleapis.com https://fonts.gstatic.com",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
