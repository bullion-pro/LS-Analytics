import { Menu, Portal } from "@chakra-ui/react";
import { ChevronDown, Check, Settings, LogOut } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { BRANCHES, ORGANIZATION, CURRENT_USER } from "@/mock/dimensions";
import { PERIOD_PRESETS } from "@/mock/calendar";
import { useFilters } from "@/store/filters";
import { QuietTag } from "@/components/ui/QuietTag";

function DropdownTrigger({ label, value }: { label: string; value: string }) {
  return (
    <button
      type="button"
      className="flex items-center gap-2 px-[13px] py-[8px] text-left transition-colors hover:bg-[var(--color-surface-sunken)]"
    >
      <span className="font-label text-[9.5px] font-semibold uppercase tracking-[0.08em] text-[var(--color-ink-muted)]">
        {label}
      </span>
      <span className="text-[12.5px] font-medium text-[var(--color-ink)]">{value}</span>
      <ChevronDown size={12} strokeWidth={2} className="text-[var(--color-ink-muted)]" />
    </button>
  );
}

function BranchSwitcher() {
  const branch = useFilters((s) => s.branch);
  const setBranch = useFilters((s) => s.setBranch);
  const current = branch === "all" ? "All Branches" : BRANCHES.find((b) => b.id === branch)?.name ?? "All Branches";

  return (
    <Menu.Root positioning={{ placement: "bottom-start", gutter: 8 }}>
      <Menu.Trigger asChild>
        <div>
          <DropdownTrigger label="Branch" value={current} />
        </div>
      </Menu.Trigger>
      <Portal>
        <Menu.Positioner>
          <Menu.Content className="min-w-[220px] rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-1.5 shadow-[var(--shadow-card)] z-30">
            <Menu.Item
              value="all"
              onClick={() => setBranch("all")}
              className="flex cursor-pointer items-center justify-between rounded-lg px-2.5 py-2 text-[13px] text-[var(--color-ink)] outline-none data-[highlighted]:bg-[var(--color-surface-sunken)]"
            >
              All Branches
              {branch === "all" && <Check size={15} strokeWidth={2.5} className="text-[var(--color-accent-dark)]" />}
            </Menu.Item>
            <div className="my-1 h-px bg-[var(--color-border)]" />
            {BRANCHES.map((b) => (
              <Menu.Item
                key={b.id}
                value={b.id}
                onClick={() => setBranch(b.id)}
                className="flex cursor-pointer items-center justify-between rounded-lg px-2.5 py-2 text-[13px] text-[var(--color-ink)] outline-none data-[highlighted]:bg-[var(--color-surface-sunken)]"
              >
                <span>
                  {b.name}
                  <span className="ml-1.5 font-label text-[11px] text-[var(--color-ink-muted)]">{b.city}</span>
                </span>
                {branch === b.id && <Check size={15} strokeWidth={2.5} className="text-[var(--color-accent-dark)]" />}
              </Menu.Item>
            ))}
          </Menu.Content>
        </Menu.Positioner>
      </Portal>
    </Menu.Root>
  );
}

function PeriodPicker() {
  const period = useFilters((s) => s.period);
  const setPeriod = useFilters((s) => s.setPeriod);
  const current = PERIOD_PRESETS.find((p) => p.id === period)?.label ?? "Last 12 Months";

  return (
    <Menu.Root positioning={{ placement: "bottom-start", gutter: 8 }}>
      <Menu.Trigger asChild>
        <div>
          <DropdownTrigger label="Period" value={current} />
        </div>
      </Menu.Trigger>
      <Portal>
        <Menu.Positioner>
          <Menu.Content className="min-w-[200px] rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-1.5 shadow-[var(--shadow-card)] z-30">
            {PERIOD_PRESETS.map((p) => (
              <Menu.Item
                key={p.id}
                value={p.id}
                onClick={() => setPeriod(p.id)}
                className="flex cursor-pointer items-center justify-between rounded-lg px-2.5 py-2 text-[13px] text-[var(--color-ink)] outline-none data-[highlighted]:bg-[var(--color-surface-sunken)]"
              >
                {p.label}
                {period === p.id && <Check size={15} strokeWidth={2.5} className="text-[var(--color-accent-dark)]" />}
              </Menu.Item>
            ))}
          </Menu.Content>
        </Menu.Positioner>
      </Portal>
    </Menu.Root>
  );
}

