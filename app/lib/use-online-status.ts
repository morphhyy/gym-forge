"use client";

import { useSyncExternalStore } from "react";
import { useConvexConnectionState } from "convex/react";
import type { ConnectionState } from "convex/browser";

/**
 * Network + Convex connectivity hooks.
 *
 * IMPORTANT — how Convex behaves offline:
 * ConvexReactClient keeps mutations it could not send in an *in-memory* queue
 * and replays them, in order, once the WebSocket reconnects. That means a set
 * logged while offline is NOT lost as long as the tab stays open, but it IS
 * lost if the tab/app is closed or reloaded before reconnecting. The mutation
 * promise stays pending until the server acknowledges it. There is no
 * persistent (IndexedDB) offline queue in this app yet — `pendingMutations`
 * below lets UI warn users that unsynced changes exist.
 */

function subscribeOnline(callback: () => void) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

/**
 * Browser network status (`navigator.onLine` + online/offline events).
 * Note `true` only means "has a network interface", not "server reachable";
 * combine with {@link useConnectionStatus} for the real picture.
 * Safe to use outside the Convex provider. Returns `true` during SSR.
 */
export function useOnlineStatus(): boolean {
  return useSyncExternalStore(
    subscribeOnline,
    () => navigator.onLine,
    () => true
  );
}

export type ConnectionStatus = "online" | "offline" | "reconnecting" | "connecting";

export interface ConnectionInfo {
  /** Overall status, suitable for UI. */
  status: ConnectionStatus;
  /** navigator.onLine */
  isOnline: boolean;
  /** Convex WebSocket currently connected. */
  isConvexConnected: boolean;
  /** Mutations sent/queued but not yet acknowledged by Convex. */
  pendingMutations: number;
  /** True when there are queued writes that have not reached the server. */
  hasUnsyncedChanges: boolean;
}

type ConvexConnectionSnapshot = Pick<
  ConnectionState,
  "isWebSocketConnected" | "hasEverConnected" | "inflightMutations"
>;

/** Pure derivation of {@link ConnectionInfo}; exported for tests. */
export function deriveConnectionInfo(
  isOnline: boolean,
  convex: ConvexConnectionSnapshot
): ConnectionInfo {
  let status: ConnectionStatus;
  if (!isOnline) status = "offline";
  else if (convex.isWebSocketConnected) status = "online";
  else if (convex.hasEverConnected) status = "reconnecting";
  else status = "connecting";

  const isConvexConnected = isOnline && convex.isWebSocketConnected;
  return {
    status,
    isOnline,
    isConvexConnected,
    pendingMutations: convex.inflightMutations,
    hasUnsyncedChanges: !isConvexConnected && convex.inflightMutations > 0,
  };
}

/**
 * Combined browser + Convex connection status. Must be rendered inside the
 * Convex provider (everything under app/providers.tsx is).
 *
 * @example
 * const { status, hasUnsyncedChanges, pendingMutations } = useConnectionStatus();
 * if (hasUnsyncedChanges) showBanner(`${pendingMutations} sets waiting to sync`);
 */
export function useConnectionStatus(): ConnectionInfo {
  const isOnline = useOnlineStatus();
  const convex = useConvexConnectionState();
  return deriveConnectionInfo(isOnline, convex);
}
