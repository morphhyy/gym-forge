"use client";

import { useEffect, useState } from "react";
import { Trophy, X, Flame, Target, Zap, Crown, Star } from "lucide-react";
import { cn } from "@/lib/utils";

// Achievement configurations
const ACHIEVEMENT_CONFIG: Record<
  string,
  { label: string; description: string; icon: React.ElementType; color: string }
> = {
  streak_3: {
    label: "3-Day Streak",
    description: "Completed 3 days in a row!",
    icon: Flame,
    color: "text-orange-500",
  },
  streak_7: {
    label: "Week Warrior",
    description: "A full week of workouts!",
    icon: Target,
    color: "text-blue-500",
  },
  streak_14: {
    label: "Two Week Titan",
    description: "14 days of dedication!",
    icon: Zap,
    color: "text-yellow-500",
  },
  streak_30: {
    label: "Monthly Master",
    description: "A whole month strong!",
    icon: Crown,
    color: "text-purple-500",
  },
  streak_60: {
    label: "Iron Will",
    description: "60 days of pure commitment!",
    icon: Star,
    color: "text-pink-500",
  },
  streak_100: {
    label: "Century Club",
    description: "100 days! Legendary!",
    icon: Trophy,
    color: "text-amber-500",
  },
  first_pr: {
    label: "First PR",
    description: "Set your first personal record!",
    icon: Trophy,
    color: "text-primary",
  },
};

interface AchievementToastProps {
  achievementType: string;
  onClose: () => void;
}

export function AchievementToast({
  achievementType,
  onClose,
}: AchievementToastProps) {
  const [isVisible, setIsVisible] = useState(false);
  const config = ACHIEVEMENT_CONFIG[achievementType] ?? {
    label: achievementType,
    description: "Achievement unlocked!",
    icon: Trophy,
    color: "text-primary",
  };

  const Icon = config.icon;

  useEffect(() => {
    // Animate in
    const showTimer = setTimeout(() => setIsVisible(true), 50);
    // Auto close after 5 seconds
    const closeTimer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300);
    }, 5000);

    return () => {
      clearTimeout(showTimer);
      clearTimeout(closeTimer);
    };
  }, [onClose]);

  return (
    <div
      className={cn(
        "fixed top-4 left-1/2 -translate-x-1/2 z-50 transition-all duration-300",
        isVisible
          ? "opacity-100 translate-y-0"
          : "opacity-0 -translate-y-4"
      )}
    >
      <div className="bg-card border border-border rounded-xl shadow-lg p-4 flex items-center gap-4 min-w-[280px] max-w-[90vw]">
        {/* Icon with glow effect */}
        <div
          className={cn(
            "w-12 h-12 rounded-full flex items-center justify-center",
            "bg-gradient-to-br from-primary/20 to-primary/5",
            "ring-2 ring-primary/20"
          )}
        >
          <Icon className={cn("w-6 h-6", config.color)} />
        </div>

        {/* Content */}
        <div className="flex-1">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">
            Achievement Unlocked!
          </p>
          <p className="font-semibold">{config.label}</p>
          <p className="text-sm text-muted-foreground">{config.description}</p>
        </div>

        {/* Close button */}
        <button
          onClick={() => {
            setIsVisible(false);
            setTimeout(onClose, 300);
          }}
          className="p-1 hover:bg-muted rounded-full transition-colors"
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {/* Confetti effect (simple CSS-based) */}
      {isVisible && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[...Array(12)].map((_, i) => (
            <div
              key={i}
              className={cn(
                "absolute w-2 h-2 rounded-full animate-confetti",
                i % 3 === 0 && "bg-primary",
                i % 3 === 1 && "bg-orange-500",
                i % 3 === 2 && "bg-yellow-500"
              )}
              style={{
                left: `${10 + (i * 7)}%`,
                animationDelay: `${i * 50}ms`,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Hook to manage achievement toasts
export function useAchievementToasts() {
  const [achievements, setAchievements] = useState<string[]>([]);

  const showAchievement = (type: string) => {
    setAchievements((prev) => [...prev, type]);
  };

  const showAchievements = (types: string[]) => {
    if (types.length > 0) {
      setAchievements((prev) => [...prev, ...types]);
    }
  };

  const dismissAchievement = (index: number) => {
    setAchievements((prev) => prev.filter((_, i) => i !== index));
  };

  const AchievementToasts = () => (
    <>
      {achievements.map((type, index) => (
        <AchievementToast
          key={`${type}-${index}`}
          achievementType={type}
          onClose={() => dismissAchievement(index)}
        />
      ))}
    </>
  );

  return { showAchievement, showAchievements, AchievementToasts };
}
