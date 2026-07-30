"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Upload,
  Pencil,
  Trash2,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  FileText,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/status-badge";
import { PageHeader } from "@/components/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SopActions } from "@/components/sop/sop-actions";
import { StructuredRules } from "@/components/rules/structured-rules";
import { RuleJson } from "@/components/rules/rule-json";
import { KnowledgeGraphView } from "@/components/rules/knowledge-graph-view";
import { api } from "@/lib/api";
import type { ProjectDetails } from "@/lib/types";
import { relativeTime } from "@/lib/format";

export function ProjectDetailView({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [data, setData] = useState<ProjectDetails | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "missing">(
    "loading"
  );

  const load = useCallback(() => {
    api
      .getProject(projectId)
      .then((d) => {
        setData(d);
        setStatus("ready");
      })
      .catch(() => setStatus("missing"));
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load]);

  async function rename() {
    if (!data) return;
    const name = window.prompt("Rename project", data.name);
    if (name && name.trim() && name !== data.name) {
      await api.renameProject(projectId, { name: name.trim() });
      load();
    }
  }

  async function remove() {
    if (!data) return;
    if (window.confirm(`Delete project “${data.name}” and all its data?`)) {
      await api.deleteProject(projectId);
      router.push("/projects");
    }
  }

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center gap-2 py-20 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading project…
      </div>
    );
  }
  if (status === "missing" || !data) {
    return (
      <div className="flex flex-col items-center gap-3 py-20 text-center">
        <p className="font-medium">Project not found</p>
        <Button asChild variant="outline">
          <Link href="/projects">Back to projects</Link>
        </Button>
      </div>
    );
  }

  return (
    <div>
      <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2">
        <Link href="/projects">
          <ArrowLeft className="h-4 w-4" />
          Back to projects
        </Link>
      </Button>

      <PageHeader
        title={data.name}
        description={
          (data.department ? `${data.department} · ` : "") +
          `${data.file_count} SOPs · ${data.scenario_count} scenarios · ${data.rule_count} rules`
        }
      >
        <StatusBadge status={data.status} />
        <Button variant="outline" size="sm" onClick={rename}>
          <Pencil className="h-4 w-4" />
          Rename
        </Button>
        <Button variant="outline" size="sm" onClick={remove}>
          <Trash2 className="h-4 w-4" />
          Delete
        </Button>
        <Button asChild size="sm">
          <Link href="/upload">
            <Upload className="h-4 w-4" />
            Add SOP
          </Link>
        </Button>
      </PageHeader>

      <Tabs defaultValue="files">
        <div className="overflow-x-auto">
          <TabsList>
            <TabsTrigger value="files">Files ({data.files.length})</TabsTrigger>
            <TabsTrigger value="metadata">Metadata</TabsTrigger>
            <TabsTrigger value="sections">
              Sections ({data.sections.length})
            </TabsTrigger>
            <TabsTrigger value="scenarios">
              Scenarios ({data.scenarios.length})
            </TabsTrigger>
            <TabsTrigger value="kb">
              Knowledge Base ({data.knowledge_base.length})
            </TabsTrigger>
            <TabsTrigger value="graph">Graph</TabsTrigger>
            <TabsTrigger value="rules">
              Rules ({data.structured_rules.length})
            </TabsTrigger>
            <TabsTrigger value="json">JSON</TabsTrigger>
            <TabsTrigger value="validation">Validation</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>
        </div>

        {/* Files */}
        <TabsContent value="files">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SOP</TableHead>
                    <TableHead className="text-center">Ver</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-center">Scenarios</TableHead>
                    <TableHead className="text-center">Rules</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.files.map((f) => (
                    <TableRow key={f.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                          <span className="truncate">{f.filename}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center tabular-nums">
                        v{f.version}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={f.status} />
                      </TableCell>
                      <TableCell className="text-center tabular-nums">
                        {f.scenario_count}
                      </TableCell>
                      <TableCell className="text-center tabular-nums">
                        {f.rule_count}
                      </TableCell>
                      <TableCell>
                        <SopActions row={f} onChanged={load} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Metadata */}
        <TabsContent value="metadata">
          <div className="grid gap-3 sm:grid-cols-2">
            {data.metadata.length === 0 && (
              <p className="text-sm text-muted-foreground">No metadata.</p>
            )}
            {data.metadata.map((m, i) => (
              <Card key={i}>
                <CardHeader>
                  <CardTitle className="text-base">
                    {m.title ?? "Untitled"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1 text-sm">
                  <Field label="Department" value={m.department} />
                  <Field label="Version" value={m.version} />
                  <Field label="Effective" value={m.effective_date} />
                  <Field label="Owner" value={m.owner} />
                  {m.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {m.tags.map((t) => (
                        <Badge key={t} variant="secondary">
                          {t}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Sections */}
        <TabsContent value="sections">
          <div className="space-y-2">
            {data.sections.length === 0 && (
              <p className="text-sm text-muted-foreground">No sections.</p>
            )}
            {data.sections.map((s) => (
              <Card key={s.id}>
                <CardContent className="p-4">
                  <p className="font-medium">{s.title}</p>
                  <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">
                    {s.text || "—"}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Scenarios */}
        <TabsContent value="scenarios">
          <Card>
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
                  {data.scenarios.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="max-w-xs">{s.condition}</TableCell>
                      <TableCell className="max-w-xs">{s.resolution}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{s.resolution_group}</Badge>
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
        </TabsContent>

        {/* Knowledge base */}
        <TabsContent value="kb">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Term</TableHead>
                    <TableHead>Definition</TableHead>
                    <TableHead className="text-right">Occurrences</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.knowledge_base.map((k, i) => (
                    <TableRow key={`${k.term}-${i}`}>
                      <TableCell className="font-medium">{k.term}</TableCell>
                      <TableCell className="max-w-md text-muted-foreground">
                        {k.definition}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {k.occurrences}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Knowledge graph */}
        <TabsContent value="graph">
          <KnowledgeGraphView graph={data.knowledge_graph} />
        </TabsContent>

        {/* Rules */}
        <TabsContent value="rules">
          <StructuredRules
            rules={data.structured_rules}
            metadataConditions={data.metadata_conditions}
          />
        </TabsContent>

        {/* Rule Engine JSON */}
        <TabsContent value="json">
          <RuleJson
            projectName={data.name}
            engineTree={data.engine_tree}
            rules={data.structured_rules}
            metadataConditions={data.metadata_conditions}
          />
        </TabsContent>

        {/* Validation */}
        <TabsContent value="validation">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Validation Report</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {!data.validation ? (
                <p className="text-sm text-muted-foreground">
                  No validation report yet.
                </p>
              ) : data.validation.issues.length === 0 ? (
                <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4 text-sm">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  Valid — {data.validation.checked_rules} rules checked, no
                  issues.
                </div>
              ) : (
                data.validation.issues.map((issue, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 rounded-lg border p-3 text-sm"
                  >
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="flex-1">
                      <p>{issue.message}</p>
                    </div>
                    <Badge
                      variant={
                        issue.severity === "error"
                          ? "destructive"
                          : issue.severity === "warning"
                          ? "warning"
                          : "secondary"
                      }
                    >
                      {issue.code}
                    </Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Version history */}
        <TabsContent value="history">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SOP</TableHead>
                    <TableHead className="text-center">Version</TableHead>
                    <TableHead className="text-center">Scenarios</TableHead>
                    <TableHead className="text-center">Rules</TableHead>
                    <TableHead className="text-center">Duration</TableHead>
                    <TableHead>Result</TableHead>
                    <TableHead className="text-right">When</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.version_history.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="max-w-[180px] truncate">
                        {r.filename}
                      </TableCell>
                      <TableCell className="text-center tabular-nums">
                        v{r.version}
                      </TableCell>
                      <TableCell className="text-center tabular-nums">
                        {r.scenarios}
                      </TableCell>
                      <TableCell className="text-center tabular-nums">
                        {r.rules}
                      </TableCell>
                      <TableCell className="text-center tabular-nums">
                        {r.duration_ms} ms
                      </TableCell>
                      <TableCell>
                        {r.success ? (
                          <Badge variant="success">success</Badge>
                        ) : (
                          <Badge variant="destructive">failed</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {relativeTime(r.created_at)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Field({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <p>
      <span className="text-muted-foreground">{label}:</span> {value}
    </p>
  );
}
