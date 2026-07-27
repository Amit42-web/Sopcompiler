import Link from "next/link";
import { Workflow } from "lucide-react";

import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  href?: string;
}

/**
 * RuleForge AI brand mark. Links back to the dashboard by default.
 */
export function Logo({ className, href = "/" }: LogoProps) {
  return (
    <Link
      href={href}
      className={cn("flex items-center gap-2 font-semibold", className)}
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <Workflow className="h-5 w-5" />
      </span>
      <span className="text-base tracking-tight">
        RuleForge<span className="text-primary"> AI</span>
      </span>
    </Link>
  );
}
