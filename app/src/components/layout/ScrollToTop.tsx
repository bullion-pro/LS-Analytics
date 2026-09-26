import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

/**
 * Resets the nearest scrollable ancestor to the top on every route change.
 * Place this as the first child inside the scroll container in App.tsx.
 */
export function ScrollToTop() {
  const { pathname } = useLocation();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let el: HTMLElement | null = ref.current?.parentElement ?? null;
    while (el) {
      if (el.scrollHeight > el.clientHeight && getComputedStyle(el).overflowY !== "visible") {
        el.scrollTop = 0;
        break;
      }
      el = el.parentElement;
    }
  }, [pathname]);

  return <div ref={ref} />;
}
