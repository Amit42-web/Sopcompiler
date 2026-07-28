"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Search, FileText, Loader2, Upload } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { Pagination } from "@/components/ui/pagination";
import { SopActions } from "@/components/sop/sop-actions";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api } from "@/lib/api";
import type { LibraryRow, Paginated } from "@/lib/types";
import { shortDate } from "@/lib/format";

export function LibraryView() {
  const [data, setData] = useState<Paginated<LibraryRow> | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    api
      .library({ page, pageSize: 15, search: query || undefined })
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [page, query]);

  useEffect(() => {
    load();
  }, [load]);

  // Debounce search input.
  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      setQuery(search);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search SOPs by name…"
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <Card>
        <CardContent className="p-0">
          {loading && !data ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading library…
            </div>
          ) : !data || data.total === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <FileText className="h-6 w-6" />
              </span>
              <p className="text-sm text-muted-foreground">
                {query ? "No SOPs match your search." : "No SOPs uploaded yet."}
              </p>
              {!query && (
                <Button asChild size="sm">
                  <Link href="/upload">
                    <Upload className="h-4 w-4" />
                    Upload SOP
                  </Link>
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SOP Name</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Uploaded</TableHead>
                    <TableHead>Modified</TableHead>
                    <TableHead className="text-center">Ver</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-center">Scenarios</TableHead>
                    <TableHead className="text-center">Rules</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.items.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="max-w-[200px]">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                          <span className="truncate font-medium">
                            {row.filename}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Link
                          href={`/projects/${row.project_id}`}
                          className="text-primary hover:underline"
                        >
                          {row.project_name}
                        </Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {row.department ?? "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {shortDate(row.upload_date)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {shortDate(row.last_modified)}
                      </TableCell>
                      <TableCell className="text-center tabular-nums">
                        v{row.version}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={row.status} />
                      </TableCell>
                      <TableCell className="text-center tabular-nums">
                        {row.scenario_count}
                      </TableCell>
                      <TableCell className="text-center tabular-nums">
                        {row.rule_count}
                      </TableCell>
                      <TableCell>
                        <SopActions row={row} onChanged={load} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {data && (
        <Pagination
          page={data.page}
          totalPages={data.total_pages}
          total={data.total}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}
