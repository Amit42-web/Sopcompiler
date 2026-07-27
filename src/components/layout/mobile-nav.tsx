"use client";

import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Logo } from "@/components/layout/logo";
import { SidebarNav } from "@/components/layout/sidebar-nav";

/**
 * Mobile navigation. Renders a hamburger trigger that opens a slide-in
 * drawer reusing the same SidebarNav as the desktop sidebar.
 */
export function MobileNav() {
  const [open, setOpen] = useState(false);

  // Prevent background scroll while the drawer is open.
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <div className="md:hidden">
      <Button
        variant="ghost"
        size="icon"
        aria-label="Open navigation menu"
        onClick={() => setOpen(true)}
      >
        <Menu className="h-5 w-5" />
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer */}
          <div className="absolute inset-y-0 left-0 flex w-72 max-w-[80%] flex-col border-r bg-card shadow-xl">
            <div className="flex h-16 items-center justify-between border-b px-6">
              <Logo />
              <Button
                variant="ghost"
                size="icon"
                aria-label="Close navigation menu"
                onClick={() => setOpen(false)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto py-4">
              <SidebarNav onNavigate={() => setOpen(false)} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
