"use client";

import { useMemo, useState } from "react";
import {
  Braces,
  CheckCircle2,
  AlertTriangle,
  Download,
  Plus,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Rule, ValidationIssue } from "@/lib/types";

/**
 * Client-side rule engine JSON assembler (Sprint 7 output shape) with an
 * editable builder (Sprint 8) and local validation + export (Sprint 9).
 */
function buildRuleSetJson(rules: Rule[]) {
  return {
    name: "ruleforge-ruleset",
    version: "1.0.0",
    rules: rules
      .filter((r) => r.enabled)
      .map((r) => ({
        id: r.id,
        name: r.name,
        priority: r.priority,
        conditions: { all: r.all },
        event: { type: "ruleforge.match", params: { actions: r.actions } },
      })),
  };
}

/** Lightweight client-side mirror of the backend validation rules. */
function validate(rules: Rule[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const seenNames = new Set<string>();

  for (const rule of rules) {
    if (!rule.name.trim()) {
      issues.push({
        rule_id: rule.id,
        severity: "error",
        code: "EMPTY_NAME",
        message: "Rule has no name.",
      });
    }
    if (seenNames.has(rule.name)) {
      issues.push({
        rule_id: rule.id,
        severity: "warning",
        code: "DUPLICATE_NAME",
        message: `Duplicate rule name: "${rule.name}".`,
      });
    }
    seenNames.add(rule.name);

    if (rule.enabled && rule.all.length === 0) {
      issues.push({
        rule_id: rule.id,
        severity: "warning",
        code: "NO_CONDITIONS",
        message: "Enabled rule has no conditions and will always match.",
      });
    }
    if (rule.enabled && rule.actions.length === 0) {
      issues.push({
        rule_id: rule.id,
        severity: "error",
        code: "NO_ACTIONS",
        message: "Enabled rule has no actions.",
      });
    }
  }

  if (rules.filter((r) => r.enabled).length === 0) {
    issues.push({
      severity: "info",
      code: "NO_ENABLED_RULES",
      message: "No rules are enabled — the exported set will be empty.",
    });
  }

  return issues;
}

const severityStyles: Record<
  ValidationIssue["severity"],
  { variant: "destructive" | "warning" | "secondary"; icon: typeof AlertTriangle }
> = {
  error: { variant: "destructive", icon: AlertTriangle },
  warning: { variant: "warning", icon: AlertTriangle },
  info: { variant: "secondary", icon: CheckCircle2 },
};

export function RuleBuilder({ initialRules }: { initialRules: Rule[] }) {
  const [rules, setRules] = useState<Rule[]>(initialRules);

  const json = useMemo(() => buildRuleSetJson(rules), [rules]);
  const issues = useMemo(() => validate(rules), [rules]);
  const errorCount = issues.filter((i) => i.severity === "error").length;

  function toggleRule(id: string) {
    setRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r))
    );
  }

  function updateName(id: string, name: string) {
    setRules((prev) => prev.map((r) => (r.id === id ? { ...r, name } : r)));
  }

  function removeRule(id: string) {
    setRules((prev) => prev.filter((r) => r.id !== id));
  }

  function addRule() {
    const id = `r-${Date.now()}`;
    setRules((prev) => [
      ...prev,
      {
        id,
        name: "New rule",
        description: "",
        priority: 50,
        all: [],
        actions: [],
        enabled: true,
      },
    ]);
  }

  function downloadJson() {
    const blob = new Blob([JSON.stringify(json, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ruleforge-ruleset.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Tabs defaultValue="builder">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <TabsList>
          <TabsTrigger value="builder">Builder</TabsTrigger>
          <TabsTrigger value="json">JSON</TabsTrigger>
          <TabsTrigger value="validation">
            Validation
            {errorCount > 0 && (
              <Badge variant="destructive" className="ml-2">
                {errorCount}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={addRule}>
            <Plus className="h-4 w-4" />
            Add rule
          </Button>
          <Button size="sm" onClick={downloadJson} disabled={errorCount > 0}>
            <Download className="h-4 w-4" />
            Export JSON
          </Button>
        </div>
      </div>

      {/* Builder */}
      <TabsContent value="builder">
        <div className="space-y-3">
          {rules.map((rule) => (
            <Card key={rule.id}>
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <input
                      type="checkbox"
                      checked={rule.enabled}
                      onChange={() => toggleRule(rule.id)}
                      aria-label={`Enable ${rule.name}`}
                      className="h-4 w-4 rounded border-input accent-primary"
                    />
                    <Input
                      value={rule.name}
                      onChange={(e) => updateName(rule.id, e.target.value)}
                      className="max-w-md font-medium"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">priority {rule.priority}</Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Delete rule"
                      onClick={() => removeRule(rule.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {rule.description && (
                  <p className="text-muted-foreground">{rule.description}</p>
                )}
                <div>
                  <p className="mb-1.5 text-xs font-semibold uppercase text-muted-foreground">
                    When all of
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {rule.all.length === 0 && (
                      <span className="text-xs text-muted-foreground">
                        No conditions
                      </span>
                    )}
                    {rule.all.map((c, i) => (
                      <code
                        key={i}
                        className="rounded bg-muted px-2 py-1 text-xs"
                      >
                        {c.fact} {c.operator.replace(/_/g, " ")}{" "}
                        {String(c.value)}
                      </code>
                    ))}
                  </div>
                </div>
                <Separator />
                <div>
                  <p className="mb-1.5 text-xs font-semibold uppercase text-muted-foreground">
                    Then
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {rule.actions.length === 0 && (
                      <span className="text-xs text-muted-foreground">
                        No actions
                      </span>
                    )}
                    {rule.actions.map((a, i) => (
                      <code
                        key={i}
                        className="rounded bg-primary/10 px-2 py-1 text-xs text-primary"
                      >
                        {a.type} {a.target}
                        {a.value !== undefined ? ` = ${String(a.value)}` : ""}
                      </code>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </TabsContent>

      {/* JSON */}
      <TabsContent value="json">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Braces className="h-4 w-4 text-primary" />
              <CardTitle className="text-base">Rule Engine JSON</CardTitle>
            </div>
            <CardDescription>
              Generated from enabled rules. This is the export payload.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="max-h-[480px] overflow-auto rounded-lg bg-muted p-4 text-xs leading-relaxed">
              {JSON.stringify(json, null, 2)}
            </pre>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Validation */}
      <TabsContent value="validation">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Validation Report</CardTitle>
            <CardDescription>
              {issues.length === 0
                ? "All checks passed."
                : `${issues.length} issue(s) found across ${rules.length} rules.`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {issues.length === 0 ? (
              <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4 text-sm">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                Your rule set is valid and ready to export.
              </div>
            ) : (
              issues.map((issue, i) => {
                const style = severityStyles[issue.severity];
                const Icon = style.icon;
                return (
                  <div
                    key={i}
                    className="flex items-start gap-3 rounded-lg border p-3 text-sm"
                  >
                    <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="flex-1">
                      <p>{issue.message}</p>
                      {issue.rule_id && (
                        <p className="text-xs text-muted-foreground">
                          Rule: {issue.rule_id}
                        </p>
                      )}
                    </div>
                    <Badge variant={style.variant}>{issue.code}</Badge>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
