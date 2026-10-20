import { createFileRoute } from "@tanstack/react-router";
import { Bar, BarChart, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { EmptyState, PageHeader } from "@/components/ui-bits";
import { minutesBySubject, minutesInRange, subjectProgress, todayStart, weekStart } from "@/lib/logic";
import { useStudy } from "@/lib/store";
import { HistoryReport } from "@/components/HistoryReport";

export const Route = createFileRoute("/stats")({
  head: () => ({
    meta: [
      { title: "Statistics — Studyowl" },
      { name: "description", content: "Focus minutes per subject and how many topics you've understood." },
      { property: "og:title", content: "Statistics — Studyowl" },
      { property: "og:description", content: "Focus minutes per subject and how many topics you've understood." },
    ],
  }),
  component: StatsPage,
});

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card-surface p-5">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-3xl font-semibold">{value}</p>
    </div>
  );
}

const tooltipStyle = { background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 12, color: "var(--popover-foreground)" };

function StatsPage() {
  const { sessions, subjects, topics } = useStudy();
  const bySubject = minutesBySubject(sessions);
  const donut = [
    ...subjects.map((s) => ({ name: s.name, value: bySubject.get(s.id) ?? 0, color: s.color })),
    { name: "No subject", value: bySubject.get(null) ?? 0, color: "var(--muted-foreground)" },
  ].filter((d) => d.value > 0);
  const progress = subjects.map((s) => {
    const p = subjectProgress(topics, s.id);
    return { name: s.name, Understood: p.understood, Remaining: p.total - p.understood };
  });
  const total = sessions.reduce((a, s) => a + s.minutes, 0);

  return (
    <div>
      <PageHeader title="Statistics" subtitle="Where your focus time goes." />
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Today" value={`${minutesInRange(sessions, todayStart())} min`} />
        <Stat label="This week" value={`${minutesInRange(sessions, weekStart())} min`} />
        <Stat label="All time" value={`${Math.round((total / 60) * 10) / 10} h`} />
        <Stat label="Sessions" value={String(sessions.filter((s) => s.completed).length)} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card-surface p-5">
          <h2 className="mb-4 font-semibold">Focus minutes by subject</h2>
          {donut.length === 0 ? (
            <EmptyState title="No focus time yet" body="Finish a Pomodoro session to see it here." />
          ) : (
            <div className="h-64 sm:h-72">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={donut} dataKey="value" nameKey="name" innerRadius="55%" outerRadius="85%" paddingAngle={2} stroke="none">
                    {donut.map((d) => (
                      <Cell key={d.name} fill={d.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => `${v} min`} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>
        <section className="card-surface p-5">
          <h2 className="mb-4 font-semibold">Understood vs. remaining topics</h2>
          {progress.length === 0 ? (
            <EmptyState title="No subjects yet" />
          ) : (
            <div className="h-64 sm:h-72">
              <ResponsiveContainer>
                <BarChart data={progress} layout="vertical" margin={{ left: 10 }}>
                  <XAxis type="number" allowDecimals={false} stroke="var(--muted-foreground)" fontSize={12} />
                  <YAxis type="category" dataKey="name" width={110} stroke="var(--muted-foreground)" fontSize={12} />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--muted)" }} />
                  <Legend />
                  <Bar dataKey="Understood" stackId="a" fill="var(--chart-1)" radius={[4, 0, 0, 4]} />
                  <Bar dataKey="Remaining" stackId="a" fill="var(--heat-0)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>
      </div>
      <HistoryReport />
    </div>
  );
}
