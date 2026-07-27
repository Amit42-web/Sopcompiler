import {
  LayoutDashboard,
  Upload,
  FolderKanban,
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
    href: "/",
    icon: LayoutDashboard,
    description: "Overview of your RuleForge workspace",
  },
  {
    title: "Upload SOP",
    href: "/upload",
    icon: Upload,
    description: "Import SOP documents for rule extraction",
  },
  {
    title: "Projects",
    href: "/projects",
    icon: FolderKanban,
    description: "Manage your rule-engine projects",
  },
  {
    title: "Settings",
    href: "/settings",
    icon: Settings,
    description: "Configure your workspace preferences",
  },
];
