"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Upload, RefreshCw, AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RuleBuilder } from "@/components/rules/rule-builder";
import { api, ApiError } from "@/lib/api";
import type { Rule } from "@/lib/types";

/**
 * Loads real rules generated from the documents uploaded to the workspace and
 * hands them to the RuleBuilder. Shows an empty state (with a link to Upload)
 * when no document has been processed yet.
 */
export function RulesWorkspace() {
  const [rules, setRules] = useState<Rule[] | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "empty" | "error">(
    "loading"
  );
  const [message, setMessage] = useState("");

  const generate = useCallback(async () => {
    setStatus("loading");
    try {
      const ruleSet = await api.generateRules();
      setRules(ruleSet.rules);
      setStatus(ruleSet.rules.length > 0 ? "ready" : "empty");
    } catch (err) {
      if (err instanceof ApiError && err.status === 422) {
        setStatus("empty");
        return;
      }
      setMessage(
        err instanceof Error ? err.message : "Failed to generate rules."
      );
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    generate();
  }, [generate]);

  if (status === "loading") {
    return (
      <Card>
        <CardContent className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Building rules from your documents…
        </CardContent>
      </Card>
    );
  }

  if (status === "error") {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
          <AlertTriangle className="h-8 w-8 text-destructive" />
          <p className="font-medium">Couldn&apos;t generate rules</p>
          <p className="max-w-sm text-sm text-muted-foreground">{message}</p>
          <Button variant="outline" onClick={generate}>
            <RefreshCw className="h-4 w-4" />
            Try again
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (status === "empty" || !rules) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <Upload className="h-6 w-6" />
          </span>
          <div>
            <p className="font-medium">No rules yet</p>
            <p className="text-sm text-muted-foreground">
              Upload and process an SOP first — rules are generated from your
              documents.
            </p>
          </div>
          <Button asChild>
            <Link href="/upload">
              <Upload className="h-4 w-4" />
              Upload an SOP
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {rules.length} rule{rules.length === 1 ? "" : "s"} generated from your
          uploaded documents.
        </p>
        <Button variant="outline" size="sm" onClick={generate}>
          <RefreshCw className="h-4 w-4" />
          Regenerate
        </Button>
      </div>
      {/* Remount RuleBuilder when a fresh set is generated. */}
      <RuleBuilder key={rules.map((r) => r.id).join(",")} initialRules={rules} />
    </div>
  );
}
