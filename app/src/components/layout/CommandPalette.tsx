import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, Portal } from "@chakra-ui/react";
import { Search, CornerDownLeft, ArrowUp, ArrowDown } from "lucide-react";
import { PRIMARY_NAV, SECONDARY_NAV, type NavItem } from "@/lib/navigation";
import { useCommandPalette } from "@/store/commandPalette";

interface Result {
  item: NavItem;
  group: "Analytics" | "More analytics";
}

const ALL_RESULTS: Result[] = [
  ...PRIMARY_NAV.map((item): Result => ({ item, group: "Analytics" })),
  ...SECONDARY_NAV.map((item): Result => ({ item, group: "More analytics" })),
];

export function CommandPalette() {
  const isOpen = useCommandPalette((s) => s.isOpen);
  const toggle = useCommandPalette((s) => s.toggle);
  const close = useCommandPalette((s) => s.close);
  const navigate = useNavigate();

  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        toggle();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [toggle]);

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setActiveIndex(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [isOpen]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ALL_RESULTS;
    return ALL_RESULTS.filter((r) => r.item.label.toLowerCase().includes(q));
  }, [query]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  function go(result: Result) {
    navigate(result.item.to);
    close();
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const r = results[activeIndex];
      if (r) go(r);
    }
  }

  const rawGroups: { group: Result["group"]; items: Result[] }[] = [
    { group: "Analytics", items: results.filter((r) => r.group === "Analytics") },
    { group: "More analytics", items: results.filter((r) => r.group === "More analytics") },
  ];
  const groups = rawGroups.filter((g) => g.items.length > 0);

  let flatIndex = -1;

  return (
    <Dialog.Root open={isOpen} onOpenChange={(e) => !e.open && close()} placement="top">
      <Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-[var(--color-obsidian)]/35 backdrop-blur-[2px]" />
        <Dialog.Positioner className="fixed inset-0 z-50 flex justify-center pt-[14vh]">
          <Dialog.Content className="h-fit w-full max-w-[560px] overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-panel)]">
            <div className="flex items-center gap-3 border-b border-[var(--color-border)] px-4 py-3.5">
              <Search size={17} strokeWidth={1.75} className="shrink-0 text-[var(--color-ink-muted)]" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Search pages…"
                className="flex-1 bg-transparent text-[14.5px] text-[var(--color-ink)] outline-none placeholder:text-[var(--color-ink-muted)]"
              />
              <kbd className="rounded-[5px] border border-[var(--color-border-strong)] px-1.5 py-[1px] font-label text-[10px] font-medium text-[var(--color-ink-muted)]">
                esc
              </kbd>
            </div>

            <div className="max-h-[320px] overflow-y-auto p-1.5">
              {groups.length === 0 && (
                <div className="px-3 py-8 text-center text-[13px] text-[var(--color-ink-muted)]">No matching pages</div>
              )}
              {groups.map((g) => (
                <div key={g.group} className="mb-1 last:mb-0">
                  <div className="px-2.5 py-1.5 font-label text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-ink-muted)]">
                    {g.group}
                  </div>
                  {g.items.map((r) => {
                    flatIndex += 1;
                    const isActive = flatIndex === activeIndex;
                    const Icon = r.item.icon;
                    return (
                      <button
                        key={r.item.to}
                        type="button"
                        onMouseEnter={() => setActiveIndex(flatIndex)}
                        onClick={() => go(r)}
                        className={[
                          "flex w-full items-center gap-3 rounded-[10px] px-2.5 py-2.5 text-left text-[13.5px] transition-colors",
                          isActive
                            ? "bg-[var(--color-accent-light)] text-[var(--color-accent-dark)]"
                            : "text-[var(--color-ink-secondary)]",
                        ].join(" ")}
                      >
                        <Icon size={16} strokeWidth={1.6} className="shrink-0" />
                        <span className="flex-1 font-medium">{r.item.label}</span>
                        {r.item.preview && (
                          <span className="font-label text-[10.5px] text-[var(--color-ink-muted)]">Preview</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>

            <div className="flex items-center gap-4 border-t border-[var(--color-border)] px-4 py-2.5 font-label text-[11px] text-[var(--color-ink-muted)]">
              <span className="flex items-center gap-1.5">
                <ArrowUp size={11} strokeWidth={2} />
                <ArrowDown size={11} strokeWidth={2} />
                Navigate
              </span>
              <span className="flex items-center gap-1.5">
                <CornerDownLeft size={11} strokeWidth={2} />
                Select
              </span>
            </div>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}
