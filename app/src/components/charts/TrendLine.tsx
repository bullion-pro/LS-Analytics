import { useId, useMemo } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { chartColors } from "./chartColors";
import { TooltipCard, type TooltipRow } from "./ChartTooltip";
import { ChartLegend } from "./ChartLegend";

export interface TrendPoint {
  key: string;
  label: string;
  current: number;
  prior?: number;
}

export interface TrendAnnotation {
  key: string; // matches TrendPoint.key
  label: string;
}

export interface TrendLineProps {
  data: TrendPoint[];
  currentLabel: string;
  priorLabel?: string;
  annotations?: TrendAnnotation[];
  valueFormatter: (v: number) => string;
  height?: number;
  showLegend?: boolean;
  baseline?: { value: number; label: string };
  autoDomain?: boolean;
}

export function TrendLine({
  data,
  currentLabel,
  priorLabel,
  annotations = [],
  valueFormatter,
  height = 260,
  showLegend = true,
  baseline,
  autoDomain = false,
}: TrendLineProps) {
  const hasPrior = data.some((d) => d.prior !== undefined);
  const uniqueId = useId().replace(/:/g, "_");
  const gradientId = `trendFill_${uniqueId}`;

  // Smart padded Y-axis domain to eliminate dead zero-baseline space
  const yDomain = useMemo(() => {
    if (!autoDomain) return undefined;
    const values = data.flatMap((d) =>
      [d.current, d.prior].filter((v): v is number => v !== undefined && v !== null && !isNaN(v))
    );
    if (!values.length) return undefined;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const step = range > 50000 ? 20000 : range > 5000 ? 2000 : range > 50 ? 20 : 1;
    const floor = Math.max(0, Math.floor((min - range * 0.22) / step) * step);
    const ceil = Math.ceil((max + range * 0.18) / step) * step;
    return [floor, ceil] as [number, number];
  }, [autoDomain, data]);

  // Calendar year detection across keys (e.g. "2025-10" -> 2025 vs "2026-01" -> 2026)
  const yearMeta = useMemo(() => {
    const years = data.map((d) => {
      const match = d.key.match(/^(\d{4})/);
      return match ? match[1] : null;
    });
    const turnoverIdx = years.findIndex((y, i) => i > 0 && y !== null && years[i - 1] !== null && y !== years[i - 1]);
    return { years, turnoverIdx, hasTurnover: turnoverIdx !== -1 };
  }, [data]);

  return (
    <div>
      {showLegend && hasPrior && (
        <div className="mb-3">
          <ChartLegend
            items={[
              { key: "current", label: currentLabel, color: chartColors.accent },
              { key: "prior", label: priorLabel ?? "Prior period", color: chartColors.baseline },
            ]}
          />
        </div>
      )}
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={data} margin={{ top: annotations.length ? 26 : 10, right: 12, bottom: 0, left: 8 }}>
          <defs>
            {/* Luminous Champagne Silk Glow */}
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={chartColors.accent} stopOpacity={0.28} />
              <stop offset="60%" stopColor={chartColors.accent} stopOpacity={0.10} />
              <stop offset="100%" stopColor={chartColors.accent} stopOpacity={0.01} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke={chartColors.hairline} strokeWidth={1} />
          {baseline && (
            <ReferenceLine
              y={baseline.value}
              stroke={chartColors.baseline}
              strokeDasharray="3 3"
              strokeWidth={1}
              label={{
                value: baseline.label,
                position: "insideTopLeft",
                fontSize: 10.5,
                fontFamily: "Inter, sans-serif",
                fill: chartColors.inkMuted,
              }}
            />
          )}
          {yearMeta.hasTurnover && (
            <ReferenceLine
              x={data[yearMeta.turnoverIdx].label}
              stroke={chartColors.accent}
              strokeWidth={1}
              strokeDasharray="3 3"
              strokeOpacity={0.4}
            />
          )}
          <XAxis
            dataKey="label"
            axisLine={{ stroke: chartColors.baseline }}
            tickLine={false}
            tick={({ x, y, payload, index }) => {
              let suffix = "";
              if (yearMeta.hasTurnover) {
                const yr = yearMeta.years[index];
                const prevYr = index > 0 ? yearMeta.years[index - 1] : null;
                if (index === 0 && yr) {
                  suffix = ` '${yr.slice(2)}`;
                } else if (yr && prevYr && yr !== prevYr) {
                  suffix = ` '${yr.slice(2)}`;
                }
              }
              const isHighlight = suffix !== "";

              return (
                <g transform={`translate(${x},${Number(y) + 8})`}>
                  <text
                    x={0}
                    y={0}
                    textAnchor="middle"
                    fontSize={11}
                    fontWeight={isHighlight ? 700 : 500}
                    fill={isHighlight ? chartColors.ink : chartColors.inkMuted}
                    fontFamily="Inter, sans-serif"
                  >
                    {payload.value}
                    {suffix && (
                      <tspan fontSize={9.5} fontWeight={700} fill={chartColors.accentDark}>
                        {suffix}
                      </tspan>
                    )}
                  </text>
                </g>
              );
            }}
            interval="preserveStartEnd"
            dy={8}
          />
          <YAxis
            domain={yDomain ?? ["auto", "auto"]}
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: chartColors.inkMuted, fontFamily: "Inter, sans-serif" }}
            tickFormatter={(v) => valueFormatter(v)}
            width={78}
            tickMargin={6}
          />
          <Tooltip
            cursor={{ stroke: chartColors.baseline, strokeWidth: 1 }}
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const rows: TooltipRow[] = payload
                .filter((p) => p.value !== undefined && p.value !== null)
                .map((p) => ({
                  key: String(p.dataKey),
                  label: p.dataKey === "current" ? currentLabel : (priorLabel ?? "Prior period"),
                  value: valueFormatter(Number(p.value)),
                  color: p.dataKey === "current" ? chartColors.accent : chartColors.baseline,
                }))
                .sort((a) => (a.key === "current" ? -1 : 1));

              const cur = payload.find((p) => p.dataKey === "current");
              const pri = payload.find((p) => p.dataKey === "prior");
              if (cur?.value !== undefined && pri?.value !== undefined && Number(pri.value) > 0) {
                const pct = ((Number(cur.value) - Number(pri.value)) / Number(pri.value)) * 100;
                rows.push({
                  key: "yoy-delta",
                  label: "YoY Growth",
                  value: `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`,
                  color: pct >= 0 ? "#168544" : "#d03b3b",
                  shape: "dot",
                });
              }

              return <TooltipCard heading={String(label)} rows={rows} />;
            }}
          />
          {hasPrior && (
            <Line
              type="monotone"
              dataKey="prior"
              stroke={chartColors.baseline}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: chartColors.baseline, stroke: chartColors.surface, strokeWidth: 2 }}
            />
          )}
          <Area
            type="monotone"
            dataKey="current"
            stroke="none"
            fill={`url(#${gradientId})`}
            baseValue={yDomain ? yDomain[0] : "dataMin"}
          />
          <Line
            type="monotone"
            dataKey="current"
            stroke={chartColors.accent}
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 5, fill: chartColors.accent, stroke: chartColors.surface, strokeWidth: 2 }}
          />
          {annotations.map((a) => {
            const point = data.find((d) => d.key === a.key);
            if (!point) return null;
            return (
              <ReferenceDot
                key={a.key}
                x={point.label}
                y={point.current}
                r={0}
                label={(props: { viewBox?: { x?: number; y?: number } }) => {
                  const x = props.viewBox?.x ?? 0;
                  const y = props.viewBox?.y ?? 0;
                  return (
                    <g>
                      <circle cx={x} cy={y} r={3.5} fill={chartColors.accent} stroke={chartColors.surface} strokeWidth={2} />
                      <text
                        x={x}
                        y={y - 12}
                        textAnchor="middle"
                        fontSize={10.5}
                        fontFamily="Inter, sans-serif"
                        fontWeight={600}
                        fill={chartColors.accentDark}
                      >
                        {a.label}
                      </text>
                    </g>
                  );
                }}
              />
            );
          })}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
