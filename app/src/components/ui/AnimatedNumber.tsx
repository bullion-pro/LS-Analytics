import { useEffect, useRef, useState } from "react";
import { animate } from "motion/react";

/** Counts from the previous value to the next on change — a quiet "the dashboard is alive" signal. */
export function AnimatedNumber({
  value,
  format,
  className,
}: {
  value: number;
  format: (v: number) => string;
  className?: string;
}) {
  const [display, setDisplay] = useState(value);
  const prevValue = useRef(value);
  const prefersReducedMotion = useRef(
    typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches,
  );

  useEffect(() => {
    if (prefersReducedMotion.current) {
      setDisplay(value);
      prevValue.current = value;
      return;
    }
    const from = prevValue.current;
    const controls = animate(from, value, {
      duration: 0.7,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setDisplay(v),
    });
    prevValue.current = value;
    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return <span className={className}>{format(display)}</span>;
}
