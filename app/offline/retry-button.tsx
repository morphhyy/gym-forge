"use client";

import { Button } from "@/components/ui/button";

export function RetryButton() {
  return <Button onClick={() => window.location.reload()}>Try again</Button>;
}
