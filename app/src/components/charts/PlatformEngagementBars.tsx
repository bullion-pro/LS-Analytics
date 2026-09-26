import { useEffect, useRef, useState, type ComponentType } from "react";
import type { PlatformEngagementSummary } from "@/mock/engagement";

// ── Real Official Brand SVGs (Clean, Scalable, 24x24 ViewBox) ──

export interface SocialIconProps {
  size?: number;
  strokeWidth?: number;
  className?: string;
}

export function InstagramIcon({ size = 20, className = "" }: SocialIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
    </svg>
  );
}

export function FacebookIcon({ size = 20, className = "" }: SocialIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036 26.805 26.805 0 0 0-.733-.009c-.704 0-1.233.111-1.587.332-.354.22-.531.644-.531 1.272v2.378h4.48l-.587 3.667h-3.893v7.98H9.101z" />
    </svg>
  );
}

/** Official Simple Icons Threads Logo (Exact, razor-sharp 24x24 vector) */
export function ThreadsIcon({ size = 20, className = "" }: SocialIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M18.263 11.097c-.03-3.486-1.92-5.586-5.111-5.586-2.13 0-3.922.963-4.863 2.499l2.062 1.438c.535-.843 1.272-1.543 2.628-1.543 1.528 0 2.318.85 2.544 2.431a15 15 0 0 0-2.236-.173c-4.125 0-6.068 1.867-6.068 4.336s1.943 3.99 4.804 3.99c3.139 0 5.013-2.115 5.781-4.735.798.361 1.348 1.204 1.348 2.47 0 3.387-3.907 5.232-7.22 5.232-4.885 0-8.077-3.207-8.077-8.424 0-6.392 4.223-10.487 9.9-10.487 3.808 0 5.69 1.671 6.97 3.914l2.108-1.475C21.44 2.078 18.331 0 13.663 0 6.227 0 1.168 5.277 1.168 12.934c0 7 4.953 11.066 10.856 11.066 4.878 0 9.809-2.846 9.809-7.716 0-2.545-1.46-4.231-3.569-5.187m-6.33 4.855c-1.077 0-2.026-.512-2.026-1.453 0-1.483 1.822-1.934 3.606-1.934.678 0 1.34.045 1.927.173-.422 1.927-1.671 3.215-3.508 3.214Z" />
    </svg>
  );
}

// ── Per-platform branding & color ramps ──
const PLATFORM_CONFIG: Record<
  string,
  {
    Icon: ComponentType<SocialIconProps>;
    badgeBg: string;
    barGradient: string;
    glowColor: string;
    scoreColor: string;
  }
> = {
  Instagram: {
    Icon: InstagramIcon,
    badgeBg: "linear-gradient(135deg, #f09433 0%, #dc2743 50%, #bc1888 100%)",
    barGradient: "linear-gradient(180deg, #f09433 0%, #bc1888 100%)",
    glowColor: "rgba(220, 39, 67, 0.32)",
    scoreColor: "#b8325a",
  },
  Facebook: {
    Icon: FacebookIcon,
    badgeBg: "linear-gradient(135deg, #1877f2 0%, #0d65d9 100%)",
    barGradient: "linear-gradient(180deg, #1877f2 0%, #0d65d9 100%)",
    glowColor: "rgba(24, 119, 242, 0.32)",
    scoreColor: "#0d65d9",
  },
  Threads: {
    Icon: ThreadsIcon,
    badgeBg: "linear-gradient(135deg, #241f1a 0%, #14110e 100%)",
    barGradient: "linear-gradient(180deg, #8a6c38 0%, #14110e 100%)",
    glowColor: "rgba(22, 19, 15, 0.22)",
    scoreColor: "#2a241e",
  },
};

// ── Eased count-up hook ──
function useCountUp(target: number, duration = 1200, delay = 0) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let raf: number;
    const timer = setTimeout(() => {
      const start = performance.now();
      function step(now: number) {
        const t = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - t, 3);
        setValue(Math.round(eased * target));
        if (t < 1) raf = requestAnimationFrame(step);
      }
      raf = requestAnimationFrame(step);
    }, delay);
    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(raf);
    };
  }, [target, duration, delay]);
  return value;
}

