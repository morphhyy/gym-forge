"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Download, Share, SquarePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getInstallPrompt,
  isIosDevice,
  isStandalone,
  promptInstall,
  subscribeInstallPrompt,
} from "@/app/lib/pwa";

const DISMISS_KEY = "gymforge:install-prompt-dismissed-at";
// Ask again after this long; a dismissal shouldn't be permanent.
const DISMISS_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function readDismissed(): boolean {
  try {
    const raw = window.localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const at = Number(raw);
    return Number.isFinite(at) && Date.now() - at < DISMISS_TTL_MS;
  } catch {
    return false;
  }
}

function writeDismissed() {
  try {
    window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
  } catch {
    // Storage unavailable (private mode, blocked) — dismissal lasts this session only.
  }
}

/**
 * "Install GymForge" banner. Uses the captured `beforeinstallprompt` event on
 * Chromium browsers; on iOS (no install API) shows Share → Add to Home Screen
 * instructions. Hidden when already installed or recently dismissed.
 */
export function InstallPrompt() {
  const installEvent = useSyncExternalStore(
    subscribeInstallPrompt,
    getInstallPrompt,
    () => null
  );
  // Client-only facts, resolved after mount to avoid hydration mismatches.
  const [env, setEnv] = useState<{ ios: boolean; eligible: boolean } | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reading browser-only APIs after mount
    setEnv({
      ios: isIosDevice(navigator.userAgent, navigator.maxTouchPoints),
      eligible: !isStandalone() && !readDismissed(),
    });
  }, []);

  if (!env || !env.eligible || dismissed) return null;
  const mode = installEvent ? "prompt" : env.ios ? "ios" : null;
  if (!mode) return null;

  const dismiss = () => {
    writeDismissed();
    setDismissed(true);
  };

  const install = async () => {
    const outcome = await promptInstall();
    if (outcome === "dismissed") dismiss();
    if (outcome === "accepted") setDismissed(true);
  };

  return (
    <div
      role="dialog"
      aria-labelledby="install-prompt-title"
      className="fixed z-40 left-4 right-4 bottom-24 lg:left-auto lg:right-6 lg:bottom-6 lg:w-96 rounded-xl border border-border bg-card shadow-[0_8px_32px_rgba(0,0,0,0.4)] p-4"
    >
      <div className="flex items-start gap-3">
        <div className="shrink-0 rounded-lg bg-primary-muted p-2 text-primary">
          <Download className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p id="install-prompt-title" className="font-semibold">
            Install GymForge
          </p>
          {mode === "prompt" ? (
            <p className="text-sm text-muted-foreground mt-0.5">
              Add GymForge to your home screen for quick, full-screen access at the gym.
            </p>
          ) : (
            <p className="text-sm text-muted-foreground mt-0.5">
              Tap{" "}
              <Share className="inline w-4 h-4 -mt-0.5" aria-label="Share" />{" "}
              <span className="font-medium text-foreground">Share</span>, then{" "}
              <SquarePlus className="inline w-4 h-4 -mt-0.5" aria-hidden="true" />{" "}
              <span className="font-medium text-foreground">Add to Home Screen</span>.
            </p>
          )}
          {mode === "prompt" && (
            <div className="mt-3 flex gap-2">
              <Button size="sm" onClick={install}>
                Install
              </Button>
              <Button size="sm" variant="ghost" onClick={dismiss}>
                Not now
              </Button>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss install prompt"
          className="shrink-0 p-1 rounded-md text-muted-foreground hover:text-foreground"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
