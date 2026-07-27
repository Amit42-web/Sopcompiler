import { Badge } from "@/components/ui/badge";
import type { ProjectStatus, FileStatus } from "@/lib/types";

type Status = ProjectStatus | FileStatus;

const variantByStatus: Record<
  Status,
  "default" | "secondary" | "success" | "warning" | "destructive"
> = {
  // Project statuses
  draft: "secondary",
  processing: "warning",
  ready: "success",
  error: "destructive",
  // File statuses
  uploaded: "secondary",
  parsing: "warning",
  parsed: "default",
  processed: "success",
};

const labelByStatus: Partial<Record<Status, string>> = {
  draft: "Draft",
  processing: "Processing",
  ready: "Ready",
  error: "Error",
  uploaded: "Uploaded",
  parsing: "Parsing",
  parsed: "Parsed",
  processed: "Processed",
};

/**
 * Renders a colour-coded badge for a project or file status.
 */
export function StatusBadge({ status }: { status: Status }) {
  return (
    <Badge variant={variantByStatus[status] ?? "secondary"}>
      {labelByStatus[status] ?? status}
    </Badge>
  );
}
