import { addDays, format } from "date-fns";
import { FileUp, Loader2, Plus, Sparkles, Trash2, Wand2 } from "lucide-react";
import { useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { assignWeeks, parseObjectiveText, weekKey } from "@/lib/logic";
import { useStudy } from "@/lib/store";

type DraftWeek = { title: string; subjectId: string | null; objectives: string[] };

function readAsDataUrl(file: File) {
  return new Promise<string>((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = () => rej(r.error);
    r.readAsDataURL(file);
  });
}

export function ObjectivesDialog({ trigger, defaultWeek }: { trigger: ReactNode; defaultWeek?: string }) {
  const { subjects, addObjectives } = useStudy();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [first, setFirst] = useState(defaultWeek ?? weekKey(new Date()));
  const [weeks, setWeeks] = useState<DraftWeek[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const reset = () => { setText(""); setFile(null); setWeeks(null); setError(null); setFirst(defaultWeek ?? weekKey(new Date())); };
  const matchSubject = (name: string | null) => (name ? subjects.find((s) => s.name.toLowerCase() === name.toLowerCase())?.id ?? null : null);

  const splitLocally = () => {
    const w = parseObjectiveText(text);
    if (!w.length) return setError("Nothing to add yet. Type one objective per line, with optional \"Week 2:\" headings.");
    setError(null);
    setWeeks(w.map((x) => ({ title: x.title, subjectId: null, objectives: x.objectives })));
  };

  const readWithAI = async () => {
    setBusy(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = { text: text.trim() || undefined, existingSubjects: subjects.map((s) => s.name) };
      if (file) {
        if (file.size > 10_000_000) throw new Error("That file is over 10 MB. Try a smaller one.");
        if (file.type.startsWith("text/") || /\.(txt|md|csv)$/i.test(file.name)) payload["text"] = `${text}\n${await file.text()}`;
        else payload["file"] = { dataUrl: await readAsDataUrl(file), mediaType: file.type || "application/pdf", name: file.name };
      }
      const res = await fetch("/api/objectives-parse", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
      const body = (await res.json().catch(() => ({}))) as { weeks?: { title: string; subject: string | null; objectives: string[] }[]; error?: string };
      if (!res.ok || !body.weeks) throw new Error(body.error ?? "Something went wrong. Please try again.");
      setWeeks(body.weeks.map((w) => ({ title: w.title, subjectId: matchSubject(w.subject), objectives: w.objectives })));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const keys = weeks ? assignWeeks(first, weeks.length) : [];
  const total = weeks?.reduce((n, w) => n + w.objectives.filter((o) => o.trim()).length, 0) ?? 0;
  const edit = (i: number, fn: (w: DraftWeek) => DraftWeek) => setWeeks((ws) => ws && ws.map((w, j) => (j === i ? fn(w) : w)));

  const confirm = () => {
    if (!weeks) return;
    addObjectives(weeks.flatMap((w, i) => w.objectives.filter((o) => o.trim()).map((title) => ({ weekStart: keys[i]!, weekTitle: w.title, title, subjectId: w.subjectId }))));
    toast.success(`Added ${total} objective${total === 1 ? "" : "s"} across ${weeks.length} week${weeks.length === 1 ? "" : "s"}`);
    setOpen(false);
    reset();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add weekly objectives</DialogTitle>
          <DialogDescription>Type or paste your list, or upload your course guide and let Ollie read it. Nothing is saved until you confirm.</DialogDescription>
        </DialogHeader>

        {!weeks ? (
          <div className="space-y-3">
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={8}
              placeholder={"Week 1: Cardiology\n1. Describe the cardiac cycle\n2. Explain Starling's law\nWeek 2: Renal\n1. Outline glomerular filtration"}
            />
            <div className="flex flex-wrap items-center gap-2">
              <input ref={fileRef} type="file" hidden accept=".txt,.md,.csv,text/plain,application/pdf,image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
              <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                <FileUp /> {file ? file.name.slice(0, 28) : "Upload PDF or photo"}
              </Button>
              {file && <Button variant="ghost" size="sm" onClick={() => setFile(null)}>Remove file</Button>}
            </div>
            {error && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
            <DialogFooter className="gap-2 sm:gap-2">
              <Button variant="outline" onClick={splitLocally} disabled={!text.trim() || busy}>
                <Wand2 /> Split by week headings
              </Button>
              <Button onClick={readWithAI} disabled={(!text.trim() && !file) || busy}>
                {busy ? <Loader2 className="animate-spin" /> : <Sparkles />} {busy ? "Reading…" : "Read with Ollie"}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-end gap-3 rounded-xl bg-muted/60 p-3">
              <div className="space-y-1">
                <Label htmlFor="firstweek">First week starts</Label>
                <Input id="firstweek" type="date" value={first} onChange={(e) => e.target.value && setFirst(e.target.value)} className="h-9 w-44" />
              </div>
              <p className="pb-2 text-xs text-muted-foreground">Each following week is placed one calendar week later.</p>
            </div>
            {weeks.map((w, i) => (
              <div key={i} className="card-surface space-y-2 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Input value={w.title} onChange={(e) => edit(i, (x) => ({ ...x, title: e.target.value }))} className="h-9 min-w-0 flex-1 font-semibold" aria-label="Week title" />
                  <select
                    value={w.subjectId ?? ""}
                    onChange={(e) => edit(i, (x) => ({ ...x, subjectId: e.target.value || null }))}
                    className="h-9 rounded-md border bg-card px-2 text-sm"
                    aria-label="Subject"
                  >
                    <option value="">No subject</option>
                    {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                  <Button variant="ghost" size="icon-sm" aria-label="Remove week" onClick={() => setWeeks((ws) => ws && ws.filter((_, j) => j !== i))}><Trash2 /></Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(keys[i] + "T12:00:00"), "MMM d")} – {format(addDays(new Date(keys[i] + "T12:00:00"), 6), "MMM d")}
                </p>
                {w.objectives.map((o, k) => (
                  <div key={k} className="flex items-center gap-2">
                    <Input value={o} onChange={(e) => edit(i, (x) => ({ ...x, objectives: x.objectives.map((y, m) => (m === k ? e.target.value : y)) }))} className="h-9" aria-label="Objective" />
                    <Button variant="ghost" size="icon-sm" aria-label="Remove objective" onClick={() => edit(i, (x) => ({ ...x, objectives: x.objectives.filter((_, m) => m !== k) }))}><Trash2 /></Button>
                  </div>
                ))}
                <Button variant="ghost" size="sm" onClick={() => edit(i, (x) => ({ ...x, objectives: [...x.objectives, ""] }))}><Plus /> Objective</Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => setWeeks((ws) => [...(ws ?? []), { title: `Week ${(ws?.length ?? 0) + 1}`, subjectId: null, objectives: [""] }])}><Plus /> Add week</Button>
            <DialogFooter className="gap-2 sm:gap-2">
              <Button variant="ghost" onClick={() => setWeeks(null)}>Back</Button>
              <Button onClick={confirm} disabled={!total}>Confirm & Add {total}</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
