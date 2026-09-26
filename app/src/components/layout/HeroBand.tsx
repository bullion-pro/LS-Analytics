import type { ReactNode } from "react";
import { motion } from "motion/react";

/**
 * The one deliberate dark panel (see index.css) — shared so every page that
 * opens on a hero moment (Overview, Finance) gets the same obsidian-glass
 * treatment instead of each page hand-rolling its own copy.
 */
export function HeroBand({ children }: { children: ReactNode }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="relative overflow-hidden rounded-2xl px-8 py-7 shadow-[var(--shadow-panel),inset_0_1.5px_0_rgba(255,255,255,0.14),inset_0_-1px_0_rgba(0,0,0,0.3)]"
      style={{
        backgroundColor: "var(--color-obsidian)",
        backgroundImage:
          "radial-gradient(ellipse 640px 320px at 8% 0%, rgba(217,185,120,0.16), transparent 65%), radial-gradient(ellipse 480px 260px at 100% 100%, rgba(217,185,120,0.08), transparent 60%)",
      }}
    >
      {/* Glass sheen — a soft light catch across the top of the panel, like light grazing a glass surface. */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(60% 70% at 12% -8%, rgba(255,255,255,0.1), transparent 60%), " +
            "linear-gradient(115deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0) 30%)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.05] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />
      <div className="relative z-10">{children}</div>
    </motion.section>
  );
}
