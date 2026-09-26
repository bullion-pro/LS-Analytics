import type { LucideIcon } from "lucide-react";
import { Lightbulb } from "lucide-react";

type Tone = "accent" | "good" | "warning" | "critical";

const TONE_STYLES: Record<Tone, { bg: string; fg: string; icon: string }> = {
  accent: { bg: "bg-[var(--color-accent-light)]", fg: "text-[var(--color-accent-dark)]", icon: "text-[var(--color-accent-dark)]" },
  good: { bg: "bg-[var(--color-good-tint)]", fg: "text-[#0a6b0a]", icon: "text-[#0a6b0a]" },
  warning: { bg: "bg-[var(--color-warning-tint)]", fg: "text-[#8a5a06]", icon: "text-[#8a5a06]" },
  critical: { bg: "bg-[var(--color-critical-tint)]", fg: "text-[#a12626]", icon: "text-[#a12626]" },
};

export function InsightCallout({
  text,
  tone = "accent",
  icon: Icon = Lightbulb,
}: {
  text: string;
  tone?: Tone;
  icon?: LucideIcon;
}) {
  const s = TONE_STYLES[tone];
  return (
    <div className={`flex items-start gap-2.5 rounded-xl px-3.5 py-3 ${s.bg}`}>
      <Icon size={15} strokeWidth={2} className={`mt-0.5 shrink-0 ${s.icon}`} />
      <p className={`text-[12.5px] leading-relaxed ${s.fg}`}>{text}</p>
    </div>
  );
}
