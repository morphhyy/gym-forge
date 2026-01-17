"use client";

import { useState, useEffect, useCallback } from "react";
import { X, Plus, Minus, Play, Pause, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

interface RestTimerProps {
  initialSeconds?: number;
  onComplete?: () => void;
  onClose: () => void;
  autoStart?: boolean;
  vibrateEnabled?: boolean;
}

export function RestTimer({
  initialSeconds = 90,
  onComplete,
  onClose,
  autoStart = true,
  vibrateEnabled = true,
}: RestTimerProps) {
  const [seconds, setSeconds] = useState(initialSeconds);
  const [isRunning, setIsRunning] = useState(autoStart);

  // Timer logic
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isRunning && seconds > 0) {
      interval = setInterval(() => {
        setSeconds((prev) => prev - 1);
      }, 1000);
    } else if (seconds === 0 && isRunning) {
      // Timer completed
      setIsRunning(false);

      // Vibrate
      if (vibrateEnabled && navigator.vibrate) {
        navigator.vibrate([200, 100, 200]);
      }

      onComplete?.();
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, seconds, vibrateEnabled, onComplete]);

  const adjustTime = (delta: number) => {
    setSeconds((prev) => Math.max(0, prev + delta));
  };

  const resetTimer = () => {
    setSeconds(initialSeconds);
    setIsRunning(false);
  };

  const toggleTimer = () => {
    setIsRunning((prev) => !prev);
  };

  // Calculate progress for the circular indicator
  const progress = (seconds / initialSeconds) * 100;
  const circumference = 2 * Math.PI * 120; // radius = 120
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  // Format time display
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins}:${remainingSecs.toString().padStart(2, "0")}`;
  };

  // Determine color based on remaining time
  const getTimerColor = () => {
    if (seconds === 0) return "text-primary";
    if (seconds <= 10) return "text-orange-500";
    return "text-primary";
  };

  return (
    <div
      className="fixed inset-0 z-[100] bg-background flex flex-col items-center justify-center p-4"
      style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0 }}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 hover:bg-card rounded-full transition-colors"
      >
        <X className="w-6 h-6 text-muted-foreground" />
      </button>

      {/* Title */}
      <p className="text-muted-foreground text-lg mb-8">Rest Timer</p>

      {/* Circular Timer */}
      <div className="relative w-64 h-64 mb-8">
        <svg
          width="256"
          height="256"
          viewBox="0 0 256 256"
          className="transform -rotate-90"
        >
          {/* Background circle */}
          <circle
            cx="128"
            cy="128"
            r="120"
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            className="text-card"
          />
          {/* Progress circle */}
          <circle
            cx="128"
            cy="128"
            r="120"
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className={cn("transition-all duration-300", getTimerColor())}
          />
        </svg>

        {/* Time display */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn("text-6xl font-bold tabular-nums", getTimerColor())}>
            {formatTime(seconds)}
          </span>
          {seconds === 0 && (
            <span className="text-primary font-medium mt-2 animate-pulse">
              Time&apos;s up!
            </span>
          )}
        </div>
      </div>

      {/* Time adjustment buttons */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => adjustTime(-15)}
          className="flex items-center gap-1 px-4 py-2 bg-card hover:bg-card-hover rounded-lg transition-colors"
        >
          <Minus className="w-4 h-4" />
          <span>15s</span>
        </button>
        <button
          onClick={() => adjustTime(15)}
          className="flex items-center gap-1 px-4 py-2 bg-card hover:bg-card-hover rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>15s</span>
        </button>
      </div>

      {/* Control buttons */}
      <div className="flex items-center gap-4">
        <button
          onClick={resetTimer}
          className="p-4 bg-card hover:bg-card-hover rounded-full transition-colors"
        >
          <RotateCcw className="w-6 h-6" />
        </button>

        <button
          onClick={toggleTimer}
          className={cn(
            "p-6 rounded-full transition-colors",
            isRunning
              ? "bg-orange-500/20 hover:bg-orange-500/30 text-orange-500"
              : "bg-primary/20 hover:bg-primary/30 text-primary"
          )}
        >
          {isRunning ? (
            <Pause className="w-8 h-8" />
          ) : (
            <Play className="w-8 h-8 ml-1" />
          )}
        </button>

        <button
          onClick={onClose}
          className="p-4 bg-card hover:bg-card-hover rounded-full transition-colors"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Skip hint */}
      <p className="text-muted-foreground text-sm mt-8">
        Press anywhere or ESC to skip
      </p>

      {/* Click to skip overlay (excluding buttons) */}
      <div
        className="absolute inset-0 -z-10"
        onClick={onClose}
        onKeyDown={(e) => {
          if (e.key === "Escape") onClose();
        }}
      />
    </div>
  );
}

// Hook to manage rest timer state
export function useRestTimer(defaultRestSeconds: number = 90) {
  const [isOpen, setIsOpen] = useState(false);
  const [restSeconds, setRestSeconds] = useState(defaultRestSeconds);

  const openTimer = useCallback((seconds?: number) => {
    if (seconds) setRestSeconds(seconds);
    setIsOpen(true);
  }, []);

  const closeTimer = useCallback(() => {
    setIsOpen(false);
  }, []);

  const RestTimerComponent = useCallback(
    () =>
      isOpen ? (
        <RestTimer
          initialSeconds={restSeconds}
          onClose={closeTimer}
          autoStart
        />
      ) : null,
    [isOpen, restSeconds, closeTimer]
  );

  return {
    isOpen,
    openTimer,
    closeTimer,
    RestTimer: RestTimerComponent,
  };
}
