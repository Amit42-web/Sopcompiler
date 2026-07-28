"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { FileText, Clock, ArrowRight, Upload, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { Pagination } from "@/components/ui/pagination";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { api } from "@/lib/api";
import type { Paginated, ProjectSummary } from "@/lib/types";
import { relativeTime } from "@/lib/format";

export function ProjectsView() {
  const [data, setData] = useState<Paginated<ProjectSummary> | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const load = useCallback((p: number) => {
    setLoading(true);
    api
      .listProjects({ page: p, pageSize: 12 })
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load(page);
  }, [page, load]);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center gap-2 py-20 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading projects…
      </div>
    );
  }

  if (!data || data.total === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-20 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Upload className="h-6 w-6" />
        </span>
        <p className="font-medium">No projects yet</p>
        <p className="text-sm text-muted-foreground">
          Upload an SOP to create your first project.
        </p>
        <Button asChild>
          <Link href="/upload">
            <Upload className="h-4 w-4" />
            Upload SOP
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data.items.map((p) => (
          <Card key={p.id} className="flex flex-col">
            <CardHeader>
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-lg">{p.name}</CardTitle>
                <StatusBadge status={p.status} />
              </div>
              <CardDescription>
                {p.department ? `${p.department} · ` : ""}
                {p.description || "No description"}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <FileText className="h-4 w-4" />
                  {p.file_count} SOPs
                </span>
                <span>{p.scenario_count} scenarios</span>
                <span>{p.rule_count} rules</span>
              </div>
            </CardContent>
            <CardFooter className="justify-between">
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                {relativeTime(p.updated_at)}
              </span>
              <Button asChild variant="ghost" size="sm" className="text-primary">
                <Link href={`/projects/${p.id}`}>
                  Open
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
      <Pagination
        page={data.page}
        totalPages={data.total_pages}
        total={data.total}
        onPageChange={setPage}
      />
    </div>
  );
}
