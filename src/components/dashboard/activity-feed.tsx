"use client";

import { useEffect, useState } from "react";
import {
  Upload,
  FileSearch,
  ListTree,
  Layers,
  BookOpen,
  Cpu,
  CheckCircle2,
  Download,
  RefreshCw,
  Pencil,
  Copy,
  Trash2,
  Loader2,
  type LucideIcon,
} from "lucide-react";

import { api } from "@/lib/api";
import type { ActivityItem, ActivityType } from "@/lib/types";
import { relativeTime } from "@/lib/format";

const ICONS: Record<ActivityType, LucideIcon> = {
  sop_uploaded: Upload,
  metadata_extracted: FileSearch,
  sections_detected: ListTree,
  scenarios_extracted: Layers,
  knowledge_base_built: BookOpen,
  rules_generated: Cpu,
  validation_completed: CheckCircle2,
  json_exported: Download,
  sop_reprocessed: RefreshCw,
  sop_renamed: Pencil,
  sop_duplicated: Copy,
  sop_deleted: Trash2,
};

export function ActivityFeed({ limit = 12 }: { limit?: number }) {
  const [items, setItems] = useState<ActivityItem[] | null>(null);

  useEffect(() => {
    let alive = true;
    api
      .activity(limit)
      .then((d) => alive && setItems(d))
      .catch(() => alive && setItems([]));
    return () => {
      alive = false;
    };
  }, [limit]);

  if (!items) {
    return (
      <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading…
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No activity yet.
      </p>
    );
  }

  return (
    <ol className="space-y-3">
      {items.map((item) => {
        const Icon = ICONS[item.type] ?? CheckCircle2;
        return (
          <li key={item.id} className="flex items-start gap-3">
            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <Icon className="h-3.5 w-3.5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm">{item.message}</p>
              <p className="text-xs text-muted-foreground">
                {relativeTime(item.created_at)}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
