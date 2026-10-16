import { createFileRoute } from "@tanstack/react-router";
import { format } from "date-fns";
import { Pomodoro } from "@/components/pomodoro/Pomodoro";
import { PageHeader } from "@/components/ui-bits";
import { useStudy } from "@/lib/store";
import { todayStart } from "@/lib/logic";

export const Route = createFileRoute("/focus")({
  head: () => ({
    meta: [
      { title: "Focus timer — Studyowl" },
      { name: "description", content: "Adjustable Pomodoro timer that logs focus time against your subjects." },
      { property: "og:title", content: "Focus timer — Studyowl" },
      { property: "og:description", content: "Adjustable Pomodoro timer that logs focus time against your subjects." },
    ],
  }),
  component: FocusPage,
});

function FocusPage() {
  const { sessions, subjects, topics } = useStudy();
  const today = sessions.filter((s) => s.endedAt >= todayStart()).sort((a, b) => b.endedAt - a.endedAt);
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Focus" subtitle="Pick what you're studying, then press start." />
      <Pomodoro />
      <section className="card-surface mt-6 p-4">
        <h2 className="mb-2 px-2 font-semibold">Today's sessions</h2>
        {today.length === 0 ? (
          <p className="px-2 py-3 text-sm text-muted-foreground">No sessions yet today.</p>
        ) : (
          <ul className="divide-y">
            {today.map((s) => (
              <li key={s.id} className="flex justify-between px-2 py-2 text-sm">
                <span>
                  {subjects.find((x) => x.id === s.subjectId)?.name ?? "No subject"}
                  {s.topicId && <span className="text-muted-foreground"> · {topics.find((x) => x.id === s.topicId)?.title}</span>}
                </span>
                <span className="tabular-nums text-muted-foreground">
                  {s.minutes} min · {format(s.endedAt, "HH:mm")}
                  {!s.completed && " (partial)"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
