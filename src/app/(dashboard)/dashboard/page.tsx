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

const stats = [
  { label: "SOPs Uploaded", value: "12", icon: FileText },
  { label: "Scenarios Extracted", value: "48", icon: Layers },
  { label: "Rules Generated", value: "27", icon: Cpu },
  { label: "Completed Runs", value: "9", icon: CheckCircle2 },
];

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

const activity = [
  { title: "Refund Policy SOP", detail: "9 rules generated", time: "5h ago" },
  { title: "Employee Onboarding SOP", detail: "4 documents parsed", time: "2d ago" },
  { title: "Compliance Checks SOP", detail: "12 scenarios extracted", time: "1w ago" },
];

export default function DashboardPage() {
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
          {activity.map((item) => (
            <div
              key={item.title}
              className="flex items-center justify-between rounded-lg px-2 py-3 hover:bg-accent/50"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <FileText className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-medium">{item.title}</p>
                  <p className="text-xs text-muted-foreground">{item.detail}</p>
                </div>
              </div>
              <Badge variant="secondary">{item.time}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
