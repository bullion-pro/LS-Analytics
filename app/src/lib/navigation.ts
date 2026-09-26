import { LayoutDashboard, TrendingUp, Gem, Truck, Landmark, Users, Workflow, MessageCircle } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
  /** The analytics view isn't built here yet — but the underlying business data
   *  already exists and is live in Aurify LS (see project memory: ls-modules-mapping).
   *  This never means the domain itself doesn't exist, only that this dashboard doesn't yet. */
  preview?: boolean;
}

/** Shipped analytics domains — shared between the sidebar and the command palette.
 *  "Pipeline" (LS's CRM funnel: Leads/Opportunities/Tasks/Communication) is a
 *  deliberately separate domain from Customers — LS itself keeps them as two
 *  unrelated modules. See ls-modules-mapping memory. */
export const PRIMARY_NAV: NavItem[] = [
  { to: "/", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/sales", label: "Sales", icon: TrendingUp },
  { to: "/inventory", label: "Inventory", icon: Gem },
  { to: "/supplier", label: "Supplier", icon: Truck },
  { to: "/finance", label: "Finance", icon: Landmark },
  { to: "/customers", label: "Customers", icon: Users },
  { to: "/pipeline", label: "Pipeline", icon: Workflow },
  { to: "/engagement", label: "Engagement", icon: MessageCircle },
];

/** Nothing currently in preview — every LS domain scoped into lsanalytics' sidebar has a built dashboard. */
export const SECONDARY_NAV: NavItem[] = [];
