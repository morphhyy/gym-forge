"use client";

import { useEffect, useState } from "react";
import { Trophy, X, TrendingUp, Zap, Target } from "lucide-react";
import { cn } from "@/lib/utils";

interface PRInfo {
  type: "weight" | "volume" | "e1rm";
  value: number;
  previousValue?: number;
  exerciseName?: string;
}

interface PRCelebrationProps {
  prs: PRInfo[];
  onClose: () => void;
}

const PR_LABELS: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  weight: { label: "Weight PR", icon: Trophy, color: "text-yellow-500" },
  e1rm: { label: "Est. 1RM PR", icon: TrendingUp, color: "text-blue-500" },
  volume: { label: "Volume PR", icon: Zap, color: "text-purple-500" },
};

export function PRCelebration({ prs, onClose }: PRCelebrationProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Animate in
    const showTimer = setTimeout(() => setIsVisible(true), 50);
    // Auto close after 4 seconds
    const closeTimer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300);
    }, 4000);

    return () => {
      clearTimeout(showTimer);
      clearTimeout(closeTimer);
    };
  }, [onClose]);

  // Find the most significant PR (weight > e1rm > volume)
  const primaryPR = prs.find((pr) => pr.type === "weight") ||
    prs.find((pr) => pr.type === "e1rm") ||
    prs[0];

  if (!primaryPR) return null;

  const config = PR_LABELS[primaryPR.type];
  const Icon = config.icon;

  const improvement = primaryPR.previousValue
    ? ((primaryPR.value - primaryPR.previousValue) / primaryPR.previousValue * 100).toFixed(1)
    : null;

  return (
    <div
      className={cn(
        "fixed inset-0 z-[100] flex items-center justify-center p-4 transition-all duration-300",
        isVisible ? "opacity-100" : "opacity-0 pointer-events-none"
      )}
      style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0 }}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-background/90 backdrop-blur-md"
        onClick={() => {
          setIsVisible(false);
          setTimeout(onClose, 300);
        }}
      />

      {/* Content */}
      <div
        className={cn(
          "relative bg-card border border-border rounded-2xl p-8 max-w-sm w-full text-center transition-all duration-300",
          isVisible ? "scale-100 translate-y-0" : "scale-95 translate-y-4"
        )}
      >
        {/* Close button */}
        <button
          onClick={() => {
            setIsVisible(false);
            setTimeout(onClose, 300);
          }}
          className="absolute top-4 right-4 p-1 hover:bg-muted rounded-full transition-colors"
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </button>

        {/* Trophy icon with glow */}
        <div className="relative w-20 h-20 mx-auto mb-4">
          <div
            className={cn(
              "absolute inset-0 rounded-full blur-xl opacity-50",
              primaryPR.type === "weight" && "bg-yellow-500",
              primaryPR.type === "e1rm" && "bg-blue-500",
              primaryPR.type === "volume" && "bg-purple-500"
            )}
          />
          <div
            className={cn(
              "relative w-full h-full rounded-full flex items-center justify-center",
              "bg-gradient-to-br",
              primaryPR.type === "weight" && "from-yellow-500/20 to-yellow-500/5",
              primaryPR.type === "e1rm" && "from-blue-500/20 to-blue-500/5",
              primaryPR.type === "volume" && "from-purple-500/20 to-purple-500/5"
            )}
          >
            <Icon className={cn("w-10 h-10", config.color)} />
          </div>
        </div>

        {/* Title */}
        <p className="text-sm text-muted-foreground uppercase tracking-wide mb-1">
          New Personal Record!
        </p>
        <h2 className="text-2xl font-bold mb-2">{config.label}</h2>

        {/* Exercise name */}
        {primaryPR.exerciseName && (
          <p className="text-muted-foreground mb-4">{primaryPR.exerciseName}</p>
        )}

        {/* Value display */}
        <div className="flex items-center justify-center gap-4 mb-4">
          {primaryPR.previousValue && (
            <>
              <span className="text-muted-foreground line-through">
                {primaryPR.previousValue}
              </span>
              <span className="text-muted-foreground">→</span>
            </>
          )}
          <span className={cn("text-4xl font-bold", config.color)}>
            {primaryPR.value}
          </span>
        </div>

        {/* Improvement percentage */}
        {improvement && (
          <div className="inline-flex items-center gap-1 px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium">
            <TrendingUp className="w-4 h-4" />
            +{improvement}% improvement
          </div>
        )}

        {/* Additional PRs */}
        {prs.length > 1 && (
          <div className="mt-4 pt-4 border-t border-border">
            <p className="text-xs text-muted-foreground mb-2">Also achieved:</p>
            <div className="flex justify-center gap-2">
              {prs
                .filter((pr) => pr !== primaryPR)
                .map((pr) => {
                  const prConfig = PR_LABELS[pr.type];
                  const PrIcon = prConfig.icon;
                  return (
                    <div
                      key={pr.type}
                      className="flex items-center gap-1 px-2 py-1 bg-muted rounded-md text-xs"
                    >
                      <PrIcon className={cn("w-3 h-3", prConfig.color)} />
                      <span>{prConfig.label}</span>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* Confetti effect */}
        {isVisible && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl">
            {[...Array(20)].map((_, i) => (
              <div
                key={i}
                className={cn(
                  "absolute w-2 h-2 rounded-full animate-confetti",
                  i % 4 === 0 && "bg-yellow-500",
                  i % 4 === 1 && "bg-blue-500",
                  i % 4 === 2 && "bg-purple-500",
                  i % 4 === 3 && "bg-primary"
                )}
                style={{
                  left: `${5 + (i * 5)}%`,
                  animationDelay: `${i * 30}ms`,
                  animationDuration: "1.2s",
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Hook to manage PR celebrations
export function usePRCelebration() {
  const [prData, setPrData] = useState<PRInfo[] | null>(null);

  const showPRCelebration = (prs: PRInfo[]) => {
    if (prs.length > 0) {
      setPrData(prs);
    }
  };

  const closePRCelebration = () => {
    setPrData(null);
  };

  const PRCelebrationComponent = () =>
    prData ? <PRCelebration prs={prData} onClose={closePRCelebration} /> : null;

  return {
    showPRCelebration,
    PRCelebration: PRCelebrationComponent,
  };
}
