"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  FileText,
  FolderKanban,
  Layers,
  Cpu,
  BookOpen,
  Gauge,
  Clock,
  Upload,
  Loader2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/status-badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { api } from "@/lib/api";
import type { DashboardStats } from "@/lib/types";
import { relativeTime } from "@/lib/format";

export function DashboardView() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    api
      .dashboard()
      .then((d) => alive && setStats(d))
      .catch(() => {})
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-20 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading workspace…
      </div>
    );
  }

  const s = stats;
  const cards = [
    { label: "Total Projects", value: s?.total_projects ?? 0, icon: FolderKanban },
    { label: "SOPs Uploaded", value: s?.total_sops ?? 0, icon: FileText },
    { label: "Scenarios Extracted", value: s?.total_scenarios ?? 0, icon: Layers },
    { label: "Rules Generated", value: s?.total_rules ?? 0, icon: Cpu },
    { label: "Knowledge Base Entries", value: s?.total_kb_entries ?? 0, icon: BookOpen },
    {
      label: "Pipeline Success Rate",
      value: `${s?.pipeline_success_rate ?? 100}%`,
      icon: Gauge,
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex justify-end">
        <Button asChild>
          <Link href="/upload">
            <Upload className="h-4 w-4" />
            Upload SOP
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <Card key={c.label}>
              <CardContent className="flex items-center justify-between p-5">
                <div>
                  <p className="text-sm text-muted-foreground">{c.label}</p>
                  <p className="mt-1 text-2xl font-bold tracking-tight">
                    {c.value}
                  </p>
                </div>
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </span>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Clock className="h-4 w-4" />
        Last processing time:{" "}
        <span className="font-medium text-foreground">
          {s?.last_processing_time
            ? relativeTime(s.last_processing_time)
            : "no runs yet"}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recently Processed SOPs</CardTitle>
            <CardDescription>Your latest completed documents.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1">
            {!s || s.recently_processed.length === 0 ? (
              <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed py-10 text-center">
                <FileText className="h-6 w-6 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Nothing processed yet.
                </p>
                <Button asChild size="sm">
                  <Link href="/upload">
                    <Upload className="h-4 w-4" />
                    Upload SOP
                  </Link>
                </Button>
              </div>
            ) : (
              s.recently_processed.map((f) => (
                <Link
                  key={f.id}
                  href={`/projects/${f.project_id}`}
                  className="flex items-center justify-between rounded-lg px-2 py-3 hover:bg-accent/50"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                      <FileText className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {f.filename}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {f.project_name} · {f.scenario_count} scenarios
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <StatusBadge status={f.status} />
                    <Badge variant="secondary">
                      {relativeTime(f.processed_at)}
                    </Badge>
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Everything happening in your workspace.</CardDescription>
          </CardHeader>
          <CardContent>
            <ActivityFeed />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
