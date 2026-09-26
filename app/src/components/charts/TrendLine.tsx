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
import { TooltipCard } from "./ChartTooltip";
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

export function TrendLine({
  data,
  currentLabel,
  priorLabel,
  annotations = [],
  valueFormatter,
  height = 260,
  showLegend = true,
  baseline,
}: {
  data: TrendPoint[];
  currentLabel: string;
  priorLabel?: string;
  annotations?: TrendAnnotation[];
  valueFormatter: (v: number) => string;
  height?: number;
  showLegend?: boolean;
  baseline?: { value: number; label: string };
}) {
  const hasPrior = data.some((d) => d.prior !== undefined);

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
            <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={chartColors.accent} stopOpacity={0.16} />
              <stop offset="100%" stopColor={chartColors.accent} stopOpacity={0} />
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
          <XAxis
            dataKey="label"
            axisLine={{ stroke: chartColors.baseline }}
            tickLine={false}
            tick={{ fontSize: 11, fill: chartColors.inkMuted, fontFamily: "Inter, sans-serif" }}
            interval="preserveStartEnd"
            dy={8}
          />
          <YAxis
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
              const rows = payload
                .filter((p) => p.value !== undefined && p.value !== null)
                .map((p) => ({
                  key: String(p.dataKey),
                  label: p.dataKey === "current" ? currentLabel : (priorLabel ?? "Prior period"),
                  value: valueFormatter(Number(p.value)),
                  color: p.dataKey === "current" ? chartColors.accent : chartColors.baseline,
                }))
                .sort((a) => (a.key === "current" ? -1 : 1));
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
          <Area type="monotone" dataKey="current" stroke="none" fill="url(#trendFill)" />
          <Line
            type="monotone"
            dataKey="current"
            stroke={chartColors.accent}
            strokeWidth={2.25}
            dot={false}
            activeDot={{ r: 4.5, fill: chartColors.accent, stroke: chartColors.surface, strokeWidth: 2 }}
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
