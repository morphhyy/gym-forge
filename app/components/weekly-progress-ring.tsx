"use client";

import { cn } from "@/lib/utils";

interface WeeklyProgressRingProps {
  completed: number;
  goal: number;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
}

export function WeeklyProgressRing({
  completed,
  goal,
  size = "md",
  showLabel = true,
  className,
}: WeeklyProgressRingProps) {
  const percentage = Math.min((completed / goal) * 100, 100);
  const isComplete = completed >= goal;

  const sizes = {
    sm: { ring: 40, stroke: 4, text: "text-xs" },
    md: { ring: 56, stroke: 5, text: "text-sm" },
    lg: { ring: 72, stroke: 6, text: "text-base" },
  };

  const { ring, stroke, text } = sizes[size];
  const radius = (ring - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="relative" style={{ width: ring, height: ring }}>
        <svg
          width={ring}
          height={ring}
          viewBox={`0 0 ${ring} ${ring}`}
          className="transform -rotate-90"
        >
          {/* Background circle */}
          <circle
            cx={ring / 2}
            cy={ring / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={stroke}
            className="text-muted opacity-20"
          />
          {/* Progress circle */}
          <circle
            cx={ring / 2}
            cy={ring / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={stroke}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className={cn(
              "transition-all duration-500",
              isComplete ? "text-primary" : "text-primary/70"
            )}
          />
        </svg>
        {/* Center text */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={cn("font-bold", text)}>
            {completed}/{goal}
          </span>
        </div>
      </div>
      {showLabel && (
        <div className="flex flex-col">
          <span className={cn("font-medium", text)}>
            {isComplete ? "Goal reached!" : "Weekly Goal"}
          </span>
          <span className="text-xs text-muted-foreground">
            {goal - completed > 0
              ? `${goal - completed} more to go`
              : "Great work!"}
          </span>
        </div>
      )}
    </div>
  );
}
