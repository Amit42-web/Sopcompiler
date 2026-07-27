import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Upload, Braces } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { FileManager } from "@/components/files/file-manager";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  getProject,
  sampleFiles,
  sampleScenarios,
  sampleRules,
} from "@/lib/sample-data";
import { sampleProjects } from "@/lib/sample-data";

export function generateStaticParams() {
  return sampleProjects.map((p) => ({ id: p.id }));
}

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = getProject(id);
  if (!project) notFound();

  const files = sampleFiles[id] ?? [];

  return (
    <div className="mx-auto max-w-5xl">
      <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2">
        <Link href="/projects">
          <ArrowLeft className="h-4 w-4" />
          Back to projects
        </Link>
      </Button>

      <PageHeader title={project.name} description={project.description}>
        <StatusBadge status={project.status} />
        <Button asChild>
          <Link href="/upload">
            <Upload className="h-4 w-4" />
            Add SOP
          </Link>
        </Button>
      </PageHeader>

      <Tabs defaultValue="files">
        <TabsList>
          <TabsTrigger value="files">Files ({files.length})</TabsTrigger>
          <TabsTrigger value="scenarios">
            Scenarios ({sampleScenarios.length})
          </TabsTrigger>
          <TabsTrigger value="rules">Rules ({sampleRules.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="files">
          <FileManager initialFiles={files} />
        </TabsContent>

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
                  {sampleScenarios.map((s) => (
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

        <TabsContent value="rules">
          <div className="flex items-center justify-between rounded-lg border bg-card p-4">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Braces className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-medium">
                  {sampleRules.length} rules generated
                </p>
                <p className="text-xs text-muted-foreground">
                  Open the Rule Builder to review and edit.
                </p>
              </div>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/rules">Open Rule Builder</Link>
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
