import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import type { Delta } from "@/lib/format";

export function DeltaPill({ delta, tone = "light" }: { delta: Delta; tone?: "light" | "dark" }) {
  const isFlat = Math.abs(delta.value) < 0.0005;
  const Icon = delta.value >= 0 ? ArrowUpRight : ArrowDownRight;

  const lightClasses = delta.isGood
    ? "bg-[var(--color-good-tint)] text-[#0a6b0a]"
    : "bg-[var(--color-critical-tint)] text-[#a12626]";
  const darkClasses = delta.isGood ? "bg-white/10 text-[#8fe28f]" : "bg-white/10 text-[#f0a3a2]";

  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-semibold tabular ${
        tone === "dark" ? darkClasses : lightClasses
      }`}
    >
      {!isFlat && <Icon size={11} strokeWidth={2.75} />}
      {(delta.value >= 0 ? "+" : "−") + Math.abs(delta.value * 100).toFixed(1)}%
    </span>
  );
}
