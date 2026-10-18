import { format } from "date-fns";
import { useEffect, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useStudy } from "@/lib/store";
import { SCORE_TYPE_LABEL, type ExamPaper, type ExamPeriod, type GradeMethod, type ScoreType } from "@/lib/types";

export const SCORE_TYPES = Object.keys(SCORE_TYPE_LABEL) as ScoreType[];
const optNum = (v: string) => (v.trim() === "" ? null : Math.max(0, Math.min(100, Number(v))));

export function PeriodDialog({ period, trigger }: { period?: ExamPeriod; trigger: ReactNode }) {
  const { savePeriod } = useStudy();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ name: "", type: "major_exam" as ScoreType, startDate: "", endDate: "", target: "", method: "average" as GradeMethod, manualPct: "", gradingNotes: "", includeInOverall: true });
  useEffect(() => {
    if (!open) return;
    setF({
      name: period?.name ?? "",
      type: period?.type ?? "major_exam",
      startDate: period?.startDate ?? "",
      endDate: period?.endDate ?? "",
      target: period?.target != null ? String(period.target) : "",
      method: period?.method ?? "average",
      manualPct: period?.manualPct != null ? String(period.manualPct) : "",
      gradingNotes: period?.gradingNotes ?? "",
      includeInOverall: period?.includeInOverall ?? true,
    });
  }, [open, period]);
  const valid = f.name.trim() && (f.method !== "manual" || f.manualPct === "" || Number(f.manualPct) >= 0);
  const save = () => {
    if (!valid) return;
    savePeriod({
      ...(period ? { id: period.id } : {}),
      name: f.name.trim(),
      type: f.type,
      startDate: f.startDate || null,
      endDate: f.endDate || null,
      target: optNum(f.target),
      method: f.method,
      manualPct: optNum(f.manualPct),
      gradingNotes: f.gradingNotes.trim() || undefined,
      includeInOverall: f.includeInOverall,
      ...(period?.sample ? { sample: true } : {}),
    });
    setOpen(false);
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{period ? "Edit exam period" : "New exam period"}</DialogTitle>
          <DialogDescription>Group papers that are graded together, like Midterms or Mocks.</DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); save(); }}>
          <div className="space-y-2">
            <Label htmlFor="pe-name">Name</Label>
            <Input id="pe-name" autoFocus value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="e.g. Term 1 Midterms" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={f.type} onValueChange={(v) => setF({ ...f, type: v as ScoreType })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{SCORE_TYPES.map((t) => <SelectItem key={t} value={t}>{SCORE_TYPE_LABEL[t]}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pe-target">Target % (optional)</Label>
              <Input id="pe-target" type="number" min={0} max={100} value={f.target} onChange={(e) => setF({ ...f, target: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pe-start">Starts</Label>
              <Input id="pe-start" type="date" value={f.startDate} onChange={(e) => setF({ ...f, startDate: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pe-end">Ends</Label>
              <Input id="pe-end" type="date" value={f.endDate} onChange={(e) => setF({ ...f, endDate: e.target.value })} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>How is the overall grade worked out?</Label>
            <Select value={f.method} onValueChange={(v) => setF({ ...f, method: v as GradeMethod })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="average">Equal average of all papers</SelectItem>
                <SelectItem value="weighted">Weighted (set a weight on each paper)</SelectItem>
                <SelectItem value="manual">I'll type the final grade myself</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {f.method === "manual" && (
            <div className="space-y-2">
              <Label htmlFor="pe-manual">Final grade % (from your report)</Label>
              <Input id="pe-manual" type="number" min={0} max={100} value={f.manualPct} onChange={(e) => setF({ ...f, manualPct: e.target.value })} />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="pe-notes">Grading notes for Ollie (optional)</Label>
            <Textarea id="pe-notes" rows={2} value={f.gradingNotes} onChange={(e) => setF({ ...f, gradingNotes: e.target.value })} placeholder="e.g. Math counts 40%, English 30%, Physics 30%" />
          </div>
          <label className="flex items-center justify-between gap-3 rounded-lg bg-muted p-3 text-sm">
            Count towards my overall average
            <Switch checked={f.includeInOverall} onCheckedChange={(v) => setF({ ...f, includeInOverall: v })} />
          </label>
          <DialogFooter>
            <Button type="submit" disabled={!valid}>{period ? "Save" : "Create period"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function PaperDialog({ paper, periodId, trigger }: { paper?: ExamPaper; periodId?: string | null; trigger: ReactNode }) {
  const { subjects, examPeriods, scores, savePaper } = useStudy();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ periodId: "none", subjectId: "", title: "", type: "major_exam" as ScoreType, date: "", target: "", weight: "1", score: "", outOf: "100" });
  useEffect(() => {
    if (!open) return;
    const sc = scores.find((s) => s.id === paper?.scoreId);
    const pid = paper ? paper.periodId : periodId ?? null;
    const period = examPeriods.find((p) => p.id === pid);
    setF({
      periodId: pid ?? "none",
      subjectId: paper?.subjectId ?? subjects[0]?.id ?? "",
      title: paper?.title ?? "",
      type: paper?.type ?? period?.type ?? "major_exam",
      date: paper?.date ?? format(new Date(), "yyyy-MM-dd"),
      target: paper?.target != null ? String(paper.target) : "",
      weight: String(paper?.weight ?? 1),
      score: sc ? String(sc.score) : "",
      outOf: sc ? String(sc.outOf) : "100",
    });
  }, [open, paper, periodId, subjects, scores, examPeriods]);
  const s = Number(f.score), o = Number(f.outOf);
  const hasMarks = f.score.trim() !== "";
  const valid = f.subjectId && f.title.trim() && f.date && (!hasMarks || (s >= 0 && o > 0 && s <= o));
  const period = examPeriods.find((p) => p.id === f.periodId);
  const save = () => {
    if (!valid) return;
    savePaper(
      {
        ...(paper ? { id: paper.id } : {}),
        periodId: f.periodId === "none" ? null : f.periodId,
        subjectId: f.subjectId,
        title: f.title.trim(),
        type: f.type,
        date: f.date,
        target: optNum(f.target),
        weight: Math.max(0, Number(f.weight) || 0),
        ...(paper?.sample ? { sample: true } : {}),
      },
      hasMarks ? { score: s, outOf: o } : null,
    );
    setOpen(false);
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{paper ? "Edit exam" : "Add exam"}</DialogTitle>
          <DialogDescription>Add the marks whenever you get them — they'll show up in your scores automatically.</DialogDescription>
        </DialogHeader>
        {subjects.length === 0 ? (
          <p className="text-sm text-muted-foreground">Add a subject first.</p>
        ) : (
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); save(); }}>
            <div className="space-y-2">
              <Label htmlFor="pa-title">Exam name</Label>
              <Input id="pa-title" autoFocus value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="e.g. Math Paper 1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Subject</Label>
                <Select value={f.subjectId} onValueChange={(v) => setF({ ...f, subjectId: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{subjects.map((x) => <SelectItem key={x.id} value={x.id}>{x.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={f.type} onValueChange={(v) => setF({ ...f, type: v as ScoreType })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{SCORE_TYPES.map((t) => <SelectItem key={t} value={t}>{SCORE_TYPE_LABEL[t]}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Exam period</Label>
                <Select value={f.periodId} onValueChange={(v) => setF({ ...f, periodId: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None (single test)</SelectItem>
                    {examPeriods.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="pa-date">Date</Label>
                <Input id="pa-date" type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pa-target">Target % (optional)</Label>
                <Input id="pa-target" type="number" min={0} max={100} value={f.target} onChange={(e) => setF({ ...f, target: e.target.value })} />
              </div>
              {period?.method === "weighted" && (
                <div className="space-y-2">
                  <Label htmlFor="pa-weight">Weight</Label>
                  <Input id="pa-weight" type="number" min={0} step="any" value={f.weight} onChange={(e) => setF({ ...f, weight: e.target.value })} />
                </div>
              )}
            </div>
            <div className="rounded-lg bg-muted p-3">
              <p className="mb-2 text-sm font-medium">Actual result (optional)</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="pa-score" className="text-xs">Marks</Label>
                  <Input id="pa-score" type="number" min={0} step="any" value={f.score} onChange={(e) => setF({ ...f, score: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="pa-out" className="text-xs">Out of</Label>
                  <Input id="pa-out" type="number" min={1} step="any" value={f.outOf} onChange={(e) => setF({ ...f, outOf: e.target.value })} />
                </div>
              </div>
              {hasMarks && s > o && <p className="mt-2 text-xs text-destructive">Marks can't be higher than the total.</p>}
            </div>
            <DialogFooter>
              <Button type="submit" disabled={!valid}>{paper ? "Save" : "Add exam"}</Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
