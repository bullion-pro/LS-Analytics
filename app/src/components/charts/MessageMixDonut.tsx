import { useState } from "react";
import { formatNumber, formatPct } from "@/lib/format";
import type { CompositionDatum } from "./CompositionBar";

export interface MessageMixDonutProps {
  data: CompositionDatum[];
  periodLabel?: string;
}

interface CategoryMeta {
  gradientId: string;
  solidColor: string;
  dotBg: string;
  dotBorder?: string;
  glow: string;
  subtitle: string;
  tierBadge: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder?: string;
  insight: string;
}

const CATEGORY_CONFIG: Record<string, CategoryMeta> = {
  marketing: {
    gradientId: "pA-obsidian",
    solidColor: "#16130f",
    dotBg: "#16130f",
    dotBorder: "1.5px solid #d9b978",
    glow: "rgba(22,19,15,0.35)",
    subtitle: "Lookbooks · Private Invitations",
    tierBadge: "Billable Tier",
    badgeBg: "#16130f",
    badgeText: "#d9b978",
    badgeBorder: "1px solid rgba(217,185,120,0.4)",
    insight:
      "Highest volume outbound driver. High conversion on bridal lookbooks & private seasonal invitations, accounting for the primary share of external messaging tolls.",
  },
  service: {
    gradientId: "pA-gold",
    solidColor: "#b08d4f",
    dotBg: "linear-gradient(135deg, #b08d4f, #d9b978)",
    glow: "rgba(176,141,79,0.5)",
    subtitle: "Boutique VIP Concierge · Enquiries",
    tierBadge: "Zero Toll (Free)",
    badgeBg: "rgba(176,141,79,0.16)",
    badgeText: "#705322",
    badgeBorder: "1px solid rgba(176,141,79,0.35)",
    insight:
      "Zero incremental Meta toll. Reflects direct high-touch concierge conversations between boutique advisors and VIP jewelry clients within the 24h care window.",
  },
  utility: {
    gradientId: "pA-champagne",
    solidColor: "#dfc394",
    dotBg: "#dfc394",
    dotBorder: "1px solid #b08d4f",
    glow: "rgba(223,195,148,0.35)",
    subtitle: "Appointment · Order Alerts",
    tierBadge: "Discounted Utility",
    badgeBg: "rgba(223,195,148,0.25)",
    badgeText: "#785822",
    badgeBorder: "1px solid rgba(176,141,79,0.2)",
    insight:
      "Critical trust touchpoints: Showroom appointment confirmations, bespoke fabrication updates, and vault delivery handoffs.",
  },
  authentication: {
    gradientId: "pA-platinum",
    solidColor: "#aba398",
    dotBg: "#aba398",
    glow: "rgba(171,163,152,0.3)",
    subtitle: "Secure Login · Vault Portal",
    tierBadge: "Security OTP",
    badgeBg: "rgba(171,163,152,0.2)",
    badgeText: "#575249",
    badgeBorder: "1px solid rgba(171,163,152,0.3)",
    insight:
      "Secure one-time passcodes for private vault client portal access & valuation certificate downloads.",
  },
};

const DEFAULT_META: CategoryMeta = {
  gradientId: "pA-champagne",
  solidColor: "#a39c8c",
  dotBg: "#a39c8c",
  glow: "rgba(163,156,140,0.3)",
  subtitle: "General Communications",
  tierBadge: "Standard",
  badgeBg: "rgba(163,156,140,0.12)",
  badgeText: "#736b5e",
  insight: "Standard messaging traffic across active client channels.",
};

