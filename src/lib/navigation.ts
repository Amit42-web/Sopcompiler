import {
  LayoutDashboard,
  Upload,
  FolderKanban,
  Braces,
  Users,
  Settings,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  description: string;
}

/**
 * Primary application navigation.
 * Shared by the desktop sidebar and the mobile navigation drawer
 * so both stay in sync from a single source of truth.
 */
export const navItems: NavItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    description: "Overview of your RuleForge workspace",
  },
  {
    title: "Projects",
    href: "/projects",
    icon: FolderKanban,
    description: "Manage your rule-engine projects",
  },
  {
    title: "Upload SOP",
    href: "/upload",
    icon: Upload,
    description: "Import SOP documents for rule extraction",
  },
  {
    title: "Rule Builder",
    href: "/rules",
    icon: Braces,
    description: "Review and edit generated rules",
  },
  {
    title: "Team",
    href: "/team",
    icon: Users,
    description: "Manage members and access",
  },
  {
    title: "Settings",
    href: "/settings",
    icon: Settings,
    description: "Configure your workspace preferences",
  },
];
