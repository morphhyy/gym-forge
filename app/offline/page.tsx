import type { Metadata } from "next";
import { WifiOff } from "lucide-react";
import { RetryButton } from "./retry-button";

export const metadata: Metadata = {
  title: "Offline - GymForge",
};

// Precached by public/sw.js and served for navigations that fail offline.
// Keep it static and free of data fetching.
export const dynamic = "force-static";

export default function OfflinePage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="max-w-sm text-center space-y-4">
        <div className="mx-auto w-14 h-14 rounded-full bg-primary-muted text-primary flex items-center justify-center">
          <WifiOff className="w-7 h-7" />
        </div>
        <h1 className="text-2xl font-bold">You&apos;re offline</h1>
        <p className="text-muted-foreground">
          This page hasn&apos;t been saved for offline use yet. Pages you&apos;ve
          opened before still work offline — reconnect to load the rest.
        </p>
        <RetryButton />
      </div>
    </main>
  );
}
