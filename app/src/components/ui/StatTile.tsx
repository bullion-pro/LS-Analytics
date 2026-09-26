import type { LucideIcon } from "lucide-react";
import type { Delta } from "@/lib/format";
import { DeltaPill } from "./DeltaPill";
import { AnimatedNumber } from "./AnimatedNumber";
import { Sparkline } from "@/components/charts/Sparkline";
import { chartColors } from "@/components/charts/chartColors";

type Tone = "light" | "dark" | "glass";

interface StatTileProps {
  label: string;
  value: string;
  /** When provided, the value counts up/down from its previous figure on change instead of snapping. */
  numeric?: { raw: number; format: (v: number) => string };
  unit?: string;
  delta?: Delta;
  deltaCaption?: string;
  trend?: number[];
  icon?: LucideIcon;
  tone?: Tone;
  flagged?: boolean;
}

const CONTAINER_BY_TONE: Record<Tone, string> = {
  light:
    "border border-[rgba(176,141,79,0.2)] bg-[linear-gradient(155deg,#fffefb_0%,#faf6ec_100%)] " +
    "shadow-[inset_0_1px_0_rgba(255,255,255,0.9),inset_0_-1px_0_rgba(176,141,79,0.07),0_1px_2px_rgba(22,19,15,0.03),0_10px_24px_-14px_rgba(176,141,79,0.35)] " +
    "hover:-translate-y-[3px] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.9),inset_0_-1px_0_rgba(176,141,79,0.1),0_1px_2px_rgba(22,19,15,0.03),0_16px_32px_-16px_rgba(176,141,79,0.45)]",
  dark:
    "border border-white/[0.22] bg-white/[0.09] backdrop-blur-lg backdrop-saturate-[1.6] " +
    "shadow-[inset_0_1.5px_0_rgba(255,255,255,0.3),inset_0_-1px_0_rgba(0,0,0,0.25),inset_0_0_0_1px_rgba(255,255,255,0.03),0_12px_30px_-14px_rgba(0,0,0,0.65)] " +
    "hover:-translate-y-[3px] hover:bg-white/[0.13] hover:border-white/[0.3] " +
    "hover:shadow-[inset_0_1.5px_0_rgba(255,255,255,0.34),inset_0_-1px_0_rgba(0,0,0,0.25),0_18px_38px_-16px_rgba(0,0,0,0.7)]",
  glass:
    "border border-white/55 bg-white/45 backdrop-blur-md backdrop-saturate-[1.6] " +
    "shadow-[0_8px_32px_rgba(120,95,50,0.14)] hover:-translate-y-[3px]",
};

const ICON_CHIP_BY_TONE: Record<Tone, string> = {
  light: "bg-[linear-gradient(155deg,#f6eedd,#ecdcb8)] text-[var(--color-accent-dark)] shadow-[inset_0_1px_1px_rgba(255,255,255,0.8),inset_0_-1px_1px_rgba(176,141,79,0.25)]",
  dark: "bg-white/10 text-[var(--color-accent-on-obsidian)]",
  glass: "bg-white/55 text-[var(--color-accent-dark)]",
};

const LABEL_BY_TONE: Record<Tone, string> = {
  light: "text-[var(--color-ink-muted)]",
  dark: "text-white/55",
  glass: "text-[var(--color-ink-secondary)]",
};

const VALUE_BY_TONE: Record<Tone, string> = {
  light: "text-[var(--color-ink)]",
  dark: "text-white",
  glass: "text-[var(--color-ink)]",
};

const UNIT_CAPTION_BY_TONE: Record<Tone, string> = {
  light: "text-[var(--color-ink-muted)]",
  dark: "text-white/50",
  glass: "text-[var(--color-ink-secondary)]",
};

export function StatTile({ label, value, numeric, unit, delta, deltaCaption, trend, icon: Icon, tone = "light", flagged }: StatTileProps) {
  return (
    <div
      className={[
        "relative flex min-w-0 flex-col gap-3 overflow-hidden rounded-xl p-4 transition-[transform,box-shadow] duration-300",
        CONTAINER_BY_TONE[tone],
        flagged && tone === "light" ? "outline outline-1 outline-[var(--color-accent)]/40" : "",
      ].join(" ")}
    >
      {tone === "dark" && (
        <div
          className="pointer-events-none absolute inset-0 z-0"
          style={{
            backgroundImage:
              "radial-gradient(120% 80% at 18% -10%, rgba(255,255,255,0.28), transparent 55%), " +
              "linear-gradient(135deg, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0.03) 42%, rgba(255,255,255,0) 62%)",
          }}
        />
      )}
      <div className="relative z-10 flex min-w-0 flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <span className={`font-label text-[11px] font-medium uppercase tracking-wide ${LABEL_BY_TONE[tone]}`}>{label}</span>
            {tone === "light" && (
              <div className="mt-1.5 h-[1.5px] w-[18px] bg-[linear-gradient(90deg,var(--color-accent),transparent)]" />
            )}
          </div>
          {Icon && (
            <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${ICON_CHIP_BY_TONE[tone]}`}>
              <Icon size={13} strokeWidth={2} />
            </span>
          )}
        </div>

        <div className="flex items-end justify-between gap-3">
          <div className="flex items-baseline gap-1">
            {numeric ? (
              <AnimatedNumber
                value={numeric.raw}
                format={numeric.format}
                className={`text-[24px] font-semibold tracking-tight ${VALUE_BY_TONE[tone]}`}
              />
            ) : (
              <span className={`text-[24px] font-semibold tracking-tight ${VALUE_BY_TONE[tone]}`}>{value}</span>
            )}
            {unit && <span className={`text-[12px] ${UNIT_CAPTION_BY_TONE[tone]}`}>{unit}</span>}
          </div>
          {trend && trend.length > 1 && (
            <Sparkline values={trend} width={72} height={28} color={tone === "dark" ? chartColors.accentOnObsidian : chartColors.accent} />
          )}
        </div>

        {(delta || deltaCaption) && (
          <div className="flex items-center gap-1.5">
            {delta && <DeltaPill delta={delta} tone={tone === "dark" ? "dark" : "light"} />}
            {deltaCaption && <span className={`text-[11px] ${UNIT_CAPTION_BY_TONE[tone]}`}>{deltaCaption}</span>}
          </div>
        )}
      </div>
    </div>
  );
}
