import { createFileRoute, Link } from "@tanstack/react-router";
import { format } from "date-fns";
import { Plus, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BulkAddDialog } from "@/components/BulkAddDialog";
import { GoalCard } from "@/components/GoalCard";
import { RevisionCard, WeakSpotsCard } from "@/components/InsightCards";
import { Pomodoro } from "@/components/pomodoro/Pomodoro";
import { StreakCard } from "@/components/StreakCard";
import { SubjectCard } from "@/components/SubjectCard";
import { SubjectDialog } from "@/components/SubjectDialog";
import { TaskRow } from "@/components/TaskRow";
import { TopicRow } from "@/components/TopicRow";
import { EmptyState, PageHeader } from "@/components/ui-bits";
import { useStudy } from "@/lib/store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — Studyowl Study Planner" },
      { name: "description", content: "Your study day at a glance: focus goal, streak, subjects and what's due next." },
      { property: "og:title", content: "Dashboard — Studyowl Study Planner" },
      { property: "og:description", content: "Your study day at a glance: focus goal, streak, subjects and what's due next." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { subjects, topics, tasks, hasSample, clearSample, ready } = useStudy();
  const upcomingTasks = tasks.filter((t) => !t.done).sort((a, b) => (a.dueDate ?? "9").localeCompare(b.dueDate ?? "9")).slice(0, 4);
  const upcomingTopics = topics
    .filter((t) => t.dueDate && t.status !== "understood")
    .sort((a, b) => a.dueDate!.localeCompare(b.dueDate!))
    .slice(0, 4);

  return (
    <div>
      <PageHeader
        title="Today"
        subtitle={format(new Date(), "EEEE, MMMM d")}
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
                  <Plus /> Subject
                </Button>
              }
            />
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <GoalCard />
        <StreakCard />
        <Pomodoro compact />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <WeakSpotsCard />
        <RevisionCard />
      </div>

      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Subjects</h2>
          <Link to="/subjects" className="text-sm font-medium text-primary hover:underline">
            View all
          </Link>
        </div>
        {ready && subjects.length === 0 ? (
          <EmptyState title="No subjects yet" body="Add a subject or paste your syllabus with Bulk add." />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {subjects.map((s) => (
              <SubjectCard key={s.id} subject={s} />
            ))}
          </div>
        )}
      </section>

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <section className="card-surface p-4">
          <h2 className="mb-2 px-3 font-semibold">Upcoming topics</h2>
          {upcomingTopics.length ? upcomingTopics.map((t) => <TopicRow key={t.id} topic={t} showSubject />) : <p className="px-3 py-4 text-sm text-muted-foreground">No dated topics coming up.</p>}
        </section>
        <section className="card-surface p-4">
          <div className="mb-2 flex items-center justify-between px-3">
            <h2 className="font-semibold">Tasks</h2>
            <Link to="/tasks" className="text-sm font-medium text-primary hover:underline">
              All tasks
            </Link>
          </div>
          {upcomingTasks.length ? upcomingTasks.map((t) => <TaskRow key={t.id} task={t} />) : <p className="px-3 py-4 text-sm text-muted-foreground">Nothing open. Nice.</p>}
        </section>
      </div>
    </div>
  );
}
