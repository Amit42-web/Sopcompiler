"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  AlertTriangle,
  Braces,
  FileText,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SopDropzone } from "@/components/upload/sop-dropzone";
import { api } from "@/lib/api";
import type { Scenario, SopFile } from "@/lib/types";

interface Result {
  processed: number;
  scenarios: Scenario[];
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * End-to-end upload flow. Uploads each document into the workspace, runs the
 * AI pipeline, and shows the extracted scenarios. Also renders a persistent
 * list of every document already in the workspace (loaded from the server), so
 * uploaded SOPs remain visible after navigating away and back.
 */
export function UploadWorkflow() {
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [documents, setDocuments] = useState<SopFile[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(true);

  const refreshDocuments = useCallback(async () => {
    try {
      setDocuments(await api.listFiles());
    } catch {
      // Backend unavailable — leave the list empty.
    } finally {
      setLoadingDocs(false);
    }
  }, []);

  useEffect(() => {
    refreshDocuments();
  }, [refreshDocuments]);

  async function process(files: File[]) {
    setProcessing(true);
    setError(null);
    setResult(null);

    try {
      const scenarios: Scenario[] = [];
      for (const file of files) {
        const uploaded = await api.uploadFile(file);
        const pipeline = await api.runPipeline(uploaded.id);
        scenarios.push(...pipeline.scenarios);
      }
      setResult({ processed: files.length, scenarios });
      await refreshDocuments();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while processing the documents."
      );
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div className="space-y-6">
      <SopDropzone
        onProcess={process}
        processing={processing}
        processLabel="Upload & extract"
      />

      {error && (
        <div className="flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
          <div>
            <p className="font-medium">Processing failed</p>
            <p className="text-muted-foreground">{error}</p>
          </div>
        </div>
      )}

      {result && (
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4 text-sm">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
            <div>
              <p className="font-medium">
                Extracted {result.scenarios.length} scenario
                {result.scenarios.length === 1 ? "" : "s"} from{" "}
                {result.processed} document
                {result.processed === 1 ? "" : "s"}.
              </p>
              <p className="text-muted-foreground">
                Build rules from your documents in the Rule Builder.
              </p>
            </div>
          </div>

          {result.scenarios.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Extracted scenarios</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Condition</TableHead>
                      <TableHead>Resolution</TableHead>
                      <TableHead>Group</TableHead>
                      <TableHead className="text-right">Confidence</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.scenarios.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell className="max-w-xs">{s.condition}</TableCell>
                        <TableCell className="max-w-xs">
                          {s.resolution}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {s.resolution_group}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {Math.round(s.confidence * 100)}%
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          <Button asChild>
            <Link href="/rules">
              <Braces className="h-4 w-4" />
              Open Rule Builder
            </Link>
          </Button>
        </div>
      )}

      {/* Persistent workspace documents */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your documents</CardTitle>
          <CardDescription>
            Every SOP uploaded to this workspace. These stay here as you move
            between pages.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loadingDocs ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : documents.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <FileText className="h-5 w-5" />
              </span>
              <p className="text-sm text-muted-foreground">
                No documents yet — upload your first SOP above.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Document</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell>
                      <div className="flex min-w-0 items-center gap-2">
                        <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <span className="truncate">{doc.filename}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatSize(doc.size_bytes)}
                    </TableCell>
                    <TableCell className="text-right">
                      <StatusBadge status={doc.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
