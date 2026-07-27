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
        description="Manage your workspace and integration preferences."
      />

      <div className="space-y-6">
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

        <Card>
          <CardHeader>
            <CardTitle>Backend Connection</CardTitle>
            <CardDescription>
              The FastAPI service that runs parsing and the AI pipeline.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Label htmlFor="api-url">API base URL</Label>
            <Input
              id="api-url"
              defaultValue="http://localhost:8000"
              placeholder="https://api.your-domain.com"
            />
            <p className="text-xs text-muted-foreground">
              Set <code>NEXT_PUBLIC_API_URL</code> to point the app at your
              deployed backend.
            </p>
          </CardContent>
        </Card>

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

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CardTitle>Integrations</CardTitle>
              <Badge variant="secondary">Preview</Badge>
            </div>
            <CardDescription>
              Authentication, database, and AI services connect here.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="divide-y rounded-lg border text-sm">
              {[
                { name: "Supabase Auth", connected: false },
                { name: "PostgreSQL", connected: false },
                { name: "Anthropic (AI pipeline)", connected: false },
              ].map((item) => (
                <li
                  key={item.name}
                  className="flex items-center justify-between px-4 py-3"
                >
                  <span>{item.name}</span>
                  <Badge variant={item.connected ? "success" : "outline"}>
                    {item.connected ? "Connected" : "Not connected"}
                  </Badge>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
