"use client";

import { useState } from "react";
import { Check, ChevronDown, Snowflake, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

export type Routine = "warmup" | "cooldown";

const META: Record<Routine, { title: string; duration: string; icon: typeof Sun }> = {
  warmup: { title: "Warm-up", duration: "8–10 min", icon: Sun },
  cooldown: { title: "Cool-down", duration: "5–7 min", icon: Snowflake },
};

/**
 * A tickable warm-up / cool-down row for the workout logger. The tick target
 * is the whole left side (≥44px); the chevron toggles the suggested routine.
 */
export function RoutineCheck({
  routine,
  steps,
  done,
  disabled,
  onToggle,
}: {
  routine: Routine;
  /** The day's routine (from the plan, or suggested for the day). */
  steps: string[];
  done: boolean;
  disabled?: boolean;
  onToggle: (done: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const { title, duration, icon: Icon } = META[routine];

  return (
    <div className={cn("card py-3 transition-colors", done && "border-primary/40")}>
      <div className="flex items-center gap-3">
        <button
          type="button"
          role="checkbox"
          aria-checked={done}
          disabled={disabled}
          onClick={() => onToggle(!done)}
          className="flex-1 min-h-11 flex items-center gap-3 text-left disabled:cursor-default"
        >
          <span
            className={cn(
              "w-7 h-7 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors",
              done ? "bg-primary border-primary text-primary-foreground" : "border-border"
            )}
            aria-hidden
          >
            {done && <Check className="w-4 h-4" strokeWidth={3} />}
          </span>
          <span className="flex-1">
            <span className={cn("block font-medium", done && "text-muted-foreground line-through")}>
              {title}
            </span>
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Icon className="w-3.5 h-3.5" aria-hidden />
              {duration}
            </span>
          </span>
        </button>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-label={`${open ? "Hide" : "Show"} ${title.toLowerCase()} routine`}
          className="h-11 w-11 -mr-2 rounded-lg inline-flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-card-hover"
        >
          <ChevronDown className={cn("w-5 h-5 transition-transform", open && "rotate-180")} />
        </button>
      </div>
      {open && steps.length > 0 && (
        <ul className="mt-2 ml-10 space-y-1 text-sm text-muted-foreground list-disc pl-4">
          {steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
