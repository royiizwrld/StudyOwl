import { createFileRoute } from "@tanstack/react-router";
import { format } from "date-fns";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState, PageHeader, SubjectDot } from "@/components/ui-bits";
import { averagePct, pct } from "@/lib/logic";
import { useStudy } from "@/lib/store";
import { SCORE_TYPE_LABEL, type ScoreType, type TestScore } from "@/lib/types";

export const Route = createFileRoute("/scores")({
  head: () => ({
    meta: [
      { title: "Test Scores & Grades — Studyowl" },
      { name: "description", content: "Log major exams, practice tests, school CATs and quizzes, and track grade averages per subject." },
      { property: "og:title", content: "Test Scores & Grades — Studyowl" },
      { property: "og:description", content: "Log major exams, practice tests, school CATs and quizzes, and track grade averages per subject." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ScoresPage,
});

const tooltipStyle = { background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 12, color: "var(--popover-foreground)" };
const TYPES = Object.keys(SCORE_TYPE_LABEL) as ScoreType[];

function ScoreDialog({ score, trigger }: { score?: TestScore; trigger: ReactNode }) {
  const { subjects, addScore, updateScore } = useStudy();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ subjectId: "", title: "", type: "practice_test" as ScoreType, score: "", outOf: "100", date: "", notes: "" });
  useEffect(() => {
    if (!open) return;
    setF({
      subjectId: score?.subjectId ?? subjects[0]?.id ?? "",
      title: score?.title ?? "",
      type: score?.type ?? "practice_test",
      score: score ? String(score.score) : "",
      outOf: score ? String(score.outOf) : "100",
      date: score?.date ?? format(new Date(), "yyyy-MM-dd"),
      notes: score?.notes ?? "",
    });
  }, [open, score, subjects]);
  const s = Number(f.score), o = Number(f.outOf);
  const valid = f.subjectId && f.title.trim() && f.date && f.score !== "" && s >= 0 && o > 0 && s <= o;
  const save = () => {
    if (!valid) return;
    const v = { subjectId: f.subjectId, title: f.title.trim(), type: f.type, score: s, outOf: o, date: f.date, notes: f.notes.trim() || undefined };
    if (score) updateScore(score.id, v);
    else addScore(v);
    setOpen(false);
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{score ? "Edit score" : "Add test score"}</DialogTitle>
        </DialogHeader>
        {subjects.length === 0 ? (
          <p className="text-sm text-muted-foreground">Add a subject first, then log its scores here.</p>
        ) : (
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); save(); }}>
            <div className="space-y-2">
              <Label htmlFor="sc-title">Test name</Label>
              <Input id="sc-title" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="e.g. Mid-term exam" autoFocus />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Subject</Label>
                <Select value={f.subjectId} onValueChange={(v) => setF({ ...f, subjectId: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {subjects.map((x) => <SelectItem key={x.id} value={x.id}>{x.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={f.type} onValueChange={(v) => setF({ ...f, type: v as ScoreType })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TYPES.map((t) => <SelectItem key={t} value={t}>{SCORE_TYPE_LABEL[t]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label htmlFor="sc-score">Marks</Label>
                <Input id="sc-score" type="number" min={0} step="any" value={f.score} onChange={(e) => setF({ ...f, score: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sc-out">Out of</Label>
                <Input id="sc-out" type="number" min={1} step="any" value={f.outOf} onChange={(e) => setF({ ...f, outOf: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sc-date">Date</Label>
                <Input id="sc-date" type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} />
              </div>
            </div>
            {f.score !== "" && s > o && <p className="text-xs text-destructive">Marks can't be higher than the total.</p>}
            <div className="space-y-2">
              <Label htmlFor="sc-notes">Notes (optional)</Label>
              <Textarea id="sc-notes" rows={2} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={!valid}>{score ? "Save" : "Add score"}</Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string | undefined }) {
  return (
    <div className="card-surface p-5">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-3xl font-semibold">{value}</p>
      {hint && <p className="mt-1 truncate text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function ScoresPage() {
  const { scores, subjects, deleteScore } = useStudy();
  const [subj, setSubj] = useState("all");
  const [type, setType] = useState("all");
  const filtered = scores
    .filter((s) => (subj === "all" || s.subjectId === subj) && (type === "all" || s.type === type))
    .sort((a, b) => b.date.localeCompare(a.date));
  const overall = averagePct(filtered);
  const bySubject = subjects
    .map((s) => ({ name: s.name, color: s.color, avg: averagePct(filtered.filter((x) => x.subjectId === s.id)) }))
    .filter((x) => x.avg !== null) as { name: string; color: string; avg: number }[];
  const best = [...bySubject].sort((a, b) => b.avg - a.avg)[0];
  const byType = TYPES.map((t) => ({ name: SCORE_TYPE_LABEL[t], avg: averagePct(filtered.filter((x) => x.type === t)) ?? 0, n: filtered.filter((x) => x.type === t).length })).filter((x) => x.n);
  const trend = [...filtered].reverse().map((s) => ({ date: format(new Date(s.date + "T12:00:00"), "MMM d"), pct: Math.round(pct(s)), title: s.title }));

  return (
    <div>
      <PageHeader
        title="Scores & grades"
        subtitle="Log exams, practice tests, CATs and quizzes."
        actions={<ScoreDialog trigger={<Button size="sm"><Plus /> Add score</Button>} />}
      />
      <div className="mb-6 flex flex-wrap gap-2">
        <Select value={subj} onValueChange={setSubj}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All subjects</SelectItem>
            {subjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All test types</SelectItem>
            {TYPES.map((t) => <SelectItem key={t} value={t}>{SCORE_TYPE_LABEL[t]}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="No scores yet" body="Add your first test result to see averages and trends." />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Stat label="Average" value={`${overall}%`} />
            <Stat label="Strongest subject" value={best ? `${best.avg}%` : "—"} hint={best?.name} />
            <Stat label="Tests logged" value={String(filtered.length)} />
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <section className="card-surface p-5">
              <h2 className="mb-3 font-semibold">Average by subject</h2>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={bySubject}>
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} unit="%" />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--muted)" }} formatter={(v) => [`${v}%`, "Average"]} />
                  <Bar dataKey="avg" radius={[6, 6, 0, 0]}>
                    {bySubject.map((d) => <Cell key={d.name} fill={d.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </section>
            <section className="card-surface p-5">
              <h2 className="mb-3 font-semibold">Score trend</h2>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={trend}>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} unit="%" />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${v}%`, "Score"]} labelFormatter={(l, p) => `${l} · ${p?.[0]?.payload?.title ?? ""}`} />
                  <Line type="monotone" dataKey="pct" stroke="var(--primary)" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </section>
            <section className="card-surface p-5 lg:col-span-2">
              <h2 className="mb-3 font-semibold">Average by test type</h2>
              <div className="grid gap-3 sm:grid-cols-4">
                {byType.map((t) => (
                  <div key={t.name} className="rounded-lg bg-muted p-3">
                    <p className="text-xs text-muted-foreground">{t.name} · {t.n}</p>
                    <p className="font-display text-xl font-semibold">{t.avg}%</p>
                  </div>
                ))}
              </div>
            </section>
          </div>
          <section className="card-surface mt-4 p-2">
            <h2 className="px-3 py-2 font-semibold">History</h2>
            {filtered.map((s) => {
              const sub = subjects.find((x) => x.id === s.subjectId);
              return (
                <div key={s.id} className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-muted">
                  {sub && <SubjectDot color={sub.color} />}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{s.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {sub?.name} · {SCORE_TYPE_LABEL[s.type]} · {format(new Date(s.date + "T12:00:00"), "MMM d, yyyy")}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-display font-semibold">{Math.round(pct(s))}%</p>
                    <p className="text-xs text-muted-foreground">{s.score}/{s.outOf}</p>
                  </div>
                  <ScoreDialog score={s} trigger={<Button size="icon-sm" variant="ghost" aria-label="Edit score"><Pencil /></Button>} />
                  <Button size="icon-sm" variant="ghost" aria-label="Delete score" onClick={() => confirm(`Delete "${s.title}"?`) && deleteScore(s.id)}>
                    <Trash2 />
                  </Button>
                </div>
              );
            })}
          </section>
        </>
      )}
    </div>
  );
}
