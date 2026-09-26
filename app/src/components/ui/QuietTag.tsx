export function QuietTag({ children }: { children: string }) {
  return (
    <span className="rounded-full border border-[var(--color-border-strong)] px-1.5 py-[1px] font-label text-[9px] font-semibold uppercase tracking-wide text-[var(--color-ink-muted)]">
      {children}
    </span>
  );
}
