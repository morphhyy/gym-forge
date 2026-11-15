"use client";

import { useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { clearCachedPages, initInstallPromptCapture } from "@/app/lib/pwa";

// Inlined at build time by next.config.ts.
const SW_BUILD_ID = process.env.NEXT_PUBLIC_SW_BUILD_ID || "dev";

/**
 * Registers /sw.js in production builds only. In development any previously
 * installed GymForge worker (e.g. from testing `next start` on the same port)
 * is unregistered so it can't serve stale assets under `next dev`.
 *
 * Must be rendered inside <ClerkProvider>: when the user is signed out we
 * delete the cached pages so they aren't served offline to the next person
 * using the device.
 */
export function ServiceWorkerRegistrar() {
  const { isLoaded, isSignedIn } = useAuth();

  useEffect(() => {
    if (!isLoaded || isSignedIn) return;
    // Also cleared at each sign-out button; this catches every other path
    // (session expiry, signing out in another tab).
    void clearCachedPages();
  }, [isLoaded, isSignedIn]);

  useEffect(() => {
    initInstallPromptCapture();

    if (!("serviceWorker" in navigator)) return;

    if (process.env.NODE_ENV !== "production") {
      navigator.serviceWorker
        .getRegistrations()
        .then((regs) =>
          Promise.all(
            regs
              .filter((r) => {
                const url = (r.active ?? r.waiting ?? r.installing)?.scriptURL;
                return url ? new URL(url).pathname === "/sw.js" : false;
              })
              .map((r) => r.unregister())
          )
        )
        .catch(() => {});
      return;
    }

    const register = () => {
      navigator.serviceWorker
        // A new build id => new script URL => new worker + fresh caches.
        .register(`/sw.js?v=${encodeURIComponent(SW_BUILD_ID)}`, {
          scope: "/",
          updateViaCache: "none",
        })
        .catch((error) => console.error("Service worker registration failed", error));
    };

    // Don't compete with the initial page load for bandwidth.
    if (document.readyState === "complete") {
      register();
    } else {
      window.addEventListener("load", register, { once: true });
      return () => window.removeEventListener("load", register);
    }
  }, []);

  return null;
}