function AccountMenuItem({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <Menu.Item
      value={label}
      disabled
      className="flex cursor-not-allowed items-center justify-between rounded-lg px-2.5 py-2 text-[13px] text-[var(--color-ink-secondary)] outline-none data-[disabled]:opacity-60"
    >
      <span className="flex items-center gap-2.5">
        <Icon size={15} strokeWidth={1.75} />
        {label}
      </span>
      <QuietTag>Soon</QuietTag>
    </Menu.Item>
  );
}

function AccountMenu() {
  return (
    <Menu.Root positioning={{ placement: "bottom-end", gutter: 10 }}>
      <Menu.Trigger asChild>
        <button
          type="button"
          className="flex items-center gap-2.5 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] py-1 pl-1.5 pr-3 shadow-[0_1px_2px_rgba(22,19,15,0.05)] transition-all hover:border-[var(--color-accent)] cursor-pointer text-left"
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-obsidian)] font-label text-[11px] font-bold text-[var(--color-accent-on-obsidian)]">
            {CURRENT_USER.initials}
          </div>
          <div className="hidden xl:block leading-tight text-left">
            <div className="text-[12px] font-semibold text-[var(--color-ink)]">{CURRENT_USER.name}</div>
            <div className="font-label text-[9.5px] font-medium text-[var(--color-ink-muted)]">
              {CURRENT_USER.role} · {ORGANIZATION.name}
            </div>
          </div>
          <ChevronDown size={12} strokeWidth={2} className="text-[var(--color-ink-muted)]" />
        </button>
      </Menu.Trigger>
      <Portal>
        <Menu.Positioner>
          <Menu.Content className="min-w-[210px] rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-1.5 shadow-[var(--shadow-card)] z-30">
            <div className="px-2.5 py-2">
              <div className="text-[13px] font-medium text-[var(--color-ink)]">{CURRENT_USER.name}</div>
              <div className="font-label text-[11px] text-[var(--color-ink-muted)]">
                {CURRENT_USER.role} · {ORGANIZATION.name}
              </div>
            </div>
            <div className="my-1 h-px bg-[var(--color-border)]" />
            <AccountMenuItem icon={Settings} label="Settings" />
            <div className="my-1 h-px bg-[var(--color-border)]" />
            <AccountMenuItem icon={LogOut} label="Sign out" />
          </Menu.Content>
        </Menu.Positioner>
      </Portal>
    </Menu.Root>
  );
}

/**
 * Clean two-zone header:
 * Left: page title + quiet subtitle.
 * Right: branch/period filter pill + executive account chip.
 */
export function TopBar({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header className="sticky top-0 z-20 flex h-[80px] shrink-0 items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-canvas)]/90 backdrop-blur-md px-8">
      {/* Left: Page Title */}
      <div>
        <h1 className="text-[24px] font-semibold leading-none tracking-[-0.022em] text-[var(--color-ink)]">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1.5 font-label text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-ink-muted)]">
            {subtitle}
          </p>
        )}
      </div>

      {/* Right: Filters + Account */}
      <div className="flex items-center gap-3">
        <div className="flex items-stretch overflow-hidden rounded-[10px] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[0_1px_2px_rgba(22,19,15,0.05)]">
          <BranchSwitcher />
          <div className="w-px bg-[var(--color-border)]" />
          <PeriodPicker />
        </div>
        <AccountMenu />
      </div>
    </header>
  );
}
