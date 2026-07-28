"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ExternalLink,
  RefreshCw,
  Pencil,
  Copy,
  Trash2,
  Download,
  Loader2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import type { LibraryRow } from "@/lib/types";

interface SopActionsProps {
  row: LibraryRow;
  /** Called after a mutating action so the caller can refresh its data. */
  onChanged?: () => void;
}

/**
 * Row actions for a stored SOP: Open, Reprocess, Rename, Duplicate, Delete,
 * Download Rule JSON. Mutations refresh the caller optimistically.
 */
export function SopActions({ row, onChanged }: SopActionsProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    try {
      await fn();
      onChanged?.();
    } catch {
      // Surface minimally; the list refresh will reflect true state.
    } finally {
      setBusy(false);
    }
  }

  function reprocess() {
    void run(() => api.reprocessFile(row.id));
  }
  function rename() {
    const name = window.prompt("Rename SOP", row.filename);
    if (name && name.trim() && name !== row.filename) {
      void run(() => api.renameFile(row.id, name.trim()));
    }
  }
  function duplicate() {
    void run(() => api.duplicateFile(row.id));
  }
  function remove() {
    if (window.confirm(`Delete “${row.filename}”? This cannot be undone.`)) {
      void run(() => api.deleteFile(row.id));
    }
  }

  const iconBtn = "h-8 w-8";

  return (
    <div className="flex items-center justify-end gap-0.5">
      <Button
        variant="ghost"
        size="icon"
        className={iconBtn}
        title="Open project"
        aria-label="Open"
        onClick={() => router.push(`/projects/${row.project_id}`)}
      >
        <ExternalLink className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className={iconBtn}
        title="Reprocess"
        aria-label="Reprocess"
        disabled={busy}
        onClick={reprocess}
      >
        {busy ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <RefreshCw className="h-4 w-4" />
        )}
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className={iconBtn}
        title="Rename"
        aria-label="Rename"
        disabled={busy}
        onClick={rename}
      >
        <Pencil className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className={iconBtn}
        title="Duplicate"
        aria-label="Duplicate"
        disabled={busy}
        onClick={duplicate}
      >
        <Copy className="h-4 w-4" />
      </Button>
      <a
        href={api.exportFileUrl(row.id)}
        title="Download Rule JSON"
        aria-label="Download Rule JSON"
        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-sm hover:bg-accent hover:text-accent-foreground"
      >
        <Download className="h-4 w-4" />
      </a>
      <Button
        variant="ghost"
        size="icon"
        className={iconBtn}
        title="Delete"
        aria-label="Delete"
        disabled={busy}
        onClick={remove}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
