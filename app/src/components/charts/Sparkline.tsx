import { chartColors } from "./chartColors";

/**
 * A bare trend sparkline — no axes/gridlines/tooltip by convention. The
 * de-emphasis hue for history, the accent for the current point.
 */
export function Sparkline({
  values,
  width = 96,
  height = 32,
  color = chartColors.accent,
}: {
  values: number[];
  width?: number;
  height?: number;
  color?: string;
}) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const stepX = width / (values.length - 1);
  const pad = 3;
  const points = values.map((v, i) => {
    const x = i * stepX;
    const y = pad + (1 - (v - min) / range) * (height - pad * 2);
    return [x, y] as const;
  });
  const path = points.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const [lastX, lastY] = points[points.length - 1];

  const areaPath = `${path} L${lastX.toFixed(1)},${height} L0,${height} Z`;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
      <path d={areaPath} fill={color} opacity={0.08} />
      <path d={path} fill="none" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={lastX} cy={lastY} r={2.75} fill={color} stroke="white" strokeWidth={1.5} />
    </svg>
  );
}
