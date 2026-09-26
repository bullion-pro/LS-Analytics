import { useEffect, useState } from "react";
import { chartColors } from "./chartColors";

export interface LeadFlowNode {
  key: string;
  label: string;
  color: string;
  total: number;
  convertedPct?: number;
}
export interface LeadFlowLink {
  sourceKey: string;
  outcomeKey: string;
  value: number;
}

interface Ribbon {
  sourceKey: string;
  outcomeKey: string;
  color: string;
  value: number;
  ly0: number;
  ly1: number;
  ry0: number;
  ry1: number;
}
interface PositionedNode {
  key: string;
  label: string;
  color: string;
  total: number;
  convertedPct?: number;
  y0: number;
  y1: number;
}

function ribbonPath(x1: number, ly0: number, ly1: number, x2: number, ry0: number, ry1: number): string {
  const midX = (x1 + x2) / 2;
  return `M${x1},${ly0} C${midX},${ly0} ${midX},${ry0} ${x2},${ry0} L${x2},${ry1} C${midX},${ry1} ${midX},${ly1} ${x1},${ly1} Z`;
}

/**
 * A two-column alluvial (Sankey-lite) diagram: lead source on the left, ultimate outcome on the
 * right, ribbon width = volume. Purpose-built for a question no funnel or bar chart on this page
 * answers — not "how many leads do we have" but "which channels' leads actually turn into
 * customers, and which quietly go cold" — in one continuous shape rather than a table of rates.
 * Deliberately distinct from LifecycleRibbon (a single ordered progression) and StageFunnel (a
 * narrowing bar sequence) elsewhere in the app: this is the only flow-between-two-dimensions chart.
 */
export function LeadConversionFlow({
  sources,
  outcomes,
  links,
  height = 320,
}: {
  sources: LeadFlowNode[];
  outcomes: LeadFlowNode[];
  links: LeadFlowLink[];
  height?: number;
}) {
  const [mounted, setMounted] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const W = 620;
  const H = height;
  const nodeW = 8;
  const padX = 148;
  const padTop = 10;
  const padBottom = 10;
  const gap = 10;
  const plotH = H - padTop - padBottom;
  const grandTotal = sources.reduce((a, s) => a + s.total, 0) || 1;
  // One shared scale for both columns (not one scale per column) — a link's ribbon must be the
  // same thickness at both ends, and node stacks must exactly absorb the ribbons that terminate
  // in them. Sized off whichever column has more gaps eating into its usable height.
  const gapTotalLeft = gap * Math.max(0, sources.length - 1);
  const gapTotalRight = gap * Math.max(0, outcomes.length - 1);
  const scale = Math.max(plotH - Math.max(gapTotalLeft, gapTotalRight), 0) / grandTotal;

  function stack(nodes: LeadFlowNode[]): PositionedNode[] {
    let cursor = padTop;
    return nodes.map((n) => {
      const h = n.total * scale;
      const node: PositionedNode = { ...n, y0: cursor, y1: cursor + h };
      cursor += h + gap;
      return node;
    });
  }

  const leftNodes = stack(sources);
  const rightNodes = stack(outcomes);
  const rightCursor = new Map(rightNodes.map((n) => [n.key, n.y0]));

  const ribbons: Ribbon[] = [];
  leftNodes.forEach((ln) => {
    let leftCursor = ln.y0;
    rightNodes.forEach((rn) => {
      const link = links.find((l) => l.sourceKey === ln.key && l.outcomeKey === rn.key);
      const value = link?.value ?? 0;
      if (value <= 0) return;
      const h = value * scale;
      const ry0 = rightCursor.get(rn.key) ?? rn.y0;
      ribbons.push({ sourceKey: ln.key, outcomeKey: rn.key, color: ln.color, value, ly0: leftCursor, ly1: leftCursor + h, ry0, ry1: ry0 + h });
      leftCursor += h;
      rightCursor.set(rn.key, ry0 + h);
    });
  });

  const x1 = padX;
  const x2 = W - padX;
  const hoveredNode = leftNodes.find((n) => n.key === hovered);

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} className="overflow-visible">
        {ribbons.map((r, i) => {
          const isDimmed = hovered !== null && r.sourceKey !== hovered;
          return (
            <path
              key={`${r.sourceKey}-${r.outcomeKey}`}
              d={ribbonPath(x1 + nodeW, r.ly0, r.ly1, x2, r.ry0, r.ry1)}
              fill={r.color}
              fillOpacity={mounted ? (isDimmed ? 0.08 : hovered ? 0.6 : 0.32) : 0}
              style={{ transition: `fill-opacity .3s ease ${mounted ? 0 : 260 + i * 40}ms` }}
            />
          );
        })}

        {leftNodes.map((n, i) => (
          <g
            key={n.key}
            onMouseEnter={() => setHovered(n.key)}
            onMouseLeave={() => setHovered(null)}
            style={{ cursor: "default", opacity: mounted ? 1 : 0, transition: `opacity .4s ease ${i * 70}ms` }}
          >
            <rect x={x1} y={n.y0} width={nodeW} height={Math.max(n.y1 - n.y0, 1)} rx={2} fill={n.color} opacity={hovered && hovered !== n.key ? 0.35 : 1} />
            <text x={x1 - 10} y={(n.y0 + n.y1) / 2 - 3} textAnchor="end" fontSize={12} fontWeight={600} fontFamily="Outfit, sans-serif" fill={chartColors.ink}>
              {n.label}
            </text>
            <text x={x1 - 10} y={(n.y0 + n.y1) / 2 + 11} textAnchor="end" fontSize={10} fontFamily="Inter, sans-serif" fill={chartColors.inkMuted}>
              {n.total} leads
            </text>
          </g>
        ))}

        {rightNodes.map((n, i) => (
          <g key={n.key} style={{ opacity: mounted ? 1 : 0, transition: `opacity .4s ease ${260 + i * 70}ms` }}>
            <rect x={x2 - nodeW} y={n.y0} width={nodeW} height={Math.max(n.y1 - n.y0, 1)} rx={2} fill={n.color} />
            <text x={x2 + 10} y={(n.y0 + n.y1) / 2 - 3} textAnchor="start" fontSize={12} fontWeight={600} fontFamily="Outfit, sans-serif" fill={chartColors.ink}>
              {n.label}
            </text>
            <text x={x2 + 10} y={(n.y0 + n.y1) / 2 + 11} textAnchor="start" fontSize={10} fontFamily="Inter, sans-serif" fill={chartColors.inkMuted}>
              {n.total} ({Math.round((n.total / grandTotal) * 100)}%)
            </text>
          </g>
        ))}
      </svg>

      <div className="mt-1 flex min-h-[18px] items-center justify-center">
        <p className="font-label text-[11px] text-[var(--color-ink-muted)]">
          {hoveredNode
            ? `${hoveredNode.label} → ${Math.round((hoveredNode.convertedPct ?? 0) * 100)}% convert to customer`
            : "Hover a source to see its conversion outcome"}
        </p>
      </div>
    </div>
  );
}
