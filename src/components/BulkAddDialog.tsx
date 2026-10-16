import { useState, type ReactNode } from "react";
import { FileUp, Loader2, Plus, Trash2, Wand2, X } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { norm } from "@/lib/logic";
import { useStudy } from "@/lib/store";
import { STATUS_LABEL, type Priority, type TopicStatus } from "@/lib/types";

interface DraftTopic {
  key: string;
  title: string;
  subjectKey: string;
}
interface DraftSubject {
  key: string;
  name: string;
}

const k = () => Math.random().toString(36).slice(2, 9);

function readAsDataUrl(file: File) {
  return new Promise<string>((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = () => rej(r.error);
    r.readAsDataURL(file);
  });
}

export function BulkAddDialog({ trigger }: { trigger: ReactNode }) {
  const { subjects, bulkAdd } = useStudy();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draftSubjects, setDraftSubjects] = useState<DraftSubject[] | null>(null);
  const [draftTopics, setDraftTopics] = useState<DraftTopic[]>([]);
  const [priority, setPriority] = useState<Priority>("medium");
  const [dueDate, setDueDate] = useState("");
  const [status, setStatus] = useState<TopicStatus>("not_started");

  const reset = () => {
    setText("");
    setFile(null);
    setError(null);
    setDraftSubjects(null);
    setDraftTopics([]);
    setLoading(false);
  };

  const parse = async () => {
    setError(null);
    setLoading(true);
    try {
      let payload: Record<string, unknown> = { text, existingSubjects: subjects.map((s) => s.name) };
      if (file) {
        if (file.size > 10 * 1024 * 1024) throw new Error("That file is over 10 MB. Try a smaller file or paste the text.");
        if (file.type.startsWith("text/") || /\.(txt|md|csv)$/i.test(file.name)) {
          payload["text"] = `${text}\n\n${await file.text()}`.trim();
        } else if (file.type === "application/pdf" || file.type.startsWith("image/")) {
          payload = { ...payload, file: { dataUrl: await readAsDataUrl(file), mediaType: file.type, name: file.name } };
        } else throw new Error("Please upload a .txt, PDF or image file.");
      }
      const res = await fetch("/api/bulk-parse", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
      const data = (await res.json().catch(() => null)) as { subjects?: { name: string; topics: string[] }[]; error?: string } | null;
      if (!res.ok || !data?.subjects) throw new Error(data?.error ?? "The AI response couldn't be read. Please try again.");
      if (data.subjects.length === 0) throw new Error("We couldn't find any subjects or topics in that. Try a format like “Chemistry: bonding, moles”.");
      const ds: DraftSubject[] = [];
      const dt: DraftTopic[] = [];
      for (const s of data.subjects) {
        const sk = k();
        ds.push({ key: sk, name: s.name });
        s.topics.forEach((t) => dt.push({ key: k(), title: t, subjectKey: sk }));
      }
      setDraftSubjects(ds);
      setDraftTopics(dt);
    } catch (e) {
      setError((e as Error).message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const confirm = () => {
    if (!draftSubjects) return;
    const draft = draftSubjects.map((s) => ({ name: s.name, topics: draftTopics.filter((t) => t.subjectKey === s.key).map((t) => t.title) }));
    const r = bulkAdd(draft, { priority, dueDate: dueDate || null, status });
    toast.success(`Added ${r.topics} topic${r.topics === 1 ? "" : "s"}${r.subjects ? ` and ${r.subjects} new subject${r.subjects === 1 ? "" : "s"}` : ""}`);
    setOpen(false);
    reset();
  };

  const existing = new Set(subjects.map((s) => norm(s.name)));

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Bulk add subjects & topics</DialogTitle>
          <DialogDescription>Paste a messy list or upload a syllabus. You'll review everything before it's saved.</DialogDescription>
        </DialogHeader>

        {!draftSubjects ? (
          <div className="space-y-4">
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={8}
              placeholder={"Chemistry: atomic structure, bonding, moles, organic basics\n\nMath - calculus (limits, derivatives, integrals), matrices, probability"}
            />
            <div className="flex flex-wrap items-center gap-2">
              <Label htmlFor="bulk-file" className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted">
                <FileUp className="size-4" /> Upload text, PDF or image
              </Label>
              <input
                id="bulk-file"
                type="file"
                accept=".txt,.md,.csv,text/plain,application/pdf,image/*"
                className="sr-only"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
              {file && (
                <span className="flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-xs text-secondary-foreground">
                  {file.name}
                  <button onClick={() => setFile(null)} aria-label="Remove file">
                    <X className="size-3" />
                  </button>
                </span>
              )}
            </div>
            {error && <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
            <DialogFooter>
              <Button onClick={parse} disabled={loading || (!text.trim() && !file)}>
                {loading ? <Loader2 className="animate-spin" /> : <Wand2 />}
                {loading ? "Reading your list…" : "Organize with AI"}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="grid grid-cols-1 gap-3 rounded-xl bg-muted/60 p-3 sm:grid-cols-3">
              <div className="space-y-1">
                <Label className="text-xs">Priority (all)</Label>
                <Select value={priority} onValueChange={(v) => setPriority(v as Priority)}>
                  <SelectTrigger className="bg-card">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs" htmlFor="bulk-due">
                  Due date (all)
                </Label>
                <Input id="bulk-due" type="date" className="bg-card" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Start as</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as TopicStatus)}>
                  <SelectTrigger className="bg-card">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(STATUS_LABEL).map(([key, v]) => (
                      <SelectItem key={key} value={key}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {draftSubjects.map((s) => (
              <div key={s.key} className="rounded-xl border p-3">
                <div className="mb-2 flex items-center gap-2">
                  <Input
                    value={s.name}
                    onChange={(e) => setDraftSubjects((d) => d!.map((x) => (x.key === s.key ? { ...x, name: e.target.value } : x)))}
                    className="font-semibold"
                    aria-label="Subject name"
                  />
                  {existing.has(norm(s.name)) && (
                    <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-[11px] font-semibold text-secondary-foreground">merges</span>
                  )}
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Remove subject"
                    onClick={() => {
                      setDraftSubjects((d) => d!.filter((x) => x.key !== s.key));
                      setDraftTopics((t) => t.filter((x) => x.subjectKey !== s.key));
                    }}
                  >
                    <Trash2 />
                  </Button>
                </div>
                <div className="space-y-1.5 pl-2">
                  {draftTopics
                    .filter((t) => t.subjectKey === s.key)
                    .map((t) => (
                      <div key={t.key} className="flex items-center gap-2">
                        <Input
                          value={t.title}
                          onChange={(e) => setDraftTopics((all) => all.map((x) => (x.key === t.key ? { ...x, title: e.target.value } : x)))}
                          className="h-8 text-sm"
                          aria-label="Topic title"
                        />
                        <select
                          value={t.subjectKey}
                          onChange={(e) => setDraftTopics((all) => all.map((x) => (x.key === t.key ? { ...x, subjectKey: e.target.value } : x)))}
                          className="h-8 max-w-32 rounded-md border bg-card px-2 text-xs"
                          aria-label="Move to subject"
                        >
                          {draftSubjects.map((o) => (
                            <option key={o.key} value={o.key}>
                              {o.name || "Untitled"}
                            </option>
                          ))}
                        </select>
                        <Button variant="ghost" size="icon-sm" aria-label="Remove topic" onClick={() => setDraftTopics((all) => all.filter((x) => x.key !== t.key))}>
                          <X />
                        </Button>
                      </div>
                    ))}
                  <Button variant="ghost" size="sm" onClick={() => setDraftTopics((all) => [...all, { key: k(), title: "", subjectKey: s.key }])}>
                    <Plus /> Add topic
                  </Button>
                </div>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => setDraftSubjects((d) => [...d!, { key: k(), name: "New subject" }])}>
              <Plus /> Add subject
            </Button>
            <DialogFooter className="gap-2">
              <Button variant="ghost" onClick={() => setDraftSubjects(null)}>
                Back
              </Button>
              <Button onClick={confirm} disabled={!draftSubjects.some((s) => s.name.trim())}>
                Confirm & Add ({draftTopics.filter((t) => t.title.trim()).length})
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
