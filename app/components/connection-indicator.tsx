"use client";

import { useEffect, useState } from "react";
import { CloudOff, Loader2 } from "lucide-react";
import { useConnectionStatus } from "@/app/lib/use-online-status";

// Brief WebSocket reconnects are normal (tab wake, network switch); only
// surface "Reconnecting" if it lasts longer than this.
const RECONNECT_GRACE_MS = 2500;

/**
 * Small floating pill shown only when something is wrong:
 *  - browser offline, or
 *  - Convex WebSocket disconnected for > RECONNECT_GRACE_MS.
 *
 * Convex keeps unsent mutations in memory and replays them on reconnect, so
 * logged sets survive a dropped connection as long as the tab stays open —
 * the pill tells the user how many are waiting and not to close the app.
 */
export function ConnectionIndicator() {
  const { status, pendingMutations } = useConnectionStatus();
  const [showReconnecting, setShowReconnecting] = useState(false);

  useEffect(() => {
    if (status !== "reconnecting") {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset debounce when status changes
      setShowReconnecting(false);
      return;
    }
    const timer = setTimeout(() => setShowReconnecting(true), RECONNECT_GRACE_MS);
    return () => clearTimeout(timer);
  }, [status]);

  const visible = status === "offline" || (status === "reconnecting" && showReconnecting);
  if (!visible) return null;

  const offline = status === "offline";
  const pendingText =
    pendingMutations > 0
      ? ` · ${pendingMutations} change${pendingMutations === 1 ? "" : "s"} waiting to sync — keep the app open`
      : "";

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-16 lg:top-4 left-1/2 -translate-x-1/2 z-[60] max-w-[calc(100vw-2rem)] flex items-center gap-2 rounded-full border border-border bg-card/95 backdrop-blur-sm px-3.5 py-1.5 text-xs font-medium shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
    >
      {offline ? (
        <CloudOff className="w-3.5 h-3.5 shrink-0 text-amber-400" aria-hidden="true" />
      ) : (
        <Loader2 className="w-3.5 h-3.5 shrink-0 animate-spin text-amber-400" aria-hidden="true" />
      )}
      <span className="truncate">
        {offline ? "You're offline" : "Reconnecting…"}
        {pendingText}
      </span>
    </div>
  );
}
