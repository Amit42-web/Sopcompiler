"use client";

import { useEffect, useState } from "react";
import {
  UserPlus,
  Trash2,
  Loader2,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";

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
import { api } from "@/lib/api";
import type { TeamMember } from "@/lib/types";

const ROLES = ["admin", "editor", "viewer"] as const;

const selectClass =
  "h-8 rounded-md border border-input bg-transparent px-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50";

/**
 * Real team management backed by the API: invite members as admin / editor /
 * viewer, change a member's role, or remove them. The workspace owner is
 * fixed and cannot be changed or removed.
 */
export function TeamManager() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<(typeof ROLES)[number]>("editor");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function refresh() {
    try {
      setMembers(await api.listTeam());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load team.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const target = email.trim();
      const res = await api.inviteMember({ email: target, role });
      setEmail("");
      await refresh();
      setNotice(
        res.emailSent
          ? `Invitation email sent to ${target}.`
          : `${target} added as ${role}. Email not sent — configure SMTP (SMTP_URL / SMTP_HOST) to deliver invitations.`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to invite member.");
    } finally {
      setBusy(false);
    }
  }

  async function changeRole(id: string, next: string) {
    setError(null);
    try {
      const updated = await api.updateMemberRole(id, next);
      setMembers((prev) => prev.map((m) => (m.id === id ? updated : m)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update role.");
    }
  }

  async function remove(id: string) {
    setError(null);
    try {
      await api.removeMember(id);
      setMembers((prev) => prev.filter((m) => m.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove member.");
    }
  }

  return (
    <div className="space-y-6">
      {/* Invite */}
      <Card>
        <CardContent className="p-4">
          <form
            onSubmit={invite}
            className="flex flex-col gap-3 sm:flex-row sm:items-end"
          >
            <div className="flex-1 space-y-1.5">
              <label htmlFor="invite-email" className="text-sm font-medium">
                Invite by email
              </label>
              <Input
                id="invite-email"
                type="email"
                required
                placeholder="teammate@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="invite-role" className="text-sm font-medium">
                Role
              </label>
              <select
                id="invite-role"
                className={selectClass + " h-9 w-full sm:w-36"}
                value={role}
                onChange={(e) =>
                  setRole(e.target.value as (typeof ROLES)[number])
                }
              >
                <option value="admin">Admin</option>
                <option value="editor">Editor</option>
                <option value="viewer">Viewer</option>
              </select>
            </div>
            <Button type="submit" disabled={busy}>
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <UserPlus className="h-4 w-4" />
              )}
              Send invite
            </Button>
          </form>
        </CardContent>
      </Card>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm">
          <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" />
          {error}
        </div>
      )}

      {notice && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 text-sm">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
          {notice}
        </div>
      )}

      {/* Members */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading team…
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => {
                  const isOwner = member.role === "owner";
                  return (
                    <TableRow key={member.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar name={member.name} />
                          <div className="min-w-0">
                            <p className="truncate font-medium">
                              {member.name}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              {member.email}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {isOwner ? (
                          <Badge>Owner</Badge>
                        ) : (
                          <select
                            aria-label={`Role for ${member.name}`}
                            className={selectClass}
                            value={member.role}
                            onChange={(e) =>
                              changeRole(member.id, e.target.value)
                            }
                          >
                            {ROLES.map((r) => (
                              <option key={r} value={r}>
                                {r[0].toUpperCase() + r.slice(1)}
                              </option>
                            ))}
                          </select>
                        )}
                      </TableCell>
                      <TableCell>
                        {member.status === "active" ? (
                          <Badge variant="success">Active</Badge>
                        ) : (
                          <Badge variant="warning">Invited</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {!isOwner && (
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Remove ${member.name}`}
                            onClick={() => remove(member.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
