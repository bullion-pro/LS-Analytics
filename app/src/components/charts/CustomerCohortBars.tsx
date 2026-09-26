import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { chartColors } from "./chartColors";
import { TooltipCard } from "./ChartTooltip";
import { ChartLegend } from "./ChartLegend";

export interface CohortDatum {
  key: string;
  label: string;
  newCount: number;
  returningCount: number;
}

/**
 * New-customer intake (bars, own scale) with repeat rate overlaid (line, secondary axis, zoomed
 * to the data's real range — not a fixed 0-100%). Deliberately NOT a stacked new+returning bar:
 * for a mature base, returning customers routinely outnumber new arrivals 10-15:1 in a given
 * month, so stacking makes the new-customer segment an invisible sliver under a dominant
 * returning bar — exactly the metric this chart exists to surface becomes the hardest thing to
 * read. New intake deserves its own axis; returning count stays available in the tooltip. A
 * 0-100% rate axis has the same problem in reverse: a healthy repeat rate sits in a tight
 * 85-100% band, so the full axis reduces the line to a flat streak with no visible movement.
 */
export function CustomerCohortBars({ data, height = 260 }: { data: CohortDatum[]; height?: number }) {
  const withRate = data.map((d) => {
    const total = d.newCount + d.returningCount;
    return { ...d, repeatRate: total ? d.returningCount / total : 0 };
  });

  const rates = withRate.map((d) => d.repeatRate);
  const rateMin = Math.min(...rates, 1);
  const rateFloor = Math.max(0, Math.floor((rateMin - 0.06) * 20) / 20); // nearest 5% below the lowest point, floored at 0

  return (
    <div>
      <div className="mb-3">
        <ChartLegend
          items={[
            { key: "new", label: "New customers", color: chartColors.accent, shape: "rect" },
            { key: "rate", label: "Repeat rate", color: chartColors.seq[500] },
          ]}
        />
      </div>
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={withRate} margin={{ top: 10, right: 12, bottom: 0, left: 8 }}>
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
            yAxisId="count"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: chartColors.inkMuted, fontFamily: "Inter, sans-serif" }}
            width={26}
            tickMargin={6}
            allowDecimals={false}
          />
          <YAxis
            yAxisId="rate"
            orientation="right"
            domain={[rateFloor, 1]}
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: chartColors.inkMuted, fontFamily: "Inter, sans-serif" }}
            tickFormatter={(v) => `${Math.round(v * 100)}%`}
            width={40}
          />
          <Tooltip
            cursor={{ fill: chartColors.surfaceSunken }}
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const point = payload[0]?.payload as (typeof withRate)[number] | undefined;
              if (!point) return null;
              return (
                <TooltipCard
                  heading={String(label)}
                  rows={[
                    { key: "new", label: "New", value: String(point.newCount), color: chartColors.accent, shape: "rect" },
                    { key: "returning", label: "Returning", value: String(point.returningCount), color: chartColors.baseline },
                    { key: "rate", label: "Repeat rate", value: `${Math.round(point.repeatRate * 100)}%`, color: chartColors.seq[500] },
                  ]}
                />
              );
            }}
          />
          <Bar yAxisId="count" dataKey="newCount" fill={chartColors.accent} fillOpacity={0.85} radius={[4, 4, 0, 0]} maxBarSize={26} />
          <Line
            yAxisId="rate"
            type="monotone"
            dataKey="repeatRate"
            stroke={chartColors.seq[500]}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: chartColors.seq[500], stroke: chartColors.surface, strokeWidth: 2 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
