"use client";

import { useRef, useState, type DragEvent } from "react";
import { UploadCloud, File as FileIcon, X, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const ACCEPTED = ".pdf,.doc,.docx,.txt,.md";

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface SopDropzoneProps {
  /**
   * Called with the staged File objects when the user clicks the process
   * button. The dropzone stays populated until the caller resolves, so the
   * caller can upload/parse before deciding whether to clear.
   */
  onProcess: (files: File[]) => void | Promise<void>;
  /** When true, the process button shows a spinner and inputs are locked. */
  processing?: boolean;
  /** Label for the primary action button. */
  processLabel?: string;
}

/**
 * Client-side SOP file picker with drag-and-drop. Holds the actual File
 * objects so the caller can upload and parse them through the API.
 */
export function SopDropzone({
  onProcess,
  processing = false,
  processLabel = "Process SOPs",
}: SopDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [files, setFiles] = useState<File[]>([]);

  function addFiles(list: FileList | null) {
    if (!list) return;
    setFiles((prev) => [...prev, ...Array.from(list)]);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    if (processing) return;
    addFiles(event.dataTransfer.files);
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleProcess() {
    if (files.length === 0 || processing) return;
    await onProcess(files);
  }

  const openPicker = () => {
    if (!processing) inputRef.current?.click();
  };

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!processing) setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={openPicker}
        role="button"
        tabIndex={0}
        aria-disabled={processing}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") openPicker();
        }}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-10 text-center transition-colors",
          processing && "pointer-events-none opacity-60",
          isDragging
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/50 hover:bg-accent/50"
        )}
      >
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          <UploadCloud className="h-7 w-7" />
        </span>
        <div>
          <p className="font-medium">Drag &amp; drop your SOP documents here</p>
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
          disabled={processing}
          onChange={(e) => addFiles(e.target.files)}
        />
      </div>

      {files.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">Selected files ({files.length})</p>
          <ul className="space-y-2">
            {files.map((file, index) => (
              <li
                key={`${file.name}-${index}`}
                className="flex items-center justify-between rounded-lg border bg-card px-4 py-3"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <FileIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="truncate text-sm">{file.name}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatSize(file.size)}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Remove ${file.name}`}
                  disabled={processing}
                  onClick={() => removeFile(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-2 pt-2">
            <Button onClick={handleProcess} disabled={processing}>
              {processing && <Loader2 className="h-4 w-4 animate-spin" />}
              {processing ? "Processing…" : processLabel}
            </Button>
            <Button
              variant="outline"
              disabled={processing}
              onClick={() => setFiles([])}
            >
              Clear all
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
