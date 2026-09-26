import { useId } from "react";
import { Area, Bar, CartesianGrid, ComposedChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { chartColors } from "./chartColors";
import { TooltipCard } from "./ChartTooltip";
import { ChartLegend } from "./ChartLegend";

export interface PurchaseHistoryDatum {
  key: string;
  label: string;
  newRevenueAED: number;
  returningRevenueAED: number;
  totalRevenueAED: number;
  cumulativeRevenueAED: number;
  transactionCount: number;
}

/**
 * Monthly purchase revenue (bars, own axis) with the compounding lifetime total overlaid (area,
 * secondary axis) — a flow-and-level pair, the full purchase history rather than just the
 * trailing-12 window other cards on this page use. Deliberately not a new-vs-returning stacked
 * split: see purchaseHistoryTrend's own comment on why that would render as an invisible sliver
 * for this business. New/returning breakdown still lives in the tooltip and the page's insight
 * callout — just not as a chart encoding that can't actually show it.
 */
export function PurchaseHistoryBars({
  data,
  valueFormatter,
  height = 280,
}: {
  data: PurchaseHistoryDatum[];
  valueFormatter: (v: number) => string;
  height?: number;
}) {
  const gid = useId();
  return (
    <div>
      <div className="mb-3">
        <ChartLegend
          items={[
            { key: "monthly", label: "Monthly revenue", color: chartColors.accent, shape: "rect" },
            { key: "cumulative", label: "Cumulative revenue", color: chartColors.seq[500] },
          ]}
        />
      </div>
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={data} margin={{ top: 10, right: 12, bottom: 0, left: 8 }}>
          <defs>
            <linearGradient id={`${gid}-cumulative`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={chartColors.seq[500]} stopOpacity={0.16} />
              <stop offset="100%" stopColor={chartColors.seq[500]} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke={chartColors.hairline} strokeWidth={1} />
          <XAxis
            dataKey="label"
            axisLine={{ stroke: chartColors.baseline }}
            tickLine={false}
            tick={{ fontSize: 11, fill: chartColors.inkMuted, fontFamily: "Inter, sans-serif" }}
            interval="preserveStartEnd"
            dy={8}
          />
          <YAxis
            yAxisId="monthly"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: chartColors.inkMuted, fontFamily: "Inter, sans-serif" }}
            tickFormatter={(v) => valueFormatter(v)}
            width={78}
            tickMargin={6}
          />
          <YAxis yAxisId="cumulative" orientation="right" hide domain={[0, (max: number) => max * 1.05]} />
          <Tooltip
            cursor={{ fill: chartColors.surfaceSunken }}
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const point = payload[0]?.payload as PurchaseHistoryDatum | undefined;
              if (!point) return null;
              return (
                <TooltipCard
                  heading={String(label)}
                  rows={[
                    { key: "monthly", label: "Monthly revenue", value: valueFormatter(point.totalRevenueAED), color: chartColors.accent, shape: "rect" },
                    { key: "cumulative", label: "Cumulative to date", value: valueFormatter(point.cumulativeRevenueAED), color: chartColors.seq[500] },
                    { key: "new", label: "From new customers", value: valueFormatter(point.newRevenueAED), color: chartColors.baseline },
                    { key: "txns", label: "Transactions", value: String(point.transactionCount), color: chartColors.baseline },
                  ]}
                />
              );
            }}
          />
          <Area
            yAxisId="cumulative"
            type="monotone"
            dataKey="cumulativeRevenueAED"
            stroke={chartColors.seq[500]}
            strokeWidth={2.25}
            fill={`url(#${gid}-cumulative)`}
            dot={false}
            activeDot={{ r: 4.5, fill: chartColors.seq[500], stroke: chartColors.surface, strokeWidth: 2 }}
          />
          <Bar yAxisId="monthly" dataKey="totalRevenueAED" fill={chartColors.accent} fillOpacity={0.82} radius={[3, 3, 0, 0]} maxBarSize={20} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
