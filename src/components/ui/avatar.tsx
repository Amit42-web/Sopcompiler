import * as React from "react";

import { cn } from "@/lib/utils";

interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Full name used to derive the initials fallback. */
  name: string;
}

function initials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/**
 * Simple initials avatar (no image loading in Sprint 1–9 scope).
 */
const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  ({ className, name, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary",
        className
      )}
      {...props}
    >
      {initials(name)}
    </div>
  )
);
Avatar.displayName = "Avatar";

export { Avatar };
