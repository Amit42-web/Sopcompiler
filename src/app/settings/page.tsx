import type { Metadata } from "next";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Settings",
};

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Settings"
        description="Manage your workspace and account preferences."
      />

      <div className="space-y-6">
        {/* Workspace */}
        <Card>
          <CardHeader>
            <CardTitle>Workspace</CardTitle>
            <CardDescription>
              Basic information about your RuleForge workspace.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="workspace-name">Workspace name</Label>
              <Input id="workspace-name" defaultValue="My Workspace" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="workspace-email">Contact email</Label>
              <Input
                id="workspace-email"
                type="email"
                placeholder="you@company.com"
              />
            </div>
          </CardContent>
          <CardFooter className="justify-end border-t pt-6">
            <Button>Save changes</Button>
          </CardFooter>
        </Card>

        {/* Rule engine output */}
        <Card>
          <CardHeader>
            <CardTitle>Rule Engine Output</CardTitle>
            <CardDescription>
              Default format for generated rule definitions.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Label htmlFor="output-format">Output format</Label>
            <Input id="output-format" defaultValue="Rule Engine JSON" disabled />
            <p className="text-xs text-muted-foreground">
              Additional export formats arrive in a future sprint.
            </p>
          </CardContent>
        </Card>

        {/* Integrations (disabled preview) */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CardTitle>Integrations</CardTitle>
              <Badge variant="secondary">Coming soon</Badge>
            </div>
            <CardDescription>
              Authentication, database, and AI services connect here in
              upcoming sprints.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="divide-y rounded-lg border text-sm">
              {["Supabase Auth", "PostgreSQL", "AI Extraction"].map((item) => (
                <li
                  key={item}
                  className="flex items-center justify-between px-4 py-3"
                >
                  <span>{item}</span>
                  <Badge variant="outline">Not connected</Badge>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
