/**
 * Local (non-push) notification helpers.
 *
 * API:
 *   isNotificationSupported(): boolean
 *   getNotificationPermission(): NotificationPermission | "unsupported"
 *   requestNotificationPermission(): Promise<NotificationPermission | "unsupported">
 *     - Call from a user gesture (button click); browsers block/penalise
 *       unsolicited prompts and iOS requires a gesture.
 *   showLocalNotification(title, body, options?): Promise<boolean>
 *     - Shows a notification via the service worker registration when one is
 *       active (works while the tab is in the background and on Android, where
 *       `new Notification()` is not allowed), else falls back to the page-level
 *       Notification constructor. Resolves `false` if unsupported/not granted.
 *     - Pass `tag` to replace a previous notification (e.g. one rest-timer
 *       notification at a time) and `url` to choose where a tap navigates.
 *
 * Caveats:
 *   - This does not schedule anything: the page's JS must still be running to
 *     call it. Desktop browsers keep background tabs alive (timers throttled to
 *     ~1/s or ~1/min after a while), but mobile browsers may freeze a
 *     backgrounded page entirely, so a rest timer should compute remaining time
 *     from a stored end timestamp rather than counting ticks. Fully reliable
 *     delivery with the app closed needs Web Push (server-side), not this.
 *   - iOS/iPadOS (16.4+) only supports notifications for a PWA installed to
 *     the Home Screen; in Safari tabs `isNotificationSupported()` is false.
 *   - The service worker is only registered in production builds, so in
 *     `next dev` the page-level fallback is used.
 */

export type NotificationPermissionState = NotificationPermission | "unsupported";

export interface LocalNotificationOptions {
  /** Same tag replaces an existing notification instead of stacking. */
  tag?: string;
  /** Path opened/focused when the notification is clicked. Default /dashboard. */
  url?: string;
  /** Re-alert (sound/vibrate) when replacing a notification with the same tag. */
  renotify?: boolean;
  /** Keep the notification until the user dismisses it (where supported). */
  requireInteraction?: boolean;
  silent?: boolean;
  icon?: string;
}

const DEFAULT_ICON = "/icon-192x192.png";
const SW_READY_TIMEOUT_MS = 1500;

export function isNotificationSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export function getNotificationPermission(): NotificationPermissionState {
  if (!isNotificationSupported()) return "unsupported";
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<NotificationPermissionState> {
  if (!isNotificationSupported()) return "unsupported";
  if (Notification.permission !== "default") return Notification.permission;
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

async function getActiveRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
    return null;
  }
  try {
    const existing = await navigator.serviceWorker.getRegistration();
    if (!existing) return null;
    if (existing.active) return existing;
    // Registered but still installing: wait briefly for it to activate.
    const ready = await Promise.race([
      navigator.serviceWorker.ready,
      new Promise<null>((resolve) => setTimeout(() => resolve(null), SW_READY_TIMEOUT_MS)),
    ]);
    return ready;
  } catch {
    return null;
  }
}

export async function showLocalNotification(
  title: string,
  body: string,
  options: LocalNotificationOptions = {}
): Promise<boolean> {
  if (getNotificationPermission() !== "granted") return false;

  const { url = "/dashboard", icon = DEFAULT_ICON, ...rest } = options;
  // `renotify` is valid per spec but missing from some TS DOM lib versions.
  const notificationOptions: NotificationOptions & { renotify?: boolean } = {
    body,
    icon,
    badge: DEFAULT_ICON,
    data: { url },
    ...rest,
  };
  // Browsers throw if renotify is set without a tag.
  if (!notificationOptions.tag) delete notificationOptions.renotify;

  const registration = await getActiveRegistration();
  if (registration) {
    try {
      await registration.showNotification(title, notificationOptions);
      return true;
    } catch {
      // fall through to page-level notification
    }
  }

  try {
    const notification = new Notification(title, notificationOptions);
    notification.onclick = () => {
      window.focus();
      if (url && window.location.pathname !== url) window.location.assign(url);
      notification.close();
    };
    return true;
  } catch {
    // e.g. Chrome on Android forbids the constructor without a service worker.
    return false;
  }
}
