import { createFileRoute } from "@tanstack/react-router";
import { formatDistanceToNowStrict } from "date-fns";
import { BookmarkX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusButton } from "@/components/TopicRow";
import { EmptyState, PageHeader, PriorityBadge, SubjectDot } from "@/components/ui-bits";
import { useStudy } from "@/lib/store";

export const Route = createFileRoute("/review")({
  head: () => ({
    meta: [
      { title: "Review list — Studyowl" },
      { name: "description", content: "All the tricky topics you've flagged for review, oldest first." },
      { property: "og:title", content: "Review list — Studyowl" },
      { property: "og:description", content: "All the tricky topics you've flagged for review, oldest first." },
    ],
  }),
  component: ReviewPage,
});

function ReviewPage() {
  const { topics, subjects, setFlag, ready } = useStudy();
  const flagged = topics.filter((t) => t.flagged).sort((a, b) => (a.flaggedAt ?? 0) - (b.flaggedAt ?? 0));
  return (
    <div>
      <PageHeader title="Review list" subtitle="Tricky topics you've bookmarked — oldest first. Unflag once you've mastered them." />
      {ready && flagged.length === 0 ? (
        <EmptyState title="Nothing to review" body="Tap the bookmark on any topic to add it here." />
      ) : (
        <div className="card-surface p-2">
          {flagged.map((t) => {
            const s = subjects.find((x) => x.id === t.subjectId);
            return (
              <div key={t.id} className="flex items-center gap-3 rounded-xl px-3 py-3 hover:bg-muted/60">
                <StatusButton topic={t} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{t.title}</p>
                  <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    {s && (
                      <span className="flex items-center gap-1.5">
                        <SubjectDot color={s.color} className="size-2" /> {s.name}
                      </span>
                    )}
                    <PriorityBadge p={t.priority} />
                    {t.flaggedAt && <span>flagged {formatDistanceToNowStrict(t.flaggedAt)} ago</span>}
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => setFlag([t.id], false)}>
                  <BookmarkX /> Mastered
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
