import { createFileRoute } from "@tanstack/react-router";
import { format } from "date-fns";
import { Eye, EyeOff, Layers, Pencil, Plus, Target, Trash2, TrendingUp } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ExamBadge } from "@/components/ExamBadge";
import { PaperDialog, PeriodDialog } from "@/components/exams/ExamDialogs";
import { TargetValue } from "@/components/exams/TargetValue";
import { EmptyState, PageHeader, ProgressBar, SubjectDot } from "@/components/ui-bits";
import { averagePct, countedScores, daysUntil, pct, periodGrade } from "@/lib/logic";
import { useStudy } from "@/lib/store";
import { SCORE_TYPE_LABEL, type ExamPaper, type ExamPeriod, type ScoreType, type TestScore } from "@/lib/types";

export const Route = createFileRoute("/scores")({
  head: () => ({
    meta: [
      { title: "Scores & Exams — Studyowl" },
      { name: "description", content: "Plan exam periods, log test scores and CATs, set private targets and track grade averages." },
      { property: "og:title", content: "Scores & Exams — Studyowl" },
      { property: "og:description", content: "Plan exam periods, log test scores and CATs, set private targets and track grade averages." },
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
  const [f, setF] = useState({ subjectId: "", title: "", type: "practice_test" as ScoreType, score: "", outOf: "100", date: "", notes: "", include: true });
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
      include: score?.includeInAverage !== false,
    });
  }, [open, score, subjects]);
  const s = Number(f.score), o = Number(f.outOf);
  const valid = f.subjectId && f.title.trim() && f.date && f.score !== "" && s >= 0 && o > 0 && s <= o;
  const save = () => {
    if (!valid) return;
    const v = { subjectId: f.subjectId, title: f.title.trim(), type: f.type, score: s, outOf: o, date: f.date, notes: f.notes.trim() || undefined, includeInAverage: f.include };
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
            <label className="flex items-center justify-between gap-3 rounded-lg bg-muted p-3 text-sm">
              Count towards my overall average
              <Switch checked={f.include} onCheckedChange={(v) => setF({ ...f, include: v })} />
            </label>
            <DialogFooter>
              <Button type="submit" disabled={!valid}>{score ? "Save" : "Add score"}</Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Stat({ label, value, hint, extra }: { label: string; value: ReactNode; hint?: string | undefined; extra?: ReactNode }) {
  return (
    <div className="card-surface p-5">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        {extra}
      </div>
      <p className="mt-1 font-display text-3xl font-semibold">{value}</p>
      {hint && <p className="mt-1 truncate text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

const fmtDate = (iso: string) => format(new Date(iso + "T12:00:00"), "MMM d, yyyy");

function GoalsCard() {
  const { gradeGoals, setGradeGoals } = useStudy();
  const [draft, setDraft] = useState("");
  useEffect(() => setDraft(gradeGoals.overallTarget != null ? String(gradeGoals.overallTarget) : ""), [gradeGoals.overallTarget]);
  return (
    <section className="card-surface p-5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-semibold"><Target className="size-4 text-primary" /> Overall target</h2>
        <Button size="icon-sm" variant="ghost" aria-label={gradeGoals.maskTarget ? "Show target" : "Hide target"} onClick={() => setGradeGoals({ maskTarget: !gradeGoals.maskTarget })}>
          {gradeGoals.maskTarget ? <EyeOff /> : <Eye />}
        </Button>
      </div>
      <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); setGradeGoals({ overallTarget: draft.trim() === "" ? null : Math.max(0, Math.min(100, Number(draft))) }); }}>
        <Input
          aria-label="Overall target percent"
          type={gradeGoals.maskTarget ? "password" : "number"}
          min={0}
          max={100}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="e.g. 80"
        />
        <Button type="submit" size="sm" variant="secondary">Save</Button>
      </form>
      <label className="mt-4 flex items-start justify-between gap-3 text-sm">
        <span>
          <span className="font-medium">Gentle mode</span>
          <span className="block text-xs text-muted-foreground">Hide target vs. actual comparisons everywhere and keep the focus on progress.</span>
        </span>
        <Switch checked={gradeGoals.hideComparison} onCheckedChange={(v) => setGradeGoals({ hideComparison: v })} />
      </label>
    </section>
  );
}

function Compare({ actual, target }: { actual: number | null; target: number | null }) {
  const { gradeGoals } = useStudy();
  if (gradeGoals.hideComparison || actual == null || target == null) return null;
  const diff = actual - target;
  return (
    <span className={diff >= 0 ? "text-xs font-medium text-primary" : "text-xs text-muted-foreground"}>
      {diff >= 0 ? "Target reached 🎉" : gradeGoals.maskTarget ? "Keep going" : `${Math.abs(diff)}% to go`}
    </span>
  );
}

function PaperRow({ paper }: { paper: ExamPaper }) {
  const { subjects, scores, deletePaper, gradeGoals } = useStudy();
  const sub = subjects.find((x) => x.id === paper.subjectId);
  const sc = scores.find((s) => s.id === paper.scoreId);
  const actual = sc ? Math.round(pct(sc)) : null;
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg px-3 py-2 hover:bg-muted">
      {sub && <SubjectDot color={sub.color} />}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{paper.title}</p>
        <p className="text-xs text-muted-foreground">
          {sub?.name} · {fmtDate(paper.date)}
          {paper.target != null && !gradeGoals.hideComparison && <> · target <TargetValue value={paper.target} /></>}
        </p>
      </div>
      {!sc && <ExamBadge date={paper.date} />}
      {sc ? (
        <div className="text-right">
          <p className="font-display font-semibold">{actual}%</p>
          <Compare actual={actual} target={paper.target} />
        </div>
      ) : (
        <PaperDialog paper={paper} trigger={<Button size="xs" variant="secondary">Add marks</Button>} />
      )}
      <PaperDialog paper={paper} trigger={<Button size="icon-sm" variant="ghost" aria-label="Edit exam"><Pencil /></Button>} />
      <Button size="icon-sm" variant="ghost" aria-label="Delete exam" onClick={() => confirm(`Delete "${paper.title}"? Its marks will be removed from your scores too.`) && deletePaper(paper.id)}>
        <Trash2 />
      </Button>
    </div>
  );
}

const METHOD_LABEL = { average: "Equal average", weighted: "Weighted", manual: "Final grade entered" } as const;

function PeriodCard({ period }: { period: ExamPeriod }) {
  const { papers, scores, deletePeriod, gradeGoals } = useStudy();
  const list = papers.filter((p) => p.periodId === period.id).sort((a, b) => a.date.localeCompare(b.date));
  const marked = list.filter((p) => p.scoreId).length;
  const grade = periodGrade(period, papers, scores);
  return (
    <section className="card-surface p-4">
      <div className="flex flex-wrap items-start gap-3 px-1">
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-lg font-semibold">{period.name}</h3>
          <p className="text-xs text-muted-foreground">
            {SCORE_TYPE_LABEL[period.type]}
            {period.startDate && <> · {fmtDate(period.startDate)}{period.endDate && <> – {fmtDate(period.endDate)}</>}</>}
            {" · "}{METHOD_LABEL[period.method]}
            {!period.includeInOverall && " · not counted in overall"}
          </p>
          {period.gradingNotes && <p className="mt-1 text-xs italic text-muted-foreground">“{period.gradingNotes}”</p>}
        </div>
        <div className="text-right">
          <p className="font-display text-2xl font-semibold">{grade != null ? `${grade}%` : "—"}</p>
          <p className="text-xs text-muted-foreground">
            {marked} of {list.length} marked
            {period.target != null && !gradeGoals.hideComparison && <> · target <TargetValue value={period.target} /></>}
          </p>
          <Compare actual={grade} target={period.target} />
        </div>
      </div>
      {list.length > 0 && <div className="my-3"><ProgressBar value={(marked / list.length) * 100} /></div>}
      <div className="space-y-1">
        {list.length === 0 && <p className="px-3 py-2 text-sm text-muted-foreground">No papers yet — add one for each subject.</p>}
        {list.map((p) => <PaperRow key={p.id} paper={p} />)}
      </div>
      <div className="mt-2 flex flex-wrap gap-2 px-1">
        <PaperDialog periodId={period.id} trigger={<Button size="sm" variant="secondary"><Plus /> Add paper</Button>} />
        <PeriodDialog period={period} trigger={<Button size="sm" variant="ghost"><Pencil /> Edit</Button>} />
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            if (!confirm(`Delete "${period.name}" and its papers?`)) return;
            deletePeriod(period.id, confirm("Keep the marks already entered in your scores history?"));
          }}
        >
          <Trash2 /> Delete
        </Button>
      </div>
    </section>
  );
}

