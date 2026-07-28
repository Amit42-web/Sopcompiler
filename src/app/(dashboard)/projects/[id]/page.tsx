import { ProjectDetailView } from "@/components/projects/project-detail-view";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className="mx-auto max-w-5xl">
      <ProjectDetailView projectId={id} />
    </div>
  );
}
