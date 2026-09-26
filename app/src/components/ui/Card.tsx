import type { ReactNode } from "react";
import { motion } from "motion/react";

export function Card({
  children,
  className = "",
  padding = "p-6",
}: {
  children: ReactNode;
  className?: string;
  padding?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className={`min-w-0 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-card),inset_0_1px_0_rgba(255,255,255,0.6)] ${padding} ${className}`}
    >
      {children}
    </motion.div>
  );
}

export function CardHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-5 flex items-start justify-between gap-4">
      <div>
        <h3 className="text-[14.5px] font-semibold tracking-tight text-[var(--color-ink)]">{title}</h3>
        {subtitle && <p className="mt-0.5 font-label text-[12px] text-[var(--color-ink-muted)]">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
