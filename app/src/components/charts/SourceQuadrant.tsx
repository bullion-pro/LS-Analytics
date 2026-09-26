import { useId } from "react";
import { CartesianGrid, ReferenceLine, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis } from "recharts";
import { chartColors } from "./chartColors";
import { TooltipCard } from "./ChartTooltip";
import type { SourceQuadrantPoint } from "@/mock/pipeline";

/**
 * Win rate (Y) vs. avg. deal value (X) by lead source, bubble size = deal
 * volume — the two axes a plain value dot-plot (ChannelQualityDots, already
 * used on Customers for "avg value by channel") can't carry together: a
 * channel can bring big deals that rarely close, or small deals that close
 * reliably, and only a quadrant view shows the difference. Two reference
 * lines at the team average split the plane into four quadrants; only the
 * two quadrants worth a glance first (best channels, worst channels) get a
 * label, matching OpportunityMatrix's restraint of only calling out the
 * segments that matter rather than labeling all four.
 */
export function SourceQuadrant({
  points,
  avgWinRatePct,
  avgValueAED,
  valueFormatter,
  height = 340,
}: {
  points: SourceQuadrantPoint[];
  avgWinRatePct: number;
  avgValueAED: number;
  valueFormatter: (v: number) => string;
  height?: number;
}) {
  const filterId = useId();
  const maxCount = Math.max(...points.map((p) => p.count), 1);
  const radiusFor = (count: number) => 5 + Math.sqrt(count / maxCount) * 11;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ScatterChart margin={{ top: 24, right: 24, bottom: 8, left: 8 }}>
        <defs>
          <filter id={`${filterId}-glow`} x="-120%" y="-120%" width="340%" height="340%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id={`${filterId}-shadow`} x="-60%" y="-60%" width="220%" height="220%">
            <feDropShadow dx="0" dy="1.5" stdDeviation="1.5" floodColor={chartColors.ink} floodOpacity="0.16" />
          </filter>
        </defs>

        <CartesianGrid stroke={chartColors.hairline} strokeWidth={1} />

        <XAxis
          type="number"
          dataKey="avgValueAED"
          name="Avg. deal value"
          domain={[0, "dataMax + dataMax * 0.15"]}
          tickFormatter={(v) => valueFormatter(v)}
          tick={{ fontSize: 11, fill: chartColors.inkMuted, fontFamily: "Inter, sans-serif" }}
          axisLine={{ stroke: chartColors.baseline }}
          tickLine={false}
          label={{
            value: "Average deal value  →",
            position: "insideBottom",
            offset: -4,
            fontSize: 10.5,
            fill: chartColors.inkMuted,
            fontFamily: "Inter, sans-serif",
          }}
        />
        <YAxis
          type="number"
          dataKey="winRatePct"
          name="Win rate"
          domain={[0, "dataMax + 10"]}
          tickFormatter={(v) => `${v}%`}
          tick={{ fontSize: 11, fill: chartColors.inkMuted, fontFamily: "Inter, sans-serif" }}
          axisLine={false}
          tickLine={false}
          width={44}
          tickMargin={6}
        />

        <ReferenceLine x={avgValueAED} stroke={chartColors.baseline} strokeWidth={1} strokeDasharray="4 4" />
        <ReferenceLine
          y={avgWinRatePct}
          stroke={chartColors.baseline}
          strokeWidth={1}
          strokeDasharray="4 4"
          label={(props: any) => {
            const { viewBox } = props;
            const x = (viewBox?.x ?? 0) + (viewBox?.width ?? 0) - 4;
            const y = (viewBox?.y ?? 0) - 9;
            return <ChipLabel x={x} y={y} text="BEST CHANNELS" />;
          }}
        />

        <Tooltip
          cursor={{ strokeDasharray: "3 3", stroke: chartColors.baseline }}
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const p = payload[0]?.payload as SourceQuadrantPoint | undefined;
            if (!p) return null;
            return (
              <TooltipCard
                heading={p.label}
                rows={[
                  { key: "win", label: "Win rate", value: `${p.winRatePct}%`, color: chartColors.accent },
                  { key: "value", label: "Avg. deal value", value: valueFormatter(p.avgValueAED), color: chartColors.baseline },
                  { key: "count", label: "Deals", value: String(p.count), color: chartColors.baseline },
                ]}
              />
            );
          }}
        />
        <Scatter
          data={points}
          isAnimationActive
          animationDuration={600}
          animationEasing="ease-out"
          shape={(props: unknown) => {
            const { cx, cy, payload } = props as { cx: number; cy: number; payload: SourceQuadrantPoint };
            const r = radiusFor(payload.count);
            const emphasis = payload.winRatePct >= avgWinRatePct && payload.avgValueAED >= avgValueAED;
            return (
              <g>
                <circle
                  cx={cx}
                  cy={cy}
                  r={r}
                  fill={emphasis ? chartColors.accent : chartColors.seq[400]}
                  fillOpacity={emphasis ? 0.92 : 0.75}
                  stroke={chartColors.surface}
                  strokeWidth={1.5}
                  filter={`url(#${filterId}-${emphasis ? "glow" : "shadow"})`}
                />
                <text
                  x={cx}
                  y={cy - r - 6}
                  textAnchor="middle"
                  fontSize={10.5}
                  fontWeight={emphasis ? 700 : 500}
                  fontFamily="Inter, sans-serif"
                  fill={emphasis ? chartColors.accentDark : chartColors.inkMuted}
                >
                  {payload.label}
                </text>
              </g>
            );
          }}
        />
      </ScatterChart>
    </ResponsiveContainer>
  );
}

function ChipLabel({ x, y, text }: { x: number; y: number; text: string }) {
  const color = chartColors.accentDark;
  const bg = chartColors.accentLight;
  const w = text.length * 5.6 + 14;
  return (
    <g transform={`translate(${x - w}, ${y - 8})`}>
      <rect width={w} height={16} rx={8} fill={bg} />
      <text x={w / 2} y={11} textAnchor="middle" fontSize={9.5} fontWeight={700} fontFamily="Inter, sans-serif" letterSpacing={0.4} fill={color}>
        {text}
      </text>
    </g>
  );
}
