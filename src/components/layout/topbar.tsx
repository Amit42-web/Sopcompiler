import { Bell, Search, CircleUser } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MobileNav } from "@/components/layout/mobile-nav";

/**
 * Top navigation bar. Contains the mobile menu trigger, a search field,
 * and account-level actions.
 */
export function Topbar() {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:px-6">
      <MobileNav />

      <div className="relative hidden flex-1 sm:block sm:max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search SOPs, projects, rules..."
          className="pl-9"
        />
      </div>

      <div className="ml-auto flex items-center gap-2">
        <Button variant="ghost" size="icon" aria-label="Notifications">
          <Bell className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon" aria-label="Account">
          <CircleUser className="h-5 w-5" />
        </Button>
      </div>
    </header>
  );
}
