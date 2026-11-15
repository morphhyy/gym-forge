/* GymForge service worker (hand-written, no build step).
 *
 * Strategy:
 *  - /_next/static/* and same-origin static assets: stale-while-revalidate.
 *  - Google Fonts (CSS + font files): stale-while-revalidate.
 *  - Page navigations: network-first, falling back to the last cached copy of
 *    that page, then to the precached /offline page.
 *  - Everything else (Convex HTTP/WebSocket, Clerk, /api, RSC/prefetch
 *    requests, non-GET requests): NOT intercepted — the browser handles it.
 *
 * Versioning: caches are named after CACHE_VERSION (bump when this file's
 * caching behaviour changes) plus the build id passed as `?v=` by the
 * registrar. Each deploy registers a new script URL, which installs a fresh
 * worker; on activate every other gymforge-* cache is deleted, so cached HTML
 * never points at chunks from a different build.
 */

const CACHE_VERSION = "v1";
const BUILD_ID = new URL(self.location.href).searchParams.get("v") || "dev";
const CACHE_PREFIX = "gymforge-";
const STATIC_CACHE = `${CACHE_PREFIX}static-${CACHE_VERSION}-${BUILD_ID}`;
const PAGES_CACHE = `${CACHE_PREFIX}pages-${CACHE_VERSION}-${BUILD_ID}`;
const OFFLINE_URL = "/offline";

const PRECACHE_URLS = [
  OFFLINE_URL,
  "/manifest.webmanifest",
  "/icon-192x192.png",
  "/icon-512x512.png",
  "/apple-touch-icon.png",
];

// Cross-origin hosts we are allowed to cache (fonts only).
const CACHEABLE_CROSS_ORIGIN_HOSTS = new Set([
  "fonts.googleapis.com",
  "fonts.gstatic.com",
]);

// Same-origin static file extensions to cache. GIF/PDF/video are deliberately
// excluded to keep the cache small.
const STATIC_EXT_RE = /\.(?:css|js|woff2?|ttf|png|jpe?g|webp|svg|ico)$/i;

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(STATIC_CACHE);
      // cache: "reload" bypasses the HTTP cache so we store fresh copies.
      await cache.addAll(
        PRECACHE_URLS.map((url) => new Request(url, { cache: "reload" }))
      );
      // The offline page needs its JS/CSS to hydrate. Pull every
      // /_next/static URL referenced by its HTML (incl. the RSC payload,
      // where quotes are escaped) and cache them too. Best effort.
      try {
        const offline = await cache.match(OFFLINE_URL);
        const html = offline ? await offline.text() : "";
        const assets = new Set(html.match(/\/_next\/static\/[^"'\s\\)<>]+/g) || []);
        await Promise.all(
          [...assets].map((url) => cache.add(url).catch(() => {}))
        );
      } catch {
        // ignore — the page still renders as static HTML/CSS
      }
      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keep = new Set([STATIC_CACHE, PAGES_CACHE]);
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key.startsWith(CACHE_PREFIX) && !keep.has(key))
          .map((key) => caches.delete(key))
      );
      await self.clients.claim();
    })()
  );
});

function isAuthOrBackendRequest(url) {
  const host = url.hostname;
  return (
    // Convex (HTTP + WebSocket sync).
    host.endsWith(".convex.cloud") ||
    host.endsWith(".convex.site") ||
    // Clerk (frontend API, accounts portal, image CDN).
    host.includes("clerk") ||
    host.endsWith(".accounts.dev") ||
    // Same-origin auth/API routes and Clerk handshake/proxy traffic.
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/__clerk") ||
    url.pathname.startsWith("/sign-in") ||
    url.pathname.startsWith("/sign-up") ||
    url.search.includes("__clerk")
  );
}

function isRscRequest(request, url) {
  return (
    request.headers.get("RSC") === "1" ||
    request.headers.has("Next-Router-Prefetch") ||
    request.headers.has("Next-Router-State-Tree") ||
    url.searchParams.has("_rsc")
  );
}

async function staleWhileRevalidate(event, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(event.request);
  const network = fetch(event.request)
    .then((response) => {
      // status 0 = opaque cross-origin response (e.g. no-cors font CSS).
      if (response.ok || response.type === "opaque") {
        cache.put(event.request, response.clone()).catch(() => {});
      }
      return response;
    })
    .catch(() => undefined);

  if (cached) {
    event.waitUntil(network);
    return cached;
  }
  const response = await network;
  return response || Response.error();
}

async function networkFirstNavigation(event) {
  const cache = await caches.open(PAGES_CACHE);
  try {
    const response = await fetch(event.request);
    // Only cache clean, successful HTML (skip auth redirects / errors).
    if (
      response.ok &&
      !response.redirected &&
      response.type === "basic" &&
      (response.headers.get("content-type") || "").includes("text/html")
    ) {
      event.waitUntil(cache.put(event.request, response.clone()));
    }
    return response;
  } catch {
    const cachedPage = await cache.match(event.request, { ignoreSearch: true });
    if (cachedPage) return cachedPage;
    const offline = await caches.match(OFFLINE_URL);
    return (
      offline ||
      new Response("You are offline.", {
        status: 503,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      })
    );
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.protocol !== "http:" && url.protocol !== "https:") return;
  if (isAuthOrBackendRequest(url)) return;

  if (url.origin !== self.location.origin) {
    if (CACHEABLE_CROSS_ORIGIN_HOSTS.has(url.hostname)) {
      event.respondWith(staleWhileRevalidate(event, STATIC_CACHE));
    }
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(networkFirstNavigation(event));
    return;
  }

  if (isRscRequest(request, url)) return;

  if (url.pathname.startsWith("/_next/static/") || STATIC_EXT_RE.test(url.pathname)) {
    event.respondWith(staleWhileRevalidate(event, STATIC_CACHE));
  }
});

self.addEventListener("message", (event) => {
  if (event.origin && event.origin !== self.location.origin) return;
  const type = event.data && event.data.type;
  // Call on sign-out so previously visited pages are not served offline to
  // the next user of this device.
  if (type === "CLEAR_PAGE_CACHE") {
    event.waitUntil(caches.delete(PAGES_CACHE));
  }
});

// Local notifications (see app/lib/notifications.ts): focus an open window
// (or open one) when the user taps the notification.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(
    (event.notification.data && event.notification.data.url) || "/dashboard",
    self.location.origin
  ).href;

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      for (const client of windows) {
        if (client.url === target && "focus" in client) return client.focus();
      }
      const anyClient = windows.find((c) => "focus" in c);
      if (anyClient) {
        await anyClient.focus();
        if ("navigate" in anyClient) return anyClient.navigate(target);
        return;
      }
      return self.clients.openWindow(target);
    })()
  );
});
