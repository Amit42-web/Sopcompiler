import type { Metadata } from "next";
import Link from "next/link";
import { Plus, FileText, Clock, ArrowRight } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { sampleProjects } from "@/lib/sample-data";

export const metadata: Metadata = {
  title: "Projects",
};

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "1 day ago";
  if (days < 7) return `${days} days ago`;
  return `${Math.floor(days / 7)}w ago`;
}

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
        {sampleProjects.map((project) => (
          <Card key={project.id} className="flex flex-col">
            <CardHeader>
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-lg">{project.name}</CardTitle>
                <StatusBadge status={project.status} />
              </div>
              <CardDescription>{project.description}</CardDescription>
            </CardHeader>

            <CardContent className="flex-1">
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <FileText className="h-4 w-4" />
                  {project.file_count} SOPs
                </span>
                <span>{project.rule_count} rules</span>
              </div>
            </CardContent>

            <CardFooter className="justify-between">
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                {relativeTime(project.updated_at)}
              </span>
              <Button asChild variant="ghost" size="sm" className="text-primary">
                <Link href={`/projects/${project.id}`}>
                  Open
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </CardFooter>
          </Card>
        ))}

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
