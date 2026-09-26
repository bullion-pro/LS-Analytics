import { Bar, CartesianGrid, Cell, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { chartColors } from "./chartColors";
import { TooltipCard } from "./ChartTooltip";
import { ChartLegend } from "./ChartLegend";

export interface CashFlowDatum {
  key: string;
  label: string;
  netChange: number;
  balance: number;
}

/**
 * Monthly net cash generated/used (bars, signed) with the running closing
 * balance overlaid (line) — one shared AED axis. Distinct from a plain trend
 * line: it shows both the swing each month and where that leaves the bank.
 */
export function CashFlowBars({
  data,
  valueFormatter,
  height = 280,
}: {
  data: CashFlowDatum[];
  valueFormatter: (v: number) => string;
  height?: number;
}) {
  return (
    <div>
      <div className="mb-3">
        <ChartLegend
          items={[
            { key: "balance", label: "Closing balance", color: chartColors.accent },
            { key: "in", label: "Net cash in", color: chartColors.good, shape: "rect" },
            { key: "out", label: "Net cash out", color: chartColors.critical, shape: "rect" },
          ]}
        />
      </div>
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={data} margin={{ top: 10, right: 12, bottom: 0, left: 8 }}>
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
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: chartColors.inkMuted, fontFamily: "Inter, sans-serif" }}
            tickFormatter={(v) => valueFormatter(v)}
            width={78}
            tickMargin={6}
          />
          <Tooltip
            cursor={{ fill: chartColors.surfaceSunken }}
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const point = payload[0]?.payload as CashFlowDatum | undefined;
              if (!point) return null;
              return (
                <TooltipCard
                  heading={String(label)}
                  rows={[
                    {
                      key: "netChange",
                      label: point.netChange >= 0 ? "Net cash in" : "Net cash out",
                      value: `${point.netChange >= 0 ? "+" : "−"}${valueFormatter(Math.abs(point.netChange))}`,
                      color: point.netChange >= 0 ? chartColors.good : chartColors.critical,
                      shape: "rect",
                    },
                    { key: "balance", label: "Closing balance", value: valueFormatter(point.balance), color: chartColors.accent },
                  ]}
                />
              );
            }}
          />
          <Bar dataKey="netChange" radius={[3, 3, 3, 3]} maxBarSize={22}>
            {data.map((d) => (
              <Cell key={d.key} fill={d.netChange >= 0 ? chartColors.good : chartColors.critical} fillOpacity={0.72} />
            ))}
          </Bar>
          <Line
            type="monotone"
            dataKey="balance"
            stroke={chartColors.accent}
            strokeWidth={2.25}
            dot={false}
            activeDot={{ r: 4.5, fill: chartColors.accent, stroke: chartColors.surface, strokeWidth: 2 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
