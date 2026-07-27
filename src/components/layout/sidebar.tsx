import { Sparkles } from "lucide-react";

import { Logo } from "@/components/layout/logo";
import { SidebarNav } from "@/components/layout/sidebar-nav";

/**
 * Desktop left sidebar. Hidden on small screens (see MobileNav for mobile).
 */
export function Sidebar() {
  return (
    <aside className="hidden w-64 shrink-0 border-r bg-card md:flex md:flex-col">
      <div className="flex h-16 items-center border-b px-6">
        <Logo />
      </div>

      <div className="flex-1 overflow-y-auto py-4">
        <p className="px-6 pb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Workspace
        </p>
        <SidebarNav />
      </div>

      <div className="border-t p-4">
        <div className="rounded-lg bg-primary/5 p-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Sparkles className="h-4 w-4 text-primary" />
            RuleForge AI
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            AI-powered SOP to Rule Engine conversion.
          </p>
        </div>
      </div>
    </aside>
  );
}
