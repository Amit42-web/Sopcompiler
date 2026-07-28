"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SopDropzone } from "@/components/upload/sop-dropzone";
import { api } from "@/lib/api";

/**
 * Upload flow: creates a project, uploads + fully processes each document
 * (persisted server-side), then redirects to the new Project Details page.
 */
export function UploadWorkflow() {
  const router = useRouter();
  const [projectName, setProjectName] = useState("");
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function deriveName(files: File[]): string {
    if (projectName.trim()) return projectName.trim();
    const first = files[0]?.name.replace(/\.[^.]+$/, "");
    return first ? first : `SOP Upload ${new Date().toLocaleDateString()}`;
  }

  async function process(files: File[]) {
    setProcessing(true);
    setError(null);
    try {
      const project = await api.createProject({ name: deriveName(files) });
      for (const file of files) {
        await api.uploadFile(project.id, file);
      }
      // Redirect to the persisted project — nothing disappears on refresh.
      router.push(`/projects/${project.id}`);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while processing the documents."
      );
      setProcessing(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="max-w-sm space-y-2">
        <Label htmlFor="project-name">Project name (optional)</Label>
        <Input
          id="project-name"
          placeholder="Auto-named from the document"
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          disabled={processing}
        />
      </div>

      <SopDropzone
        onProcess={process}
        processing={processing}
        processLabel="Upload & process"
      />

      {error && (
        <div className="flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
          <div>
            <p className="font-medium">Upload failed</p>
            <p className="text-muted-foreground">{error}</p>
          </div>
        </div>
      )}
    </div>
  );
}
