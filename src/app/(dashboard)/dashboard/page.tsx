import Link from "next/link";
import {
  Upload,
  Braces,
  FileText,
  Cpu,
  Layers,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { store } from "@/server/store";

// Always render with the current in-memory data (never statically cached).
export const dynamic = "force-dynamic";

const quickActions = [
  {
    title: "Upload an SOP",
    description: "Add a document to begin extracting rules.",
    href: "/upload",
    icon: Upload,
  },
  {
    title: "Open Rule Builder",
    description: "Review, edit, validate, and export your rules.",
    href: "/rules",
    icon: Braces,
  },
];

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function DashboardPage() {
  const s = store.getStats();
  const activity = store.getRecentActivity();

  const stats = [
    { label: "SOPs Uploaded", value: s.sopsUploaded, icon: FileText },
    { label: "Scenarios Extracted", value: s.scenariosExtracted, icon: Layers },
    { label: "Rules Generated", value: s.rulesGenerated, icon: Cpu },
    { label: "Completed Runs", value: s.completedRuns, icon: CheckCircle2 },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Dashboard"
        description="Welcome back — here's what's happening in your workspace."
      >
        <Button asChild>
          <Link href="/upload">
            <Upload className="h-4 w-4" />
            Upload SOP
          </Link>
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <CardContent className="flex items-center justify-between p-6">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="mt-1 text-3xl font-bold tracking-tight">
                    {stat.value}
                  </p>
                </div>
                <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </span>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2">
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <Card
              key={action.href}
              className="group transition-shadow hover:shadow-md"
            >
              <CardHeader>
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div>
                    <CardTitle>{action.title}</CardTitle>
                    <CardDescription>{action.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Button asChild variant="ghost" className="px-0 text-primary">
                  <Link href={action.href}>
                    Get started
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Your latest SOP conversions.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-1">
          {activity.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed py-12 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <FileText className="h-6 w-6" />
              </span>
              <div>
                <p className="font-medium">No activity yet</p>
                <p className="text-sm text-muted-foreground">
                  Upload your first SOP to get started.
                </p>
              </div>
              <Button asChild size="sm">
                <Link href="/upload">
                  <Upload className="h-4 w-4" />
                  Upload SOP
                </Link>
              </Button>
            </div>
          ) : (
            activity.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-lg px-2 py-3 hover:bg-accent/50"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <FileText className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{item.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.detail}
                    </p>
                  </div>
                </div>
                <Badge variant="secondary">{relativeTime(item.time)}</Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
