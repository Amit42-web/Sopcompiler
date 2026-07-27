import Link from "next/link";
import {
  Upload,
  FolderKanban,
  FileText,
  Cpu,
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

const stats = [
  { label: "SOPs Uploaded", value: "0", icon: FileText },
  { label: "Active Projects", value: "0", icon: FolderKanban },
  { label: "Rules Generated", value: "0", icon: Cpu },
  { label: "Completed Runs", value: "0", icon: CheckCircle2 },
];

const quickActions = [
  {
    title: "Upload an SOP",
    description: "Import a document to begin extracting rules.",
    href: "/upload",
    icon: Upload,
  },
  {
    title: "Browse Projects",
    description: "Review and manage your rule-engine projects.",
    href: "/projects",
    icon: FolderKanban,
  },
];

export default function DashboardPage() {
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Dashboard"
        description="Welcome to RuleForge AI — turn your SOPs into executable rules."
      >
        <Button asChild>
          <Link href="/upload">
            <Upload className="h-4 w-4" />
            Upload SOP
          </Link>
        </Button>
      </PageHeader>

      {/* Stats */}
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

      {/* Quick actions */}
      <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2">
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <Card key={action.href} className="group transition-shadow hover:shadow-md">
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

      {/* Recent activity (empty state) */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>
            Your latest SOP conversions will appear here.
          </CardDescription>
        </CardHeader>
        <CardContent>
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
            <Badge variant="secondary" className="mt-1">
              Sprint 1 · UI Preview
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
