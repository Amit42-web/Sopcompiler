"use client";

import { useState } from "react";
import { FileText, Trash2, Download, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { SopDropzone } from "@/components/upload/sop-dropzone";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { SopFile } from "@/lib/types";

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileExtension(name: string): string {
  const parts = name.split(".");
  return parts.length > 1 ? parts[parts.length - 1].toUpperCase() : "FILE";
}

/**
 * File management surface for a project (Sprint 2).
 * Lists existing files with status and actions, and lets the user stage
 * new uploads locally. Wiring to the backend upload API is a drop-in swap.
 */
export function FileManager({ initialFiles }: { initialFiles: SopFile[] }) {
  const [files, setFiles] = useState<SopFile[]>(initialFiles);

  function removeFile(id: string) {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }

  function addLocalFiles(local: { name: string; size: number }[]) {
    const now = new Date().toISOString();
    const mapped: SopFile[] = local.map((f, i) => ({
      id: `local-${Date.now()}-${i}`,
      project_id: initialFiles[0]?.project_id ?? "local",
      filename: f.name,
      content_type: "application/octet-stream",
      size_bytes: f.size,
      status: "uploaded",
      created_at: now,
    }));
    setFiles((prev) => [...prev, ...mapped]);
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-0">
          {files.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <FileText className="h-6 w-6" />
              </span>
              <p className="font-medium">No files yet</p>
              <p className="text-sm text-muted-foreground">
                Add an SOP document below to get started.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Document</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {files.map((file) => (
                  <TableRow key={file.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <span className="truncate">{file.filename}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {fileExtension(file.filename)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatSize(file.size_bytes)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={file.status} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Reprocess"
                          title="Reprocess"
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Download"
                          title="Download"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Remove ${file.filename}`}
                          title="Remove"
                          onClick={() => removeFile(file.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <SopDropzone onFilesAdded={addLocalFiles} />
    </div>
  );
}
