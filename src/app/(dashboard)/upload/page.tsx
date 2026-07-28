import type { Metadata } from "next";
import { FileText, ScanText, Braces } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { UploadWorkflow } from "@/components/upload/upload-workflow";

export const metadata: Metadata = {
  title: "Upload SOP",
};

const steps = [
  {
    title: "1. Upload",
    description: "Add one or more SOP documents.",
    icon: FileText,
  },
  {
    title: "2. Extract",
    description: "AI parses procedures into structured logic.",
    icon: ScanText,
  },
  {
    title: "3. Generate",
    description: "Export executable Rule Engine JSON.",
    icon: Braces,
  },
];

export default function UploadPage() {
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Upload SOP"
        description="Import your Standard Operating Procedure documents to extract rules."
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {steps.map((step) => {
          const Icon = step.icon;
          return (
            <div
              key={step.title}
              className="flex items-start gap-3 rounded-lg border bg-card p-4"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-medium">{step.title}</p>
                <p className="text-xs text-muted-foreground">
                  {step.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Documents</CardTitle>
          <CardDescription>
            Add the SOP files you want to convert into rules, then run the
            extraction.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UploadWorkflow />
        </CardContent>
      </Card>
    </div>
  );
}