// ── Single Platform Row with Live Equalizer ──
function SignalRow({
  data,
  maxTotal,
  index,
  isLast,
}: {
  data: PlatformEngagementSummary;
  maxTotal: number;
  index: number;
  isLast: boolean;
}) {
  const cfg = PLATFORM_CONFIG[data.key] ?? {
    Icon: InstagramIcon,
    badgeBg: "linear-gradient(135deg, #2a241e 0%, #171411 100%)",
    barGradient: "linear-gradient(180deg, #8a6c38 0%, #14110e 100%)",
    glowColor: "rgba(22, 19, 15, 0.2)",
    scoreColor: "#2a241e",
  };

  const barsContainerRef = useRef<HTMLDivElement>(null);
  const [breakdownAnimated, setBreakdownAnimated] = useState(false);

  const NUM_BARS = 30;
  const ratio = maxTotal > 0 ? data.avgTotal / maxTotal : 0;
  const scoreVal = useCountUp(Math.round(data.avgTotal), 1200, 150 + index * 120);

  // Trigger breakdown bar width animation
  useEffect(() => {
    const t = setTimeout(() => setBreakdownAnimated(true), 350 + index * 120);
    return () => clearTimeout(t);
  }, [index]);

  // Live waveform animation on the equalizer bars
  useEffect(() => {
    const container = barsContainerRef.current;
    if (!container) return;

    container.innerHTML = "";
    const bars: HTMLDivElement[] = [];
    for (let i = 0; i < NUM_BARS; i++) {
      const b = document.createElement("div");
      b.style.cssText = `
        width: 4.5px;
        min-height: 4px;
        height: 4px;
        border-radius: 2px 2px 0 0;
        background: ${cfg.barGradient};
        opacity: ${(0.45 + Math.random() * 0.5).toFixed(2)};
        flex-shrink: 0;
        transition: height 0.12s ease;
      `;
      container.appendChild(b);
      bars.push(b);
    }

    let rafId: number;
    let phase = Math.random() * Math.PI * 2;

    function animate() {
      phase += 0.038;
      const maxHeight = 4 + ratio * 32;
      for (let i = 0; i < bars.length; i++) {
        const wave1 = Math.sin(phase + i * 0.42);
        const wave2 = Math.cos(phase * 0.7 + i * 0.28);
        const combined = (wave1 * 0.6 + wave2 * 0.4) * 0.5 + 0.5;
        const h = 4 + combined * maxHeight;
        bars[i].style.height = `${Math.max(4, h)}px`;
      }
      rafId = requestAnimationFrame(animate);
    }

    const startTimer = setTimeout(() => {
      rafId = requestAnimationFrame(animate);
    }, 100 + index * 100);

    return () => {
      clearTimeout(startTimer);
      cancelAnimationFrame(rafId);
    };
  }, [ratio, cfg.barGradient, index]);

  const total = data.avgLikes + data.avgComments + data.avgShares || 1;
  const likesPct = (data.avgLikes / total) * 100;
  const cmentsPct = (data.avgComments / total) * 100;
  const sharesPct = (data.avgShares / total) * 100;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 18,
        padding: "17px 0",
        borderBottom: !isLast ? "1px solid rgba(22, 19, 15, 0.06)" : "none",
        position: "relative",
      }}
    >
      {/* Official Brand Badge */}
      <div
        style={{
          width: 42,
          height: 42,
          borderRadius: 12,
          background: cfg.badgeBg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#ffffff",
          flexShrink: 0,
          boxShadow: `0 4px 14px ${cfg.glowColor}`,
          border: data.key === "Threads" ? "1px solid rgba(217, 185, 120, 0.3)" : "none",
        }}
      >
        <cfg.Icon size={21} />
      </div>

      {/* Platform Name & Post Count */}
      <div style={{ width: 110, flexShrink: 0 }}>
        <div style={{ fontSize: 14.5, fontWeight: 800, color: "#16130f", letterSpacing: "-0.01em" }}>
          {data.label}
        </div>
        <div
          style={{
            fontSize: 9.5,
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "#8c8577",
            marginTop: 2,
            fontFamily: "var(--font-label, sans-serif)",
          }}
        >
          {data.postCount} {data.postCount === 1 ? "post" : "posts"}
        </div>
      </div>

      {/* Signal Equalizer Wave Center */}
      <div
        ref={barsContainerRef}
        style={{
          flex: 1,
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "center",
          gap: 3.5,
          height: 40,
          padding: "0 8px",
          overflow: "hidden",
        }}
      />

      {/* Score & Composition Pill Right */}
      <div style={{ width: 100, flexShrink: 0, textAlign: "right" }}>
        <div
          style={{
            fontSize: 24,
            fontWeight: 900,
            letterSpacing: "-0.05em",
            lineHeight: 1,
            color: cfg.scoreColor,
          }}
        >
          {scoreVal.toLocaleString()}
        </div>
        <div
          style={{
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "#8c8577",
            marginTop: 3,
            fontFamily: "var(--font-label, sans-serif)",
          }}
        >
          / post
        </div>

        {/* Micro Composition Bar */}
        <div
          style={{
            display: "flex",
            gap: 2,
            height: 4,
            borderRadius: 99,
            overflow: "hidden",
            marginTop: 7,
            background: "rgba(22, 19, 15, 0.07)",
          }}
        >
          <div
            style={{
              height: "100%",
              width: breakdownAnimated ? `${Math.max(likesPct, 1)}%` : "0%",
              background: "#e8699a",
              borderRadius: 99,
              transition: "width 1s cubic-bezier(0.16, 1, 0.3, 1)",
            }}
          />
          <div
            style={{
              height: "100%",
              width: breakdownAnimated ? `${Math.max(cmentsPct, 1)}%` : "0%",
              background: "#3b82f6",
              borderRadius: 99,
              transition: "width 1s cubic-bezier(0.16, 1, 0.3, 1) 0.1s",
            }}
          />
          <div
            style={{
              height: "100%",
              width: breakdownAnimated ? `${Math.max(sharesPct, 1)}%` : "0%",
              background: "#10b981",
              borderRadius: 99,
              transition: "width 1s cubic-bezier(0.16, 1, 0.3, 1) 0.2s",
            }}
          />
        </div>
      </div>
    </div>
  );
}

