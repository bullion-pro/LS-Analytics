import type { ReactNode } from "react";

export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  action,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div>
        {eyebrow && (
          <div className="mb-1 font-label text-[10.5px] font-semibold uppercase tracking-wider text-[var(--color-accent-dark)]">
            {eyebrow}
          </div>
        )}
        <h2 className="text-[16.5px] font-semibold tracking-tight text-[var(--color-ink)]">{title}</h2>
        {subtitle && <p className="mt-0.5 text-[13px] text-[var(--color-ink-secondary)]">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
