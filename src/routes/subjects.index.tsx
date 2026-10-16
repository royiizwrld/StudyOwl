import { createFileRoute } from "@tanstack/react-router";
import { Plus, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BulkAddDialog } from "@/components/BulkAddDialog";
import { SubjectCard } from "@/components/SubjectCard";
import { SubjectDialog } from "@/components/SubjectDialog";
import { EmptyState, PageHeader } from "@/components/ui-bits";
import { useStudy } from "@/lib/store";

export const Route = createFileRoute("/subjects/")({
  head: () => ({
    meta: [
      { title: "Subjects — Studyowl" },
      { name: "description", content: "All your subjects with topic progress and review flags." },
      { property: "og:title", content: "Subjects — Studyowl" },
      { property: "og:description", content: "All your subjects with topic progress and review flags." },
    ],
  }),
  component: SubjectsPage,
});

function SubjectsPage() {
  const { subjects, ready, hasSample, clearSample } = useStudy();
  return (
    <div>
      <PageHeader
        title="Subjects"
        subtitle="Tap a subject to manage its units and topics."
        actions={
          <>
            {hasSample && (
              <Button variant="ghost" size="sm" onClick={clearSample}>
                Clear sample data
              </Button>
            )}
            <BulkAddDialog
              trigger={
                <Button variant="outline" size="sm">
                  <Wand2 /> Bulk add
                </Button>
              }
            />
            <SubjectDialog
              trigger={
                <Button size="sm">
                  <Plus /> New subject
                </Button>
              }
            />
          </>
        }
      />
      {ready && subjects.length === 0 ? (
        <EmptyState title="No subjects yet" body="Create your first subject, or paste a syllabus with Bulk add." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {subjects.map((s) => (
            <SubjectCard key={s.id} subject={s} />
          ))}
        </div>
      )}
    </div>
  );
}
