import type { LucideIcon } from "lucide-react";
import { SearchX } from "lucide-react";

export function EmptyState({
  icon: Icon = SearchX,
  title,
  helper,
}: {
  icon?: LucideIcon;
  title: string;
  helper?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2.5 py-14 text-center">
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--color-surface-sunken)]">
        <Icon size={19} strokeWidth={1.6} className="text-[var(--color-ink-muted)]" />
      </div>
      <p className="text-[13.5px] font-medium text-[var(--color-ink)]">{title}</p>
      {helper && <p className="max-w-xs text-[12px] text-[var(--color-ink-muted)]">{helper}</p>}
    </div>
  );
}
