import { useEffect, useState, type ReactNode } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useStudy } from "@/lib/store";
import { STATUS_LABEL, type Priority, type Task, type Topic, type TopicStatus } from "@/lib/types";

/** Create/edit a topic (kind="topic") or standalone task (kind="task"). */
export function ItemDialog({
  kind,
  topic,
  task,
  defaultSubjectId,
  trigger,
}: {
  kind: "topic" | "task";
  topic?: Topic;
  task?: Task;
  defaultSubjectId?: string;
  trigger: ReactNode;
}) {
  const { subjects, addTopic, updateTopic, addTask, updateTask } = useStudy();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [subjectId, setSubjectId] = useState<string>("none");
  const [priority, setPriority] = useState<Priority>("medium");
  const [dueDate, setDueDate] = useState("");
  const [status, setStatus] = useState<TopicStatus>("not_started");

  useEffect(() => {
    if (!open) return;
    const src = topic ?? task;
    setTitle(src?.title ?? "");
    setSubjectId(src?.subjectId ?? defaultSubjectId ?? (kind === "topic" ? subjects[0]?.id ?? "none" : "none"));
    setPriority(src?.priority ?? "medium");
    setDueDate(src?.dueDate ?? "");
    setStatus(topic?.status ?? "not_started");
  }, [open, topic, task, defaultSubjectId, kind, subjects]);

  const canSave = title.trim() && (kind === "task" || subjectId !== "none");
  const save = () => {
    if (!canSave) return;
    const base = { title: title.trim(), priority, dueDate: dueDate || null };
    if (kind === "topic") {
      if (topic) updateTopic(topic.id, { ...base, subjectId, status });
      else addTopic({ ...base, subjectId, status });
    } else {
      const sid = subjectId === "none" ? null : subjectId;
      if (task) updateTask(task.id, { ...base, subjectId: sid });
      else addTask({ ...base, subjectId: sid });
    }
    setOpen(false);
  };

  const editing = !!(topic || task);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {editing ? "Edit" : "New"} {kind}
          </DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="item-title">Title</Label>
            <Input id="item-title" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus placeholder={kind === "topic" ? "e.g. Organic chemistry basics" : "e.g. Submit essay"} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Subject</Label>
              <Select value={subjectId} onValueChange={setSubjectId}>
                <SelectTrigger>
                  <SelectValue placeholder="Subject" />
                </SelectTrigger>
                <SelectContent>
                  {kind === "task" && <SelectItem value="none">No subject</SelectItem>}
                  {subjects.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as Priority)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="item-due">Due date</Label>
              <Input id="item-due" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
            {kind === "topic" && (
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as TopicStatus)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(STATUS_LABEL).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          {kind === "topic" && subjects.length === 0 && (
            <p className="text-sm text-muted-foreground">Create a subject first.</p>
          )}
          <DialogFooter>
            <Button type="submit" disabled={!canSave}>
              {editing ? "Save" : `Add ${kind}`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