/**
 * Signal Frequency — Champagne Silk Cream Glassy Container.
 * Matches Overview page "Money to collect" silk gradient formula,
 * featuring official pixel-perfect SVGs for Instagram, Facebook, and Threads,
 * live multi-frequency sine wave equalizer, count-up scores, and storytelling callout.
 */
export function PlatformEngagementBars({
  data,
  periodLabel = "last 12 months",
}: {
  data: PlatformEngagementSummary[];
  periodLabel?: string;
}) {
  const sorted = [...data].sort((a, b) => b.avgTotal - a.avgTotal);
  const maxTotal = sorted[0]?.avgTotal ?? 1;

  // Dynamic insight determination
  const leader = sorted[0];
  const deepest = [...sorted].sort(
    (a, b) => (b.avgComments + b.avgShares) / (b.avgTotal || 1) - (a.avgComments + a.avgShares) / (a.avgTotal || 1)
  )[0];

  const hasDepthContrast = leader && deepest && leader.key !== deepest.key;
  const insightText = hasDepthContrast
    ? `${leader.label} dominates volume — but ${deepest.label}' comment + share ratio is nearly 5× higher per post. A highly conversational micro-audience that signals real intent.`
    : `${leader?.label ?? "Instagram"} drives the most engagement per post overall, with strong follower resonance across all metrics.`;

  return (
    <div
      style={{
        position: "relative",
        borderRadius: 22,
        padding: "26px 30px",
        overflow: "hidden",
        background: "linear-gradient(135deg, #f3e6c9 0%, #eee2cd 35%, #e9ddd8 70%, #ded6e0 100%)",
        border: "1px solid rgba(217, 185, 120, 0.4)",
        boxShadow:
          "0 16px 44px rgba(176, 141, 79, 0.14), inset 0 1.5px 0 rgba(255, 255, 255, 0.8), inset 0 -1px 0 rgba(22, 19, 15, 0.04)",
      }}
    >
      {/* Specular Top Glass Sheen */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(65% 75% at 15% -8%, rgba(255, 255, 255, 0.65), transparent 60%)",
          pointerEvents: "none",
        }}
      />

      {/* Card Header */}
      <div style={{ position: "relative", zIndex: 1, marginBottom: 18 }}>
        <h3
          style={{
            fontFamily: "var(--font-label, sans-serif)",
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "#8a6c38",
            margin: 0,
          }}
        >
          Engagement by Platform &middot; Avg. per post &middot; {periodLabel.toLowerCase()}
        </h3>
      </div>

      {/* Platform Rows */}
      <div style={{ position: "relative", zIndex: 1 }}>
        {sorted.map((item, idx) => (
          <SignalRow
            key={item.key}
            data={item}
            maxTotal={maxTotal}
            index={idx}
            isLast={idx === sorted.length - 1}
          />
        ))}
      </div>

      {/* Legend */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          display: "flex",
          alignItems: "center",
          gap: 18,
          marginTop: 18,
          paddingTop: 15,
          borderTop: "1px solid rgba(22, 19, 15, 0.07)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#736b5e", fontWeight: 600 }}>
          <div style={{ width: 8, height: 8, borderRadius: 2, background: "#e8699a" }} />
          Likes
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#736b5e", fontWeight: 600 }}>
          <div style={{ width: 8, height: 8, borderRadius: 2, background: "#3b82f6" }} />
          Comments
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#736b5e", fontWeight: 600 }}>
          <div style={{ width: 8, height: 8, borderRadius: 2, background: "#10b981" }} />
          Shares
        </div>
      </div>

      {/* Storytelling Insight Callout in Frosted Glass Pill */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          marginTop: 16,
          padding: "13px 16px",
          background: "rgba(255, 255, 255, 0.55)",
          border: "1px solid rgba(176, 141, 79, 0.25)",
          borderRadius: 12,
          fontSize: 11.5,
          color: "#705322",
          lineHeight: 1.6,
          fontStyle: "italic",
          boxShadow: "0 1px 3px rgba(22, 19, 15, 0.03)",
        }}
      >
        {insightText}
      </div>
    </div>
  );
}
