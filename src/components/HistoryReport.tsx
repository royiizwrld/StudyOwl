import { useMemo, useState } from "react";
import { addDays, addMonths, addWeeks, addYears, format } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { PriorityBadge, SubjectDot } from "@/components/ui-bits";
import { pct, periodRange, sessionsIn, tasksDueIn, type PeriodKind } from "@/lib/logic";
import { useStudy } from "@/lib/store";
import { cn } from "@/lib/utils";

const KINDS: { k: PeriodKind; label: string }[] = [
  { k: "day", label: "Day" },
  { k: "week", label: "Week" },
  { k: "month", label: "Month" },
  { k: "year", label: "Year" },
];
const tooltipStyle = { background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 12, color: "var(--popover-foreground)" };

function shift(kind: PeriodKind, d: Date, n: number) {
  return kind === "day" ? addDays(d, n) : kind === "week" ? addWeeks(d, n) : kind === "month" ? addMonths(d, n) : addYears(d, n);
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-muted p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-display text-xl font-semibold">{value}</p>
    </div>
  );
}

export function HistoryReport() {
  const { sessions, tasks, subjects, topics, scores, dailyGoal, updateTask } = useStudy();
  const [kind, setKind] = useState<PeriodKind>("day");
  const [anchor, setAnchor] = useState(() => new Date());
  const r = periodRange(kind, anchor);
  const isFuture = r.start > Date.now();

  const report = useMemo(() => {
    const ss = sessionsIn(sessions, r);
    const minutes = ss.reduce((a, s) => a + s.minutes, 0);
    const due = tasksDueIn(tasks, r).sort((a, b) => (a.dueDate ?? "").localeCompare(b.dueDate ?? ""));
    const doneIn = tasks.filter((t) => t.done && t.completedAt && t.completedAt >= r.start && t.completedAt < r.end).length;
    const understood = topics.filter((t) => t.understoodAt && t.understoodAt >= r.start && t.understoodAt < r.end).length;
    const sc = scores.filter((s) => { const ms = new Date(s.date + "T12:00:00").getTime(); return ms >= r.start && ms < r.end; });
    const bySub = subjects
      .map((s) => ({ name: s.name, color: s.color, min: ss.filter((x) => x.subjectId === s.id).reduce((a, x) => a + x.minutes, 0) }))
      .filter((x) => x.min > 0)
      .sort((a, b) => b.min - a.min);
    // chart buckets
    let buckets: { label: string; min: number }[] = [];
    if (kind === "week" || kind === "month") {
      for (let t = r.start; t < r.end; t = addDays(new Date(t), 1).getTime()) {
        const e = addDays(new Date(t), 1).getTime();
        buckets.push({ label: format(t, kind === "week" ? "EEE" : "d"), min: ss.filter((s) => s.startedAt >= t && s.startedAt < e).reduce((a, s) => a + s.minutes, 0) });
      }
    } else if (kind === "year") {
      buckets = Array.from({ length: 12 }, (_, m) => {
        const s = new Date(new Date(r.start).getFullYear(), m, 1).getTime();
        const e = new Date(new Date(r.start).getFullYear(), m + 1, 1).getTime();
        return { label: format(s, "MMM"), min: ss.filter((x) => x.startedAt >= s && x.startedAt < e).reduce((a, x) => a + x.minutes, 0) };
      });
    }
    const days = Math.round((Math.min(r.end, Date.now()) - r.start) / 86400000) || 1;
    const activeDays = new Set(ss.map((s) => format(s.startedAt, "yyyy-MM-dd"))).size;
    const best = buckets.reduce((b, x) => (x.min > (b?.min ?? 0) ? x : b), null as null | { label: string; min: number });
    return { ss, minutes, due, doneIn, understood, sc, bySub, buckets, days: Math.max(1, days), activeDays, best };
  }, [sessions, tasks, topics, scores, subjects, kind, r.start, r.end]);

  const title =
    kind === "day" ? format(r.start, "EEEE, MMM d yyyy")
    : kind === "week" ? `${format(r.start, "MMM d")} – ${format(r.end - 1, "MMM d, yyyy")}`
    : kind === "month" ? format(r.start, "MMMM yyyy")
    : format(r.start, "yyyy");
  const hours = (m: number) => (m >= 120 ? `${Math.round((m / 60) * 10) / 10} h` : `${m} min`);
  const doneDue = report.due.filter((t) => t.done).length;
  const avgScore = report.sc.length ? Math.round(report.sc.reduce((a, s) => a + pct(s), 0) / report.sc.length) : null;

  return (
    <section className="card-surface mt-6 p-4 sm:p-5">
      <h2 className="font-semibold">History & reports</h2>
      <p className="mb-3 text-xs text-muted-foreground">Look back at any day, week, month or year. Forgot to tick something? Fix it here.</p>
      <div className="mb-3 grid grid-cols-4 gap-1 rounded-lg bg-muted p-1">
        {KINDS.map(({ k, label }) => (
          <button key={k} onClick={() => setKind(k)} className={cn("rounded-md py-1.5 text-sm font-medium text-muted-foreground", kind === k && "bg-background text-foreground shadow")}>
            {label}
          </button>
        ))}
      </div>
      <div className="mb-4 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2">
        <Button size="icon-sm" variant="ghost" aria-label="Previous" onClick={() => setAnchor((d) => shift(kind, d, -1))}><ChevronLeft /></Button>
        <div className="min-w-0 text-center">
          <p className="truncate font-display font-semibold">{title}</p>
          <Input
            type="date"
            aria-label="Pick a date"
            className="mx-auto mt-1 h-8 w-40 text-xs"
            value={format(anchor, "yyyy-MM-dd")}
            onChange={(e) => e.target.value && setAnchor(new Date(e.target.value + "T12:00:00"))}
          />
        </div>
        <Button size="icon-sm" variant="ghost" aria-label="Next" onClick={() => setAnchor((d) => shift(kind, d, 1))}><ChevronRight /></Button>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Mini label="Focus time" value={hours(report.minutes)} />
        <Mini label="Sessions" value={String(report.ss.length)} />
        {kind === "day" ? (
          <Mini label="Daily goal" value={`${Math.min(100, Math.round((report.minutes / dailyGoal) * 100))}%`} />
        ) : (
          <Mini label="Active days" value={`${report.activeDays}/${report.days}`} />
        )}
        <Mini label="Tasks done" value={report.due.length ? `${doneDue}/${report.due.length} due` : String(report.doneIn)} />
        <Mini label="Topics understood" value={String(report.understood)} />
        <Mini label="Tests logged" value={String(report.sc.length)} />
        {avgScore != null && <Mini label="Average score" value={`${avgScore}%`} />}
        {kind !== "day" && report.minutes > 0 && <Mini label="Daily average" value={`${Math.round(report.minutes / report.days)} min`} />}
      </div>

      {report.minutes > 0 && (
        <p className="mt-3 text-sm text-primary">
          {kind === "day" ? "Nice work showing up today." : report.best ? `Best ${kind === "year" ? "month" : "day"}: ${report.best.label} with ${hours(report.best.min)}.` : ""}
          {report.bySub[0] && ` Most time on ${report.bySub[0].name}.`}
        </p>
      )}
      {isFuture && <p className="mt-3 text-sm text-muted-foreground">This period hasn't happened yet — you'll see the tasks planned for it below.</p>}

      {report.buckets.length > 0 && report.minutes > 0 && (
        <div className="mt-4 h-48">
          <ResponsiveContainer>
            <BarChart data={report.buckets} margin={{ left: -20, right: 4, top: 4 }}>
              <XAxis dataKey="label" fontSize={11} stroke="var(--muted-foreground)" interval="preserveStartEnd" />
              <YAxis fontSize={11} stroke="var(--muted-foreground)" allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--muted)" }} formatter={(v) => [`${v} min`, "Focus"]} />
              <Bar dataKey="min" fill="var(--primary)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {report.bySub.length > 0 && (
        <div className="mt-4">
          <h3 className="mb-2 text-sm font-semibold">Focus by subject</h3>
          <ul className="space-y-2">
            {report.bySub.map((s) => (
              <li key={s.name} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 text-sm">
                <SubjectDot color={s.color} />
                <div className="min-w-0">
                  <p className="truncate">{s.name}</p>
                  <div className="mt-1 h-1.5 rounded-full bg-muted"><div className="h-full rounded-full" style={{ width: `${(s.min / report.minutes) * 100}%`, background: s.color }} /></div>
                </div>
                <span className="tabular-nums text-muted-foreground">{s.min} min</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-4">
        <h3 className="mb-2 text-sm font-semibold">Tasks due {kind === "day" ? "this day" : `this ${kind}`}</h3>
        {report.due.length === 0 ? (
          <p className="text-sm text-muted-foreground">No tasks were due.</p>
        ) : (
          <ul className="space-y-1">
            {report.due.map((t) => {
              const sub = subjects.find((s) => s.id === t.subjectId);
              return (
                <li key={t.id} className="flex min-w-0 items-center gap-3 rounded-lg px-2 py-2 hover:bg-muted">
                  <Checkbox
                    checked={t.done}
                    onCheckedChange={(v) => updateTask(t.id, { done: !!v, completedAt: v ? new Date(t.dueDate + "T18:00:00").getTime() : null })}
                    aria-label={`Mark ${t.title} done`}
                    className="size-5 shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <p className={cn("truncate text-sm font-medium", t.done && "text-muted-foreground line-through")}>{t.title}</p>
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      {sub && <SubjectDot color={sub.color} />}{sub?.name ?? "No subject"}{kind !== "day" && t.dueDate && ` · ${format(new Date(t.dueDate + "T12:00:00"), "MMM d")}`}
                    </p>
                  </div>
                  <span className="shrink-0"><PriorityBadge p={t.priority} /></span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      {report.sc.length > 0 && (
        <div className="mt-4">
          <h3 className="mb-2 text-sm font-semibold">Results</h3>
          <ul className="space-y-1 text-sm">
            {report.sc.map((s) => (
              <li key={s.id} className="flex justify-between gap-2"><span className="truncate">{s.title}</span><span className="shrink-0 font-medium">{Math.round(pct(s))}%</span></li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
