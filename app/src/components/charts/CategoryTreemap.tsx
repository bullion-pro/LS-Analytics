import { useEffect, useState } from "react";
import { chartColors } from "./chartColors";
import { TooltipCard } from "./ChartTooltip";
import type { CompositionDatum } from "./CompositionBar";

const OTHER_COLOR = "#a39c8c";

interface AreaItem {
  key: string;
  label: string;
  value: number;
  color: string;
  area: number;
}
interface TreemapRect extends AreaItem {
  x: number;
  y: number;
  w: number;
  h: number;
}

function worst(row: AreaItem[], length: number): number {
  const sum = row.reduce((a, r) => a + r.area, 0);
  const rmax = Math.max(...row.map((r) => r.area));
  const rmin = Math.min(...row.map((r) => r.area));
  return Math.max((length * length * rmax) / (sum * sum), (sum * sum) / (length * length * rmin));
}

/** Squarified treemap (Bruls/Huizing/van Wijk): lays items out row by row, each row built up
 *  greedily while doing so keeps improving the row's worst aspect ratio, so blocks stay close to
 *  square rather than degenerating into thin slivers — the property a plain slice-and-dice
 *  layout doesn't have. Operates in an assumed W×H design space (not real pixels); the caller
 *  renders the result as percentages of its own width, so the actual container can be any width. */
function squarify(items: AreaItem[], x: number, y: number, w: number, h: number): TreemapRect[] {
  if (items.length === 0) return [];
  const results: TreemapRect[] = [];
  let remaining = items;
  let rx = x;
  let ry = y;
  let rw = w;
  let rh = h;

  while (remaining.length > 0) {
    const horizontal = rw < rh; // stack the next row across the shorter side
    const length = horizontal ? rw : rh;

    let row: AreaItem[] = [remaining[0]];
    let i = 1;
    while (i < remaining.length) {
      const testRow = [...row, remaining[i]];
      if (worst(testRow, length) <= worst(row, length)) {
        row = testRow;
        i++;
      } else {
        break;
      }
    }

    const rowSum = row.reduce((a, r) => a + r.area, 0);
    const thickness = rowSum / length;

    let offset = 0;
    row.forEach((r) => {
      const itemLen = r.area / thickness;
      if (horizontal) {
        results.push({ ...r, x: rx + offset, y: ry, w: itemLen, h: thickness });
      } else {
        results.push({ ...r, x: rx, y: ry + offset, w: thickness, h: itemLen });
      }
      offset += itemLen;
    });

    if (horizontal) {
      ry += thickness;
      rh -= thickness;
    } else {
      rx += thickness;
      rw -= thickness;
    }
    remaining = remaining.slice(row.length);
  }

  return results;
}

/**
 * A squarified treemap — block area = revenue share, so the eye reads "what's driving the
 * business" by size alone before ever looking at a number. Purpose-built for a part-to-whole
 * breakdown with several categories of genuinely comparable size (unlike one dominant share,
 * where CompositionBar's single bar already reads fine): a treemap's proportional blocks carry
 * far more visual hierarchy than a thin 100%-stacked bar once there are 6-8 segments to compare —
 * exactly this page's category mix. Same categorical palette and "top 7 + Other" capping as
 * CompositionBar, so the two read as the same color language across pages. Plain absolutely-
 * positioned divs, not SVG — an SVG viewBox's scale factor would distort a foreignObject
 * tooltip's real CSS pixels, so this follows ChannelQualityDots' div+tooltip pattern instead.
 */
export function CategoryTreemap({
  data,
  valueFormatter,
  height = 260,
}: {
  data: CompositionDatum[];
  valueFormatter: (v: number) => string;
  height?: number;
}) {
  const [hovered, setHovered] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const sorted = [...data].sort((a, b) => b.value - a.value);
  const top = sorted.slice(0, 7);
  const rest = sorted.slice(7);
  const otherValue = rest.reduce((a, d) => a + d.value, 0);
  const segments = otherValue > 0 ? [...top, { key: "__other", label: "Other", value: otherValue }] : top;

  const total = segments.reduce((a, s) => a + s.value, 0) || 1;
  // Assumed design-space width, chosen to resemble this card's real rendered aspect ratio (a
  // one-third-width column) closely enough that squarify's optimization stays meaningful.
  const W = 420;
  const H = height;
  const items: AreaItem[] = segments.map((s, i) => ({
    key: s.key,
    label: s.label,
    value: s.value,
    color: s.key === "__other" ? OTHER_COLOR : chartColors.cat[i % chartColors.cat.length],
    area: (s.value / total) * (W * H),
  }));

  const rects = squarify(items, 0, 0, W, H);
  const gap = 2.5;

  return (
    <div className="relative" style={{ height: H }}>
      {rects.map((r, i) => {
        const isHovered = hovered === r.key;
        const share = r.value / total;
        const bw = Math.max(0, r.w - gap);
        const bh = Math.max(0, r.h - gap);
        const canShowName = bw > 60 && bh > 34;
        const canShowPct = bw > 30 && bh > 20;
        return (
          <div
            key={r.key}
            className="absolute flex flex-col items-center justify-center overflow-hidden rounded-[6px] text-center"
            style={{
              left: `${((r.x + gap / 2) / W) * 100}%`,
              top: r.y + gap / 2,
              width: `${(bw / W) * 100}%`,
              height: bh,
              backgroundColor: r.color,
              backgroundImage: "linear-gradient(165deg, rgba(255,255,255,0.28) 0%, rgba(255,255,255,0) 50%)",
              boxShadow: isHovered
                ? "inset 0 0 0 1.5px rgba(255,255,255,0.55), inset 0 -4px 8px rgba(0,0,0,0.12)"
                : "inset 0 0 0 1px rgba(255,255,255,0.32), inset 0 -3px 6px rgba(0,0,0,0.08)",
              opacity: mounted ? (hovered && !isHovered ? 0.55 : 1) : 0,
              transform: mounted ? "scale(1)" : "scale(0.94)",
              transition: `opacity .35s ease ${mounted ? 0 : 260 + i * 45}ms, transform .35s ease ${mounted ? 0 : 260 + i * 45}ms, box-shadow .15s ease`,
            }}
            onMouseEnter={() => setHovered(r.key)}
            onMouseLeave={() => setHovered(null)}
          >
            {canShowName && (
              <span className="px-1.5 font-label text-[12.5px] font-semibold leading-tight text-white/[0.97]">{r.label}</span>
            )}
            {canShowPct && (
              <span className={`px-1.5 text-white/85 ${canShowName ? "mt-0.5 text-[11px]" : "text-[12px] font-semibold"}`}>
                {Math.round(share * 100)}%
              </span>
            )}
            {isHovered && (
              <div className="pointer-events-none absolute bottom-[calc(100%+8px)] left-1/2 z-20 -translate-x-1/2">
                <TooltipCard
                  rows={[
                    {
                      key: r.key,
                      label: r.label,
                      value: `${valueFormatter(r.value)} · ${Math.round(share * 100)}%`,
                      color: r.color,
                      shape: "rect",
                    },
                  ]}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
