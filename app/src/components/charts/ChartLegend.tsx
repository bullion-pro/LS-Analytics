export interface LegendItem {
  key: string;
  label: string;
  color: string;
  shape?: "line" | "rect" | "dot";
}

/** Always present for >=2 series — the dependable identity channel. */
export function ChartLegend({ items }: { items: LegendItem[] }) {
  if (items.length < 2) return null;
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
      {items.map((item) => (
        <div key={item.key} className="flex items-center gap-1.5">
          <LegendSwatch color={item.color} shape={item.shape ?? "line"} />
          <span className="font-label text-[11.5px] text-[var(--color-ink-secondary)]">{item.label}</span>
        </div>
      ))}
    </div>
  );
}

function LegendSwatch({ color, shape }: { color: string; shape: "line" | "rect" | "dot" }) {
  if (shape === "dot") {
    return <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: color }} />;
  }
  if (shape === "rect") {
    return <span className="inline-block h-2.5 w-3 rounded-[2px]" style={{ backgroundColor: color }} />;
  }
  return <span className="inline-block h-[2px] w-4 rounded-full" style={{ backgroundColor: color }} />;
}
