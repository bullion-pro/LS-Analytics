export function ChartSkeleton({ height = 260 }: { height?: number }) {
  return (
    <div className="animate-pulse" style={{ height }}>
      <div className="flex h-full items-end gap-2 px-1">
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className="flex-1 rounded-t-[3px] bg-[var(--color-surface-sunken)]"
            style={{ height: `${30 + ((i * 37) % 60)}%` }}
          />
        ))}
      </div>
    </div>
  );
}
