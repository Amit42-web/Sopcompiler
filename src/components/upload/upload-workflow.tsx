"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, AlertTriangle, Braces, FileText } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import type { Scenario } from "@/lib/types";

interface FileOutcome {
  filename: string;
  sections: number;
  scenarios: number;
}

interface Result {
  files: FileOutcome[];
  scenarios: Scenario[];
}

/**
 * End-to-end upload flow: creates a project, uploads each document, runs the
 * AI pipeline, and renders the extracted scenarios. No destination project is
 * required — one is created automatically for the batch.
 */
export function UploadWorkflow() {
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  async function process(files: File[]) {
    setProcessing(true);
    setError(null);
    setResult(null);

    try {
      const stamp = new Date().toLocaleString();
      const project = await api.createProject({
        name: `SOP Upload — ${stamp}`,
        description: "Created automatically from the Upload page.",
      });

      const outcomes: FileOutcome[] = [];
      const scenarios: Scenario[] = [];

      for (const file of files) {
        const uploaded = await api.uploadFile(project.id, file);
        const pipeline = await api.runPipeline(uploaded.id);
        outcomes.push({
          filename: file.name,
          sections: pipeline.sections.length,
          scenarios: pipeline.scenarios.length,
        });
        scenarios.push(...pipeline.scenarios);
      }

      setResult({ files: outcomes, scenarios });
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
                {result.files.length} document
                {result.files.length === 1 ? "" : "s"}.
              </p>
              <p className="text-muted-foreground">
                Review and export them in the Rule Builder.
              </p>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Processed documents</CardTitle>
              <CardDescription>
                Sections and scenarios detected per file.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {result.files.map((f) => (
                <div
                  key={f.filename}
                  className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="truncate">{f.filename}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="secondary">{f.sections} sections</Badge>
                    <Badge variant="secondary">{f.scenarios} scenarios</Badge>
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>

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
    </div>
  );
}
