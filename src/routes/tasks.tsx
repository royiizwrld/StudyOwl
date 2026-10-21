import { createFileRoute } from "@tanstack/react-router";
import { addDays, format } from "date-fns";
import { ListChecks, Plus } from "lucide-react";
import { ObjectiveRow } from "@/components/objectives/ObjectiveRow";
import { ObjectivesDialog } from "@/components/objectives/ObjectivesDialog";
import { ProgressBar } from "@/components/ui-bits";
import { weekKey } from "@/lib/logic";
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
      { title: "Tasks & Objectives — Studyowl" },
      { name: "description", content: "Weekly learning objectives and study tasks with subjects, priorities and due dates." },
      { property: "og:title", content: "Tasks & Objectives — Studyowl" },
      { property: "og:description", content: "Weekly learning objectives and study tasks with subjects, priorities and due dates." },
    ],
  }),
  component: TasksPage,
});

const PR = { high: 0, medium: 1, low: 2 };

function TasksPage() {
  const [view, setView] = useState<"objectives" | "tasks">("objectives");
  return (
    <div>
      <PageHeader
        title="Tasks & Objectives"
        subtitle="Your weekly objectives and everything else you need to get done."
        actions={
          <>
            <ObjectivesDialog trigger={<Button size="sm" variant={view === "objectives" ? "default" : "outline"}><ListChecks /> Add objectives</Button>} />
            <ItemDialog kind="task" trigger={<Button size="sm" variant={view === "tasks" ? "default" : "outline"}><Plus /> New task</Button>} />
          </>
        }
      />
      <div className="mb-4 inline-flex rounded-full bg-muted p-1">
        {(["objectives", "tasks"] as const).map((v) => (
          <button key={v} onClick={() => setView(v)} className={cn("rounded-full px-4 py-1.5 text-sm font-medium capitalize", view === v ? "bg-card shadow-sm" : "text-muted-foreground")}>
            {v}
          </button>
        ))}
      </div>
      {view === "objectives" ? <ObjectivesView /> : <TasksView />}
    </div>
  );
}

function ObjectivesView() {
  const { objectives } = useStudy();
  const [scope, setScope] = useState<"upcoming" | "all">("upcoming");
  const current = weekKey(new Date());
  const weeks = [...new Set(objectives.map((o) => o.weekStart))].sort().filter((w) => scope === "all" || w >= current);
  if (!objectives.length)
    return <p className="card-surface p-8 text-center text-sm text-muted-foreground">No objectives yet. Press "Add objectives" to paste your list or upload your course guide.</p>;
  return (
    <div className="space-y-4">
      <div className="flex gap-1.5">
        {(["upcoming", "all"] as const).map((f) => (
          <button key={f} onClick={() => setScope(f)} className={cn("rounded-full px-3 py-1 text-xs font-medium", scope === f ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
            {f === "upcoming" ? "This week & upcoming" : "All weeks"}
          </button>
        ))}
      </div>
      {!weeks.length && <p className="text-sm text-muted-foreground">No current or upcoming weeks. Switch to "All weeks" to see past ones.</p>}
      {weeks.map((w) => {
        const list = objectives.filter((o) => o.weekStart === w);
        const done = list.filter((o) => o.done).length;
        const start = new Date(w + "T12:00:00");
        return (
          <section key={w} className={cn("card-surface p-3", w === current && "ring-2 ring-primary/40")}>
            <div className="mb-2 flex items-center justify-between gap-2 px-2">
              <div className="min-w-0">
                <h2 className="truncate font-semibold">{list.find((o) => o.weekTitle)?.weekTitle ?? "Week of " + format(start, "MMM d")}</h2>
                <p className="text-xs text-muted-foreground">
                  {format(start, "MMM d")} – {format(addDays(start, 6), "MMM d")}{w === current && " · this week"} · {done}/{list.length} done
                </p>
              </div>
              <ObjectivesDialog defaultWeek={w} trigger={<Button variant="ghost" size="icon-sm" aria-label="Add objectives to this week"><Plus /></Button>} />
            </div>
            <div className="mb-1 px-2"><ProgressBar value={(done / list.length) * 100} /></div>
            {list.map((o) => <ObjectiveRow key={o.id} o={o} />)}
          </section>
        );
      })}
    </div>
  );
}

function TasksView() {
  const { tasks, subjects } = useStudy();
  const [show, setShow] = useState<"open" | "done" | "all">("open");
  const [subject, setSubject] = useState<string>("all");
  const list = tasks
    .filter((t) => (show === "all" ? true : show === "done" ? t.done : !t.done))
    .filter((t) => (subject === "all" ? true : t.subjectId === subject))
    .sort((a, b) => (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999") || PR[a.priority] - PR[b.priority]);
  return (
    <div>
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