function ExamsTab() {
  const { examPeriods, papers } = useStudy();
  const single = papers.filter((p) => !p.periodId).sort((a, b) => a.date.localeCompare(b.date));
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <PeriodDialog trigger={<Button size="sm"><Layers /> New exam period</Button>} />
        <PaperDialog periodId={null} trigger={<Button size="sm" variant="secondary"><Plus /> Single exam</Button>} />
      </div>
      {examPeriods.length === 0 && single.length === 0 && (
        <EmptyState title="No exams planned" body="Create an exam period like 'Term 1 Midterms' and add a paper for each subject with its own date." />
      )}
      {examPeriods.map((p) => <PeriodCard key={p.id} period={p} />)}
      {single.length > 0 && (
        <section className="card-surface p-4">
          <h3 className="mb-2 px-1 font-semibold">Single exams & tests</h3>
          {single.map((p) => <PaperRow key={p.id} paper={p} />)}
        </section>
      )}
    </div>
  );
}

function TestsTab() {
  const { scores, subjects, deleteScore, updateScore } = useStudy();
  const [subj, setSubj] = useState("all");
  const [type, setType] = useState("all");
  const filtered = scores
    .filter((s) => (subj === "all" || s.subjectId === subj) && (type === "all" || s.type === type))
    .sort((a, b) => b.date.localeCompare(a.date));
  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        <ScoreDialog trigger={<Button size="sm"><Plus /> Add score</Button>} />
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
        <EmptyState title="No scores yet" body="Add a test result, or enter marks on an exam — it lands here automatically." />
      ) : (
        <section className="card-surface p-2">
          {filtered.map((s) => {
            const sub = subjects.find((x) => x.id === s.subjectId);
            return (
              <div key={s.id} className="flex flex-wrap items-center gap-3 rounded-lg px-3 py-2 hover:bg-muted">
                {sub && <SubjectDot color={sub.color} />}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{s.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {sub?.name} · {SCORE_TYPE_LABEL[s.type]} · {fmtDate(s.date)}
                    {s.paperId && " · from Exams"}
                  </p>
                </div>
                <label className="flex items-center gap-2 text-xs text-muted-foreground" title="Count towards overall average">
                  Counts
                  <Switch checked={s.includeInAverage !== false} onCheckedChange={(v) => updateScore(s.id, { includeInAverage: v })} aria-label="Count towards overall average" />
                </label>
                <div className="w-16 text-right">
                  <p className="font-display font-semibold">{Math.round(pct(s))}%</p>
                  <p className="text-xs text-muted-foreground">{s.score}/{s.outOf}</p>
                </div>
                {!s.paperId && <ScoreDialog score={s} trigger={<Button size="icon-sm" variant="ghost" aria-label="Edit score"><Pencil /></Button>} />}
                <Button size="icon-sm" variant="ghost" aria-label="Delete score" onClick={() => confirm(`Delete "${s.title}"?`) && deleteScore(s.id)}>
                  <Trash2 />
                </Button>
              </div>
            );
          })}
        </section>
      )}
    </div>
  );
}

