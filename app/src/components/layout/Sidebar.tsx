import { NavLink } from "react-router-dom";
import { LSMark } from "@/components/ui/LSMark";
import { PRIMARY_NAV, SECONDARY_NAV, type NavItem } from "@/lib/navigation";

const ALL_NAV: NavItem[] = [...PRIMARY_NAV, ...SECONDARY_NAV];
const SIDEBAR_WIDTH = 92;

function PillNavRow({ item }: { item: NavItem }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      end={item.end}
      className={({ isActive }) =>
        [
          "group/tip group relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors duration-150",
          isActive
            ? "bg-[var(--color-accent-on-obsidian)]/[0.16] text-[var(--color-accent-on-obsidian)]"
            : "text-[var(--color-on-obsidian-secondary)] hover:bg-white/[0.06] hover:text-[var(--color-on-obsidian)]",
        ].join(" ")
      }
    >
      <Icon size={18} strokeWidth={1.6} className="shrink-0" />
      {item.preview && (
        <span className="absolute right-1.5 top-1.5 h-[5px] w-[5px] rounded-full bg-[var(--color-on-obsidian-muted)]" />
      )}
      <span className="pointer-events-none absolute left-full top-1/2 z-30 ml-3 -translate-y-1/2 whitespace-nowrap rounded-[6px] bg-[var(--color-obsidian)] px-2.5 py-1.5 text-[12px] font-medium text-[var(--color-on-obsidian)] opacity-0 shadow-[var(--shadow-panel)] transition-opacity delay-300 duration-150 group-hover/tip:opacity-100 group-focus-visible/tip:opacity-100">
        {item.label}
        {item.preview && <span className="ml-1.5 text-[var(--color-on-obsidian-muted)]">· Preview</span>}
      </span>
    </NavLink>
  );
}

export function Sidebar() {
  return (
    <aside
      style={{ width: SIDEBAR_WIDTH }}
      className="relative flex h-screen shrink-0 flex-col items-start justify-center bg-[var(--color-canvas)] pl-[14px]"
    >
      <div className="flex flex-col items-center rounded-full border border-[var(--color-obsidian-border)] bg-[var(--color-obsidian)] px-[9px] py-4 shadow-[var(--shadow-panel)]">
        <div className="flex h-9 w-9 items-center justify-center">
          <LSMark size={18} variant="light" />
        </div>
        <div className="my-3 h-px w-6 bg-[var(--color-obsidian-border)]" />
        <div className="flex flex-col items-center gap-1">
          {ALL_NAV.map((item) => (
            <PillNavRow key={item.to} item={item} />
          ))}
        </div>
      </div>
    </aside>
  );
}
