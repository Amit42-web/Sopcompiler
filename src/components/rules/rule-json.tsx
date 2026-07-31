"use client";

import { useMemo, useState } from "react";
import { Copy, Check, Download, Braces } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { RuleEngineBuildSpec } from "@/lib/types";

export function RuleJson({
  projectName,
  buildSpec,
}: {
  projectName: string;
  buildSpec: RuleEngineBuildSpec | null;
}) {
  const [copied, setCopied] = useState(false);

  const json = useMemo(
    () => JSON.stringify({ rule_engine_build_spec: buildSpec }, null, 2),
    [buildSpec]
  );

  async function copy() {
    try {
      await navigator.clipboard.writeText(json);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard blocked — the user can still select the text manually.
    }
  }

  function download() {
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(projectName || "ruleset").replace(/\s+/g, "-").toLowerCase()}.rules.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!buildSpec) {
    return (
      <p className="text-sm text-muted-foreground">
        No rules extracted yet — upload an SOP to generate Rule Engine JSON.
      </p>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Braces className="h-4 w-4 text-primary" />
            <CardTitle className="text-base">Rule Engine JSON</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={copy}>
              {copied ? (
                <Check className="h-4 w-4 text-emerald-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
              {copied ? "Copied" : "Copy"}
            </Button>
            <Button size="sm" onClick={download}>
              <Download className="h-4 w-4" />
              Download
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <pre className="max-h-[560px] overflow-auto rounded-lg bg-muted p-4 text-xs leading-relaxed">
          {json}
        </pre>
      </CardContent>
    </Card>
  );
}
