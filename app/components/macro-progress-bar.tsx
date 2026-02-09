"use client";

interface MacroProgressBarProps {
  label: string;
  current: number;
  target: number;
  color?: string;
  unit?: string;
}

export function MacroProgressBar({
  label,
  current,
  target,
  color = "bg-foreground/50",
  unit = "g",
}: MacroProgressBarProps) {
  const percentage = target > 0 ? Math.min((current / target) * 100, 100) : 0;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">
          {Math.round(current)} / {target} {unit}
        </span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
