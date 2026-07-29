"use client";

import { useMemo, useState } from "react";
import { Copy, Check, Download, Braces } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { MetadataCondition, StructuredRule } from "@/lib/types";

/** Build the Rule Engine–ready JSON payload from extracted rules. */
export function buildRuleEngineJson(
  name: string,
  rules: StructuredRule[],
  metadataConditions: MetadataCondition[]
) {
  return {
    name: name || "Extracted rule set",
    version: "1.0.0",
    generated_at: new Date().toISOString(),
    metadata_conditions: metadataConditions,
    rules: rules.map((r) => ({
      id: r.id,
      name: r.name,
      category: r.category,
      action_kind: r.action_kind,
      obligation: r.obligation,
      branch: r.branch,
      order: r.order,
      preconditions: r.preconditions,
      conditions: r.conditions,
      action: r.action,
      validation_prompt: r.validation_prompt,
      applies_to: r.applies_to,
      source_text: r.raw,
    })),
  };
}

export function RuleJson({
  projectName,
  rules,
  metadataConditions,
}: {
  projectName: string;
  rules: StructuredRule[];
  metadataConditions: MetadataCondition[];
}) {
  const [copied, setCopied] = useState(false);

  const json = useMemo(
    () =>
      JSON.stringify(
        buildRuleEngineJson(projectName, rules, metadataConditions),
        null,
        2
      ),
    [projectName, rules, metadataConditions]
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

  if (rules.length === 0) {
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
