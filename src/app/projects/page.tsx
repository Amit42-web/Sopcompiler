import type { Metadata } from "next";
import Link from "next/link";
import { Plus, FileText, MoreHorizontal, Clock } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type ProjectStatus = "Draft" | "Processing" | "Ready";

interface Project {
  id: string;
  name: string;
  description: string;
  sopCount: number;
  rules: number;
  status: ProjectStatus;
  updated: string;
}

// Sprint 1: static sample data to demonstrate the UI. No database yet.
const projects: Project[] = [
  {
    id: "onboarding",
    name: "Employee Onboarding",
    description: "HR onboarding procedures converted to approval rules.",
    sopCount: 4,
    rules: 18,
    status: "Ready",
    updated: "2 days ago",
  },
  {
    id: "refunds",
    name: "Refund Policy Engine",
    description: "Customer refund eligibility and escalation logic.",
    sopCount: 2,
    rules: 9,
    status: "Processing",
    updated: "5 hours ago",
  },
  {
    id: "compliance",
    name: "Compliance Checks",
    description: "Regulatory SOPs mapped to validation rules.",
    sopCount: 6,
    rules: 0,
    status: "Draft",
    updated: "1 week ago",
  },
];

const statusVariant: Record<
  ProjectStatus,
  "success" | "warning" | "secondary"
> = {
  Ready: "success",
  Processing: "warning",
  Draft: "secondary",
};

export const metadata: Metadata = {
  title: "Projects",
};

export default function ProjectsPage() {
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Projects"
        description="Organize your SOP conversions into rule-engine projects."
      >
        <Button>
          <Plus className="h-4 w-4" />
          New Project
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {projects.map((project) => (
          <Card key={project.id} className="flex flex-col">
            <CardHeader>
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-lg">{project.name}</CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  className="-mr-2 -mt-1 h-8 w-8"
                  aria-label="Project options"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </div>
              <CardDescription>{project.description}</CardDescription>
            </CardHeader>

            <CardContent className="flex-1">
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <FileText className="h-4 w-4" />
                  {project.sopCount} SOPs
                </span>
                <span>{project.rules} rules</span>
              </div>
            </CardContent>

            <CardFooter className="justify-between">
              <Badge variant={statusVariant[project.status]}>
                {project.status}
              </Badge>
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                {project.updated}
              </span>
            </CardFooter>
          </Card>
        ))}

        {/* Create-new card */}
        <Link
          href="/upload"
          className="group flex min-h-[180px] flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed text-center transition-colors hover:border-primary/50 hover:bg-accent/50"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary transition-transform group-hover:scale-110">
            <Plus className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-medium">Create a project</p>
            <p className="text-xs text-muted-foreground">
              Upload SOPs to get started
            </p>
          </div>
        </Link>
      </div>
    </div>
  );
}
