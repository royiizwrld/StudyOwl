import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ItemDialog } from "@/components/ItemDialog";
import { SubjectDialog } from "@/components/SubjectDialog";
import { TopicRow } from "@/components/TopicRow";
import { TaskRow } from "@/components/TaskRow";
import { EmptyState, ProgressBar, SubjectDot } from "@/components/ui-bits";
import { cn } from "@/lib/utils";
import { subjectProgress } from "@/lib/logic";
import { useStudy } from "@/lib/store";
import { STATUS_LABEL, type TopicStatus } from "@/lib/types";

export const Route = createFileRoute("/subjects/$subjectId")({
  head: () => ({
    meta: [
      { title: "Subject topics — Studyowl" },
      { name: "description", content: "Track every unit and topic in this subject." },
      { property: "og:title", content: "Subject topics — Studyowl" },
      { property: "og:description", content: "Track every unit and topic in this subject." },
    ],
  }),
  component: SubjectPage,
});

function SubjectPage() {
  const { subjectId } = Route.useParams();
  const { subjects, topics, tasks, ready, deleteSubject } = useStudy();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<TopicStatus | "all" | "flagged">("all");
  const subject = subjects.find((s) => s.id === subjectId);
  if (!ready) return null;
  if (!subject)
    return (
      <EmptyState
        title="Subject not found"
        action={
          <Button asChild>
            <Link to="/subjects">Back to subjects</Link>
          </Button>
        }
      />
    );
  const p = subjectProgress(topics, subject.id);
  const list = topics
    .filter((t) => t.subjectId === subject.id)
    .filter((t) => (filter === "all" ? true : filter === "flagged" ? t.flagged : t.status === filter));
  const subjectTasks = tasks.filter((t) => t.subjectId === subject.id);

  return (
    <div>
      <Link to="/subjects" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Subjects
      </Link>
      <div className="card-surface mb-6 p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <SubjectDot color={subject.color} className="size-4" />
            <h1 className="text-2xl font-semibold">{subject.name}</h1>
          </div>
          <div className="flex gap-1">
            <SubjectDialog subject={subject} trigger={<Button variant="ghost" size="icon" aria-label="Edit subject"><Pencil /></Button>} />
            <Button
              variant="ghost"
              size="icon"
              aria-label="Delete subject"
              onClick={() => {
                if (confirm(`Delete ${subject.name} and its topics?`)) {
                  deleteSubject(subject.id);
                  navigate({ to: "/subjects" });
                }
              }}
            >
              <Trash2 />
            </Button>
          </div>
        </div>
        <div className="mt-5">
          <ProgressBar value={p.pct} color={subject.color} />
          <p className="mt-2 text-sm text-muted-foreground">
            {p.understood} of {p.total} topics understood · {p.flagged} flagged for review
          </p>
        </div>
      </div>

      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          {(["all", "not_started", "studying", "understood", "flagged"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                filter === f ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent",
              )}
            >
              {f === "all" ? "All" : f === "flagged" ? "Needs review" : STATUS_LABEL[f]}
            </button>
          ))}
        </div>
        <ItemDialog kind="topic" defaultSubjectId={subject.id} trigger={<Button size="sm"><Plus /> Topic</Button>} />
      </div>
      <div className="card-surface p-2">
        {list.length ? list.map((t) => <TopicRow key={t.id} topic={t} />) : <p className="p-6 text-center text-sm text-muted-foreground">No topics here yet.</p>}
      </div>

      <div className="mb-3 mt-8 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Tasks</h2>
        <ItemDialog kind="task" defaultSubjectId={subject.id} trigger={<Button size="sm" variant="outline"><Plus /> Task</Button>} />
      </div>
      <div className="card-surface p-2">
        {subjectTasks.length ? subjectTasks.map((t) => <TaskRow key={t.id} task={t} />) : <p className="p-6 text-center text-sm text-muted-foreground">No tasks for this subject.</p>}
      </div>
    </div>
  );
}
