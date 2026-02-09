"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface DaySummary {
  date: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface CalorieChartProps {
  data: DaySummary[];
  calorieGoal?: number;
}

function CalorieTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
        <p className="font-medium mb-1">{label}</p>
        <p className="text-sm text-emerald-500">
          {payload[0].value} kcal
        </p>
      </div>
    );
  }
  return null;
}

export function CalorieChart({ data, calorieGoal }: CalorieChartProps) {
  if (data.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center">
        <p className="text-muted-foreground text-sm">
          No data yet. Start logging food!
        </p>
      </div>
    );
  }

  return (
    <div className="h-48">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="calorieGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#2a2a35"
            vertical={false}
          />
          <XAxis
            dataKey="date"
            stroke="#71717a"
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            stroke="#71717a"
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip content={<CalorieTooltip />} />
          {calorieGoal && (
            <ReferenceLine
              y={calorieGoal}
              stroke="#71717a"
              strokeDasharray="6 4"
              label={{
                value: `Goal: ${calorieGoal}`,
                position: "insideTopRight",
                fill: "#71717a",
                fontSize: 11,
              }}
            />
          )}
          <Area
            type="monotone"
            dataKey="calories"
            stroke="#10b981"
            strokeWidth={2}
            fill="url(#calorieGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

interface MacroChartProps {
  data: DaySummary[];
}

function MacroTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number; dataKey: string; color: string }>;
  label?: string;
}) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
        <p className="font-medium mb-1">{label}</p>
        {payload.map((p) => (
          <p key={p.dataKey} className="text-sm" style={{ color: p.color }}>
            {p.dataKey}: {p.value}g
          </p>
        ))}
      </div>
    );
  }
  return null;
}

export function MacroChart({ data }: MacroChartProps) {
  if (data.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center">
        <p className="text-muted-foreground text-sm">
          No data yet. Start logging food!
        </p>
      </div>
    );
  }

  return (
    <div className="h-48">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#2a2a35"
            vertical={false}
          />
          <XAxis
            dataKey="date"
            stroke="#71717a"
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            stroke="#71717a"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `${value}g`}
          />
          <Tooltip content={<MacroTooltip />} />
          <Line
            type="monotone"
            dataKey="protein"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="carbs"
            stroke="#f59e0b"
            strokeWidth={2}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="fat"
            stroke="#a855f7"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
