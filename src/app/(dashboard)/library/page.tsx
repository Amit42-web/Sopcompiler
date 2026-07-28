import type { Metadata } from "next";

import { PageHeader } from "@/components/page-header";
import { LibraryView } from "@/components/library/library-view";

export const metadata: Metadata = { title: "SOP Library" };

export default function LibraryPage() {
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="SOP Library"
        description="Every SOP ever uploaded — persistent, searchable, and never lost."
      />
      <LibraryView />
    </div>
  );
}
