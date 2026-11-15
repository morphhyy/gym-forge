/**
 * PWA helpers: `beforeinstallprompt` capture + platform detection.
 *
 * `beforeinstallprompt` fires once per page load, often before the component
 * that wants to show an install button mounts. `initInstallPromptCapture()` is
 * called from the root-level <ServiceWorkerRegistrar/> so the event is stored
 * here and can be consumed later by <InstallPrompt/>.
 */

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
  prompt(): Promise<void>;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;
let initialized = false;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

export function initInstallPromptCapture() {
  if (initialized || typeof window === "undefined") return;
  initialized = true;
  window.addEventListener("beforeinstallprompt", (event) => {
    // Stop the browser's mini-infobar; we show our own UI.
    event.preventDefault();
    deferredPrompt = event as BeforeInstallPromptEvent;
    emit();
  });
  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    emit();
  });
}

export function subscribeInstallPrompt(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getInstallPrompt(): BeforeInstallPromptEvent | null {
  return deferredPrompt;
}

/** Shows the native install dialog. Returns the user's choice. */
export async function promptInstall(): Promise<"accepted" | "dismissed" | "unavailable"> {
  const event = deferredPrompt;
  if (!event) return "unavailable";
  // The event can only be used once.
  deferredPrompt = null;
  emit();
  try {
    await event.prompt();
    const { outcome } = await event.userChoice;
    return outcome;
  } catch {
    return "unavailable";
  }
}

/** iPhone/iPad/iPod, including iPadOS which reports itself as "Macintosh". */
export function isIosDevice(userAgent: string, maxTouchPoints = 0): boolean {
  if (/iPad|iPhone|iPod/.test(userAgent)) return true;
  return /Macintosh/.test(userAgent) && maxTouchPoints > 1;
}

/** True when running as an installed app (standalone display mode). */
export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return (
    nav.standalone === true ||
    window.matchMedia?.("(display-mode: standalone)").matches === true
  );
}
