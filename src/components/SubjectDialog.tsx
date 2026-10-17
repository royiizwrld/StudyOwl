import { useEffect, useState, type ReactNode } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useStudy } from "@/lib/store";
import { colorAt, SUBJECT_COLORS, type Subject } from "@/lib/types";

export function SubjectDialog({ subject, trigger }: { subject?: Subject; trigger: ReactNode }) {
  const { addSubject, updateSubject, subjects } = useStudy();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState(colorAt(0));
  const [exam, setExam] = useState("");
  useEffect(() => {
    if (open) {
      setName(subject?.name ?? "");
      setColor(subject?.color ?? colorAt(subjects.length));
      setExam(subject?.examDate ?? "");
    }
  }, [open, subject, subjects.length]);
  const save = () => {
    if (!name.trim()) return;
    if (subject) updateSubject(subject.id, { name: name.trim(), color, examDate: exam || null });
    else {
      const s = addSubject(name, color);
      if (exam) updateSubject(s.id, { examDate: exam });
    }
    setOpen(false);
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{subject ? "Edit subject" : "New subject"}</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="subj-name">Name</Label>
            <Input id="subj-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Chemistry" autoFocus />
          </div>
          <div className="space-y-2">
            <Label htmlFor="subj-exam">Exam date (optional)</Label>
            <Input id="subj-exam" type="date" value={exam} onChange={(e) => setExam(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Color</Label>
            <div className="flex flex-wrap gap-2">
              {SUBJECT_COLORS.map((c) => (
                <button
                  type="button"
                  key={c}
                  aria-label="Pick color"
                  onClick={() => setColor(c)}
                  className={cn("size-8 rounded-full ring-offset-2 ring-offset-background transition", color === c && "ring-2 ring-ring")}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={!name.trim()}>
              {subject ? "Save" : "Create subject"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
