export interface TooltipRow {
  key: string;
  label: string;
  value: string;
  color: string;
  shape?: "line" | "rect" | "dot";
}

/** Shared tooltip card: values lead (strong/primary), series name follows (secondary), line-key not a box. */
export function TooltipCard({ heading, rows }: { heading?: string; rows: TooltipRow[] }) {
  return (
    <div className="min-w-[168px] rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-ink)] px-3 py-2.5 shadow-[var(--shadow-card)]">
      {heading && (
        <div className="mb-1.5 font-label text-[10.5px] font-semibold uppercase tracking-wide text-white/50">
          {heading}
        </div>
      )}
      <div className="flex flex-col gap-1.5">
        {rows.map((row) => (
          <div key={row.key} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-1.5">
              <Swatch color={row.color} shape={row.shape ?? "line"} />
              <span className="text-[11.5px] text-white/70">{row.label}</span>
            </div>
            <span className="tabular text-[12.5px] font-semibold text-white">{row.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Swatch({ color, shape }: { color: string; shape: "line" | "rect" | "dot" }) {
  if (shape === "dot") {
    return <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />;
  }
  if (shape === "rect") {
    return <span className="inline-block h-2 w-2.5 rounded-[2px]" style={{ backgroundColor: color }} />;
  }
  return <span className="inline-block h-[2px] w-3 rounded-full" style={{ backgroundColor: color }} />;
}
