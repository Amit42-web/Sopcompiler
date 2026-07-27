import type { Metadata } from "next";
import { UserPlus } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { sampleTeam } from "@/lib/sample-data";
import type { TeamMember } from "@/lib/types";

export const metadata: Metadata = {
  title: "Team",
};

const roleVariant: Record<
  TeamMember["role"],
  "default" | "secondary" | "outline"
> = {
  owner: "default",
  admin: "secondary",
  editor: "outline",
  viewer: "outline",
};

export default function TeamPage() {
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Team"
        description="Manage the people who can access this workspace."
      >
        <Button>
          <UserPlus className="h-4 w-4" />
          Invite member
        </Button>
      </PageHeader>

      <Card className="mb-6">
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-1.5">
            <label htmlFor="invite-email" className="text-sm font-medium">
              Invite by email
            </label>
            <Input
              id="invite-email"
              type="email"
              placeholder="teammate@company.com"
            />
          </div>
          <select
            aria-label="Role"
            className="h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            defaultValue="editor"
          >
            <option value="admin">Admin</option>
            <option value="editor">Editor</option>
            <option value="viewer">Viewer</option>
          </select>
          <Button variant="outline">Send invite</Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sampleTeam.map((member) => (
                <TableRow key={member.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar name={member.name} />
                      <div>
                        <p className="font-medium">{member.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {member.email}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={roleVariant[member.role]}>
                      {member.role}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {member.status === "active" ? (
                      <Badge variant="success">Active</Badge>
                    ) : (
                      <Badge variant="warning">Invited</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
