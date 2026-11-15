"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { Timer, Volume2, Vibrate } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import { cn } from "@/lib/utils";
import { DEFAULT_REST_SECONDS, formatDuration } from "@/app/lib/workout-logger";

const PRESETS = [60, 90, 120, 180, 240];

/**
 * Self-contained rest timer preferences section for the profile page.
 * Saves each change immediately.
 */
export function RestTimerSettings({
  defaultRestSeconds,
  restTimerSound,
  restTimerVibrate,
}: {
  defaultRestSeconds?: number;
  restTimerSound?: boolean;
  restTimerVibrate?: boolean;
}) {
  const upsertProfile = useMutation(api.users.upsertProfile);
  const seconds = defaultRestSeconds ?? DEFAULT_REST_SECONDS;
  const sound = restTimerSound ?? true;
  const vibrate = restTimerVibrate ?? true;
  const [custom, setCustom] = useState("");

  const save = async (patch: {
    defaultRestSeconds?: number;
    restTimerSound?: boolean;
    restTimerVibrate?: boolean;
  }) => {
    try {
      await upsertProfile(patch);
    } catch {
      toast.error("Couldn't save rest timer settings");
    }
  };

  return (
    <div className="card">
      <h3 className="font-semibold mb-1 flex items-center gap-2">
        <Timer className="w-5 h-5" />
        Rest Timer
      </h3>
      <p className="text-sm text-muted-foreground mb-4">
        Starts automatically when you log a set. Exercises with their own rest time in the plan
        use that instead.
      </p>

      <label className="block text-sm font-medium mb-2">Default rest</label>
      <div className="flex gap-2 flex-wrap">
        {PRESETS.map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => save({ defaultRestSeconds: preset })}
            className={cn(
              "min-h-11 min-w-14 px-3 rounded-lg font-medium tabular-nums transition-colors",
              seconds === preset
                ? "bg-primary text-primary-foreground"
                : "bg-card hover:bg-card-hover border border-border"
            )}
          >
            {formatDuration(preset * 1000)}
          </button>
        ))}
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const value = Number(custom);
            if (Number.isFinite(value) && value >= 5 && value <= 900) {
              void save({ defaultRestSeconds: Math.round(value) });
              setCustom("");
            } else {
              toast.error("Enter 5–900 seconds");
            }
          }}
        >
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            placeholder={PRESETS.includes(seconds) ? "sec" : String(seconds)}
            aria-label="Custom rest seconds"
            className="input min-h-11 w-20 text-center"
          />
          <button type="submit" className="btn btn-secondary min-h-11" disabled={!custom}>
            Set
          </button>
        </form>
      </div>

      <div className="mt-4 space-y-2">
        <Toggle
          icon={<Volume2 className="w-4 h-4" />}
          label="Sound when rest is over"
          checked={sound}
          onChange={(v) => save({ restTimerSound: v })}
        />
        <Toggle
          icon={<Vibrate className="w-4 h-4" />}
          label="Vibrate when rest is over"
          hint="Supported on most Android browsers"
          checked={vibrate}
          onChange={(v) => save({ restTimerVibrate: v })}
        />
      </div>
    </div>
  );
}

function Toggle({
  icon,
  label,
  hint,
  checked,
  onChange,
}: {
  icon: React.ReactNode;
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="w-full min-h-11 flex items-center gap-3 text-left"
    >
      <span className="text-muted-foreground">{icon}</span>
      <span className="flex-1">
        <span className="block text-sm font-medium">{label}</span>
        {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
      </span>
      <span
        className={cn(
          "relative w-11 h-6 rounded-full transition-colors shrink-0",
          checked ? "bg-primary" : "bg-border"
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform",
            checked && "translate-x-5"
          )}
        />
      </span>
    </button>
  );
}
