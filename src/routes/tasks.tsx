import { createFileRoute } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ItemDialog } from "@/components/ItemDialog";
import { TaskRow } from "@/components/TaskRow";
import { PageHeader } from "@/components/ui-bits";
import { cn } from "@/lib/utils";
import { useStudy } from "@/lib/store";

export const Route = createFileRoute("/tasks")({
  head: () => ({
    meta: [
      { title: "Tasks — Studyowl" },
      { name: "description", content: "Standalone study tasks with subjects, priorities and due dates." },
      { property: "og:title", content: "Tasks — Studyowl" },
      { property: "og:description", content: "Standalone study tasks with subjects, priorities and due dates." },
    ],
  }),
  component: TasksPage,
});

const PR = { high: 0, medium: 1, low: 2 };

function TasksPage() {
  const { tasks, subjects } = useStudy();
  const [show, setShow] = useState<"open" | "done" | "all">("open");
  const [subject, setSubject] = useState<string>("all");
  const list = tasks
    .filter((t) => (show === "all" ? true : show === "done" ? t.done : !t.done))
    .filter((t) => (subject === "all" ? true : t.subjectId === subject))
    .sort((a, b) => (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999") || PR[a.priority] - PR[b.priority]);
  return (
    <div>
      <PageHeader title="Tasks" subtitle="Essays, assignments and anything that isn't a topic." actions={<ItemDialog kind="task" trigger={<Button size="sm"><Plus /> New task</Button>} />} />
      <div className="mb-3 flex flex-wrap gap-1.5">
        {(["open", "done", "all"] as const).map((f) => (
          <button key={f} onClick={() => setShow(f)} className={cn("rounded-full px-3 py-1 text-xs font-medium capitalize", show === f ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent")}>
            {f}
          </button>
        ))}
        <select value={subject} onChange={(e) => setSubject(e.target.value)} className="rounded-full border bg-card px-3 py-1 text-xs" aria-label="Filter by subject">
          <option value="all">All subjects</option>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>
      <div className="card-surface p-2">
        {list.length ? list.map((t) => <TaskRow key={t.id} task={t} />) : <p className="p-8 text-center text-sm text-muted-foreground">No tasks here.</p>}
      </div>
    </div>
  );
}
