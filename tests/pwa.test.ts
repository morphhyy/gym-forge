import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { deriveConnectionInfo } from "@/app/lib/use-online-status";
import { isIosDevice } from "@/app/lib/pwa";

describe("deriveConnectionInfo", () => {
  const connected = { isWebSocketConnected: true, hasEverConnected: true, inflightMutations: 0 };

  it("is online when browser and Convex are connected", () => {
    expect(deriveConnectionInfo(true, connected)).toMatchObject({
      status: "online",
      isConvexConnected: true,
      hasUnsyncedChanges: false,
    });
  });

  it("is offline when the browser is offline, regardless of socket state", () => {
    const info = deriveConnectionInfo(false, { ...connected, inflightMutations: 2 });
    expect(info.status).toBe("offline");
    expect(info.isConvexConnected).toBe(false);
    expect(info.hasUnsyncedChanges).toBe(true);
    expect(info.pendingMutations).toBe(2);
  });

  it("is reconnecting after a previously established socket drops", () => {
    expect(
      deriveConnectionInfo(true, { ...connected, isWebSocketConnected: false }).status
    ).toBe("reconnecting");
  });

  it("is connecting before the first connection", () => {
    expect(
      deriveConnectionInfo(true, {
        isWebSocketConnected: false,
        hasEverConnected: false,
        inflightMutations: 0,
      }).status
    ).toBe("connecting");
  });

  it("does not flag in-flight mutations as unsynced while connected", () => {
    expect(
      deriveConnectionInfo(true, { ...connected, inflightMutations: 1 }).hasUnsyncedChanges
    ).toBe(false);
  });
});

describe("isIosDevice", () => {
  it("detects iPhone", () => {
    expect(
      isIosDevice(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1"
      )
    ).toBe(true);
  });

  it("detects iPadOS reporting as Macintosh via touch points", () => {
    const ua =
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/17.0 Safari/605.1.15";
    expect(isIosDevice(ua, 5)).toBe(true);
    expect(isIosDevice(ua, 0)).toBe(false);
  });

  it("is false for Android", () => {
    expect(isIosDevice("Mozilla/5.0 (Linux; Android 14; Pixel 8) Chrome/120 Mobile", 5)).toBe(
      false
    );
  });
});

describe("service worker routing (public/sw.js)", () => {
  type Listener = (event: unknown) => void;
  const listeners: Record<string, Listener> = {};
  const origin = "https://gymforge.example";
  const sandbox = {
    self: {
      location: new URL(origin),
      addEventListener: (type: string, fn: Listener) => {
        listeners[type] = fn;
      },
    },
    URL,
    Request,
    Response,
    Set,
    Promise,
  };
  vm.runInNewContext(
    readFileSync(path.resolve(__dirname, "../public/sw.js"), "utf8"),
    sandbox
  );

  function handles(
    url: string,
    init: { method?: string; mode?: string; headers?: Record<string, string> } = {}
  ) {
    let responded = false;
    listeners.fetch({
      request: {
        url,
        method: init.method ?? "GET",
        mode: init.mode ?? "no-cors",
        headers: new Headers(init.headers ?? {}),
      },
      respondWith: (response: Promise<unknown>) => {
        responded = true;
        // Strategies touch Cache Storage, which isn't available here; we only
        // assert routing decisions.
        Promise.resolve(response).catch(() => {});
      },
      waitUntil: () => {},
    });
    return responded;
  }

  it("caches Next static assets and page navigations", () => {
    expect(handles(`${origin}/_next/static/chunks/main-abc123.js`)).toBe(true);
    expect(handles(`${origin}/icon-192x192.png`)).toBe(true);
    expect(handles(`${origin}/log`, { mode: "navigate" })).toBe(true);
    expect(handles("https://fonts.gstatic.com/s/dmsans/v1/font.woff2")).toBe(true);
  });

  it("never intercepts Convex, Clerk, API or non-GET traffic", () => {
    expect(handles("https://happy-animal-123.convex.cloud/api/1.31.4/sync")).toBe(false);
    expect(handles("https://happy-animal-123.convex.site/http-action")).toBe(false);
    expect(handles("https://clerk.gymforge.example/v1/client")).toBe(false);
    expect(handles("https://pleasant-cat-1.clerk.accounts.dev/v1/environment")).toBe(false);
    expect(handles(`${origin}/api/something`)).toBe(false);
    expect(handles(`${origin}/sign-in`, { mode: "navigate" })).toBe(false);
    expect(handles(`${origin}/dashboard?__clerk_handshake=abc`, { mode: "navigate" })).toBe(
      false
    );
    expect(handles(`${origin}/_next/static/x.js`, { method: "POST" })).toBe(false);
  });

  it("does not intercept RSC / prefetch requests", () => {
    expect(handles(`${origin}/log?_rsc=abc`)).toBe(false);
    expect(handles(`${origin}/progress`, { headers: { RSC: "1" } })).toBe(false);
  });

  it("does not cache large media", () => {
    expect(handles(`${origin}/plans/recomp/squat.gif`)).toBe(false);
  });
});