function AnalyticsTab() {
  const { scores, subjects, papers, gradeGoals, examPeriods } = useStudy();
  const counted = countedScores(scores, examPeriods);
  if (counted.length === 0) return <EmptyState title="Nothing to chart yet" body="Once you log scores that count towards your average, charts appear here." />;
  const bySubject = subjects
    .map((s) => {
      const targets = papers.filter((p) => p.subjectId === s.id && p.target != null).map((p) => p.target as number);
      return {
        name: s.name,
        color: s.color,
        avg: averagePct(counted.filter((x) => x.subjectId === s.id)),
        target: targets.length ? Math.round(targets.reduce((a, b) => a + b, 0) / targets.length) : null,
      };
    })
    .filter((x) => x.avg !== null) as { name: string; color: string; avg: number; target: number | null }[];
  const byType = TYPES.map((t) => ({ name: SCORE_TYPE_LABEL[t], avg: averagePct(counted.filter((x) => x.type === t)) ?? 0, n: counted.filter((x) => x.type === t).length })).filter((x) => x.n);
  const sorted = [...counted].sort((a, b) => a.date.localeCompare(b.date));
  const trend = sorted.map((s) => ({ date: format(new Date(s.date + "T12:00:00"), "MMM d"), pct: Math.round(pct(s)), title: s.title }));
  const wins = subjects
    .map((s) => {
      const l = sorted.filter((x) => x.subjectId === s.id);
      if (l.length < 2) return null;
      const d = Math.round(pct(l[l.length - 1]!) - pct(l[l.length - 2]!));
      return d > 0 ? `${s.name} improved +${d}% since the previous test` : null;
    })
    .filter(Boolean) as string[];
  const showTargets = !gradeGoals.hideComparison && !gradeGoals.maskTarget && bySubject.some((b) => b.target != null);
  return (
    <div className="space-y-4">
      {wins.length > 0 && (
        <section className="card-surface p-5">
          <h2 className="mb-2 flex items-center gap-2 font-semibold"><TrendingUp className="size-4 text-primary" /> Wins</h2>
          <ul className="space-y-1 text-sm">{wins.map((w) => <li key={w}>• {w}</li>)}</ul>
        </section>
      )}
      <div className="grid items-start gap-4 lg:grid-cols-2">
        <section className="card-surface p-4 sm:p-5">
          <h2 className="mb-3 font-semibold">{showTargets ? "Average vs. target by subject" : "Average by subject"}</h2>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={bySubject} margin={{ left: -16, right: 4, top: 8 }}>
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} unit="%" />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--muted)" }} formatter={(v, n) => [`${v}%`, n === "target" ? "Target" : "Average"]} />
              <Bar dataKey="avg" radius={[6, 6, 0, 0]}>
                {bySubject.map((d) => <Cell key={d.name} fill={d.color} />)}
              </Bar>
              {showTargets && <Bar dataKey="target" radius={[6, 6, 0, 0]} fill="var(--muted-foreground)" fillOpacity={0.35} />}
            </BarChart>
          </ResponsiveContainer>
        </section>
        <section className="card-surface p-5">
          <h2 className="mb-3 font-semibold">Progress over time</h2>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={trend} margin={{ left: -16, right: 8, top: 8 }}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} unit="%" />
              <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${v}%`, "Score"]} labelFormatter={(l, p) => `${l} · ${p?.[0]?.payload?.title ?? ""}`} />
              <Line type="monotone" dataKey="pct" stroke="var(--primary)" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </section>
      </div>
      <section className="card-surface p-5">
        <h2 className="mb-3 font-semibold">Average by test type</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {byType.map((t) => (
            <div key={t.name} className="rounded-lg bg-muted p-3">
              <p className="text-xs text-muted-foreground">{t.name} · {t.n}</p>
              <p className="font-display text-xl font-semibold">{t.avg}%</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function OverviewTab() {
  const { scores, papers, subjects, examPeriods, gradeGoals } = useStudy();
  const counted = countedScores(scores, examPeriods);
  const overall = averagePct(counted);
  const upcoming = papers.filter((p) => !p.scoreId && daysUntil(p.date) >= 0).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 4);
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <Stat
          label="Overall average"
          value={overall != null ? `${overall}%` : "—"}
          hint={`${counted.length} result${counted.length === 1 ? "" : "s"} counted`}
          extra={<Compare actual={overall} target={gradeGoals.overallTarget} />}
        />
        <Stat
          label="Overall target"
          value={gradeGoals.overallTarget != null ? <TargetValue value={gradeGoals.overallTarget} /> : "—"}
          hint={gradeGoals.hideComparison ? "Gentle mode is on" : "Your end goal"}
        />
        <Stat label="Exams coming up" value={String(papers.filter((p) => !p.scoreId && daysUntil(p.date) >= 0).length)} hint={upcoming[0] ? `Next: ${upcoming[0].title}` : undefined} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <GoalsCard />
        <section className="card-surface p-5">
          <h2 className="mb-2 font-semibold">Next up</h2>
          {upcoming.length === 0 ? (
            <p className="text-sm text-muted-foreground">No upcoming exams. Plan them in the Exams tab.</p>
          ) : (
            <ul className="space-y-2">
              {upcoming.map((p) => {
                const sub = subjects.find((s) => s.id === p.subjectId);
                return (
                  <li key={p.id} className="flex items-center gap-2 text-sm">
                    {sub && <SubjectDot color={sub.color} />}
                    <span className="min-w-0 flex-1 truncate">{p.title}</span>
                    <ExamBadge date={p.date} />
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function ScoresPage() {
  return (
    <div>
      <PageHeader title="Scores & exams" subtitle="Plan exams, log results and watch your progress." />
      <Tabs defaultValue="overview">
        <TabsList className="mb-4 grid h-auto w-full grid-cols-4 sm:inline-flex sm:w-auto">
          <TabsTrigger value="overview" className="px-1 text-xs sm:px-3 sm:text-sm">Overview</TabsTrigger>
          <TabsTrigger value="exams" className="px-1 text-xs sm:px-3 sm:text-sm">Exams</TabsTrigger>
          <TabsTrigger value="tests" className="px-1 text-xs sm:px-3 sm:text-sm">Tests</TabsTrigger>
          <TabsTrigger value="analytics" className="px-1 text-xs sm:px-3 sm:text-sm">Analytics</TabsTrigger>
        </TabsList>
        <TabsContent value="overview"><OverviewTab /></TabsContent>
        <TabsContent value="exams"><ExamsTab /></TabsContent>
        <TabsContent value="tests"><TestsTab /></TabsContent>
        <TabsContent value="analytics"><AnalyticsTab /></TabsContent>
      </Tabs>
    </div>
  );
}
