"use client";

import { useRef, useState, type DragEvent } from "react";
import { UploadCloud, File, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const ACCEPTED = ".pdf,.doc,.docx,.txt,.md";

interface SelectedFile {
  name: string;
  size: number;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Client-side SOP file picker with drag-and-drop.
 * Sprint 1: UI only — files are staged locally, not uploaded anywhere.
 */
export function SopDropzone() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [files, setFiles] = useState<SelectedFile[]>([]);

  function addFiles(list: FileList | null) {
    if (!list) return;
    const next = Array.from(list).map((f) => ({ name: f.name, size: f.size }));
    setFiles((prev) => [...prev, ...next]);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    addFiles(event.dataTransfer.files);
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
        }}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-10 text-center transition-colors",
          isDragging
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/50 hover:bg-accent/50"
        )}
      >
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          <UploadCloud className="h-7 w-7" />
        </span>
        <div>
          <p className="font-medium">
            Drag &amp; drop your SOP documents here
          </p>
          <p className="text-sm text-muted-foreground">
            or click to browse — PDF, DOC, DOCX, TXT, MD
          </p>
        </div>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPTED}
          className="hidden"
          onChange={(e) => addFiles(e.target.files)}
        />
      </div>

      {files.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">
            Selected files ({files.length})
          </p>
          <ul className="space-y-2">
            {files.map((file, index) => (
              <li
                key={`${file.name}-${index}`}
                className="flex items-center justify-between rounded-lg border bg-card px-4 py-3"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <File className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="truncate text-sm">{file.name}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatSize(file.size)}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Remove ${file.name}`}
                  onClick={() => removeFile(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-2 pt-2">
            <Button disabled>Process SOPs</Button>
            <Button variant="outline" onClick={() => setFiles([])}>
              Clear all
            </Button>
            <span className="text-xs text-muted-foreground">
              Processing arrives in a future sprint.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