export function MessageMixDonut({ data }: MessageMixDonutProps) {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const total = data.reduce((acc, d) => acc + d.value, 0) || 1;
  const sorted = [...data].sort((a, b) => b.value - a.value);

  // SVG Donut geometry
  const radius = 46;
  const circumference = 2 * Math.PI * radius; // ~289.026
  let accumulatedLength = 0;

  const segments = sorted.map((item) => {
    const share = item.value / total;
    const strokeDash = share * circumference;
    const strokeOffset = -accumulatedLength;
    accumulatedLength += strokeDash;
    const meta = CATEGORY_CONFIG[item.key] || DEFAULT_META;

    return {
      ...item,
      share,
      strokeDash,
      strokeOffset,
      meta,
    };
  });

  const selectedSegment = selectedKey ? segments.find((s) => s.key === selectedKey) : null;
  const serviceSegment = segments.find((s) => s.key === "service");
  const servicePct = serviceSegment ? formatPct(serviceSegment.share, 0) : "32%";

  return (
    <div className="flex h-full flex-col justify-between">
      <div>
        {/* Top Summary Banner: Champagne Silk Glass Material with Specular Sheen */}
        <div
          className="relative mb-4 flex items-center gap-4 overflow-hidden rounded-[20px] p-4 sm:gap-5"
          style={{
            background: "linear-gradient(135deg, #f5ebd5 0%, #eee1cb 35%, #e9ddd8 70%, #ded6e0 100%)",
            border: "1px solid rgba(217, 185, 120, 0.5)",
            boxShadow:
              "0 10px 28px rgba(176, 141, 79, 0.14), inset 0 1.5px 0 rgba(255, 255, 255, 0.85), inset 0 -1px 0 rgba(22, 19, 15, 0.04)",
          }}
        >
          {/* Specular Ambient Light Sheen */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(60% 70% at 15% -8%, rgba(255,255,255,0.75), transparent 60%), linear-gradient(115deg, rgba(255,255,255,0.3) 0%, transparent 40%)",
            }}
          />

          {/* Donut SVG Ring with Brushed Precious Metal Gradients */}
          <div className="relative h-[120px] w-[120px] flex-shrink-0 z-10">
            <svg width="120" height="120" viewBox="0 0 120 120" className="-rotate-90">
              <defs>
                {/* Marketing: Obsidian Velvet */}
                <linearGradient id="pA-obsidian" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#16130f" />
                  <stop offset="100%" stopColor="#2c241c" />
                </linearGradient>

                {/* Service: Burnished Rich Gold */}
                <linearGradient id="pA-gold" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#b08d4f" />
                  <stop offset="50%" stopColor="#d9b978" />
                  <stop offset="100%" stopColor="#947238" />
                </linearGradient>

                {/* Utility: Champagne Silk Light */}
                <linearGradient id="pA-champagne" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#dfc394" />
                  <stop offset="100%" stopColor="#edd8b8" />
                </linearGradient>

                {/* Auth: Platinum Pearl */}
                <linearGradient id="pA-platinum" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#aba398" />
                  <stop offset="100%" stopColor="#c9c3ba" />
                </linearGradient>
              </defs>

              {/* Background Track */}
              <circle cx="60" cy="60" r={radius} fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="12" />

              {/* Segments */}
              {segments.map((s) => {
                const isSelected = selectedKey === s.key;
                const isDimmed = selectedKey !== null && !isSelected;

                return (
                  <circle
                    key={s.key}
                    cx="60"
                    cy="60"
                    r={radius}
                    fill="none"
                    stroke={`url(#${s.meta.gradientId})`}
                    strokeWidth={isSelected ? 14 : 12}
                    strokeDasharray={`${Math.max(s.strokeDash, 2.5)} ${circumference}`}
                    strokeDashoffset={s.strokeOffset}
                    className="transition-all duration-300"
                    style={{
                      opacity: isDimmed ? 0.65 : 1,
                      filter: isSelected ? `drop-shadow(0 0 8px ${s.meta.glow})` : "none",
                    }}
                  />
                );
              })}
            </svg>

            {/* Inner Center Label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-[18px] font-black leading-none tracking-tight text-[#16130f]">
                {formatNumber(total)}
              </span>
              <span className="mt-1 font-label text-[8.5px] font-bold uppercase tracking-wider text-[#8a6c38]">
                Outbound
              </span>
            </div>
          </div>

          {/* Efficiency Micro-Narrative */}
          <div className="relative z-10 flex-1 pr-1">
            <div className="flex items-center justify-between gap-1">
              <span className="font-label text-[10px] font-bold uppercase tracking-[0.12em] text-[#8a6c38]">
                Executive Care Efficiency
              </span>
              {selectedKey && (
                <button
                  type="button"
                  onClick={() => setSelectedKey(null)}
                  className="rounded border border-[rgba(176,141,79,0.35)] bg-white/80 px-2 py-0.5 text-[9.5px] font-bold text-[#8a6c38] transition hover:bg-white hover:text-[#16130f]"
                >
                  Reset
                </button>
              )}
            </div>
            <div className="mt-1 text-[13.5px] font-black tracking-tight text-[#16130f]">
              {selectedSegment ? selectedSegment.label : "High Organic Intimacy"}
            </div>
            <p className="mt-1 text-[11.5px] leading-relaxed text-[#6b6254]">
              {selectedSegment ? (
                <>
                  <strong className="text-[#16130f]">{formatNumber(selectedSegment.value)} msgs</strong> (
                  {formatPct(selectedSegment.share, 1)}) assigned to{" "}
                  <strong style={{ color: selectedSegment.meta.solidColor }}>{selectedSegment.meta.tierBadge}</strong>.
                </>
              ) : (
                <>
                  <strong className="text-[#b08d4f]">{servicePct} of traffic</strong> is resolved via 1-on-1 boutique
                  concierge replies at <strong className="text-[#16130f]">zero Meta toll</strong>.
                </>
              )}
            </p>
          </div>
        </div>

        {/* 4 Interactive Precious Metal Rows */}
        <div className="space-y-2">
          {segments.map((s) => {
            const isSelected = selectedKey === s.key;

            return (
              <button
                key={s.key}
                type="button"
                onClick={() => setSelectedKey(isSelected ? null : s.key)}
                className={`group flex w-full items-center justify-between rounded-xl border p-2.5 sm:p-3 text-left transition-all duration-200 cursor-pointer ${
                  isSelected
                    ? "border-[#b08d4f] bg-white ring-1 ring-[#b08d4f] shadow-[0_6px_20px_rgba(176,141,79,0.18)]"
                    : "border-[rgba(22,19,15,0.06)] bg-white/80 hover:-translate-y-0.5 hover:border-[rgba(176,141,79,0.4)] hover:bg-white hover:shadow-[0_6px_16px_rgba(176,141,79,0.12)]"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className="h-3 w-3 rounded-[3px] transition-transform duration-200 group-hover:scale-110 flex-shrink-0"
                    style={{
                      background: s.meta.dotBg,
                      border: s.meta.dotBorder || "none",
                      boxShadow: `0 0 6px ${s.meta.glow}`,
                    }}
                  />
                  <div>
                    <div className="text-[12.5px] font-bold text-[#16130f] group-hover:text-[#8a6c38] transition-colors">
                      {s.label}
                    </div>
                    <div className="font-label text-[10px] text-[#857c6d]">{s.meta.subtitle}</div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-[13px] font-black text-[#16130f]">
                    {formatNumber(s.value)}{" "}
                    <span className="text-[11px] font-extrabold" style={{ color: s.meta.solidColor }}>
                      ({formatPct(s.share, 0)})
                    </span>
                  </div>
                  <span
                    className="inline-block rounded px-2 py-0.5 font-label text-[9px] font-bold tracking-tight mt-0.5"
                    style={{
                      backgroundColor: s.meta.badgeBg,
                      color: s.meta.badgeText,
                      border: s.meta.badgeBorder || "none",
                    }}
                  >
                    {s.meta.tierBadge}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Dynamic Storytelling Callout at Bottom with Luxury Gold Tone */}
      <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-[rgba(176,141,79,0.3)] bg-white/90 p-3 text-[11.5px] text-[#705322] shadow-[0_2px_8px_rgba(176,141,79,0.06)]">
        <span className="text-[14px] leading-none">✨</span>
        <div className="leading-snug">
          {selectedSegment ? (
            <>
              <strong className="text-[#16130f]">
                {selectedSegment.label} ({formatPct(selectedSegment.share, 0)}):
              </strong>{" "}
              {selectedSegment.meta.insight}
            </>
          ) : (
            <>
              <strong className="text-[#16130f]">Precious Metal Economics:</strong> Outbound campaigns drive promotional reach, while{" "}
              <strong className="text-[#b08d4f]">{servicePct} of all traffic</strong> is handled organically at zero
              messaging toll, maximizing luxury VIP intimacy with minimal Meta expenditure.
            </>
          )}
        </div>
      </div>
    </div>
  );
}
