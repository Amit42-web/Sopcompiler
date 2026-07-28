import {
  LayoutDashboard,
  FolderKanban,
  Library,
  Upload,
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
 * Shared by the desktop sidebar and the mobile navigation drawer.
 */
export const navItems: NavItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    description: "Live workspace overview",
  },
  {
    title: "Projects",
    href: "/projects",
    icon: FolderKanban,
    description: "Browse and manage projects",
  },
  {
    title: "SOP Library",
    href: "/library",
    icon: Library,
    description: "Every uploaded SOP",
  },
  {
    title: "Upload SOP",
    href: "/upload",
    icon: Upload,
    description: "Import SOP documents",
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
    description: "Workspace preferences",
  },
];
