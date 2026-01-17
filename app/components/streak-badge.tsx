"use client";

import { Flame } from "lucide-react";
import { cn } from "@/lib/utils";

interface StreakBadgeProps {
  streak: number;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
}

export function StreakBadge({
  streak,
  size = "md",
  showLabel = false,
  className,
}: StreakBadgeProps) {
  const sizeClasses = {
    sm: "h-6 px-2 text-xs gap-1",
    md: "h-8 px-3 text-sm gap-1.5",
    lg: "h-10 px-4 text-base gap-2",
  };

  const iconSizes = {
    sm: "w-3 h-3",
    md: "w-4 h-4",
    lg: "w-5 h-5",
  };

  const isActive = streak > 0;

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full font-semibold transition-all",
        isActive
          ? "bg-orange-500/15 text-orange-500"
          : "bg-muted text-muted-foreground",
        sizeClasses[size],
        className
      )}
    >
      <Flame
        className={cn(
          iconSizes[size],
          isActive && "animate-pulse"
        )}
      />
      <span>{streak}</span>
      {showLabel && (
        <span className="font-normal opacity-80">
          {streak === 1 ? "day" : "days"}
        </span>
      )}
    </div>
  );
}
