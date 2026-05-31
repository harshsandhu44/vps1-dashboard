"use client";

import type { MetricPoint } from "@/lib/metrics";
import { useEffect, useRef, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type MetricChartProps = {
  data: MetricPoint[];
  kind: "percent" | "rate" | "load";
  series: {
    key: keyof MetricPoint;
    label: string;
    color: string;
  }[];
};

export function MetricChart({ data, kind, series }: MetricChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const element = containerRef.current;
    if (!element) {
      return;
    }

    const updateSize = () => {
      setSize({
        width: element.clientWidth,
        height: element.clientHeight,
      });
    };
    const observer = new ResizeObserver(updateSize);

    updateSize();
    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  if (data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
        No samples yet
      </div>
    );
  }

  return (
    <div ref={containerRef} className="h-48 w-full sm:h-56">
      {size.width === 0 || size.height === 0 ? (
        <div className="h-full w-full rounded-lg bg-muted/20" />
      ) : (
        <AreaChart
          data={data}
          height={size.height}
          margin={{ left: 8, right: 8, top: 8, bottom: 0 }}
          width={size.width}
        >
          <defs>
            {series.map((item) => (
              <linearGradient
                key={item.key}
                id={`fill-${item.key}`}
                x1="0"
                x2="0"
                y1="0"
                y2="1"
              >
                <stop offset="5%" stopColor={item.color} stopOpacity={0.24} />
                <stop offset="95%" stopColor={item.color} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid
            stroke="var(--border)"
            strokeDasharray="3 3"
            vertical={false}
          />
          <XAxis
            axisLine={false}
            dataKey="timestamp"
            minTickGap={24}
            tickFormatter={formatTick}
            tickLine={false}
            tickMargin={8}
            tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
          />
          <YAxis
            axisLine={false}
            domain={kind === "percent" ? [0, 100] : undefined}
            tickFormatter={(value) => formatValue(Number(value), kind)}
            tickLine={false}
            tickMargin={8}
            tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
            width={56}
          />
          <Tooltip
            contentStyle={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              color: "var(--card-foreground)",
              fontSize: 12,
            }}
            formatter={(value, name) => [
              formatValue(Number(value), kind),
              series.find((item) => item.key === name)?.label ?? name,
            ]}
            labelFormatter={(value) =>
              new Date(String(value)).toLocaleTimeString()
            }
          />
          {series.map((item) => (
            <Area
              key={item.key}
              dataKey={item.key}
              fill={`url(#fill-${item.key})`}
              isAnimationActive={false}
              name={item.key}
              stroke={item.color}
              strokeWidth={2}
              type="monotone"
            />
          ))}
        </AreaChart>
      )}
    </div>
  );
}

function formatTick(value: string) {
  return new Date(value).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatValue(value: number, kind: MetricChartProps["kind"]) {
  if (kind === "percent") {
    return `${Math.round(value)}%`;
  }

  if (kind === "rate") {
    return `${formatCompactBytes(value)}/s`;
  }

  return value.toFixed(2);
}

function formatCompactBytes(bytes: number) {
  if (bytes < 1024) {
    return `${Math.round(bytes)} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }

  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
