import { Check, Pencil, Trash2, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { SubjectDot } from "@/components/ui-bits";
import { cn } from "@/lib/utils";
import { useStudy } from "@/lib/store";
import type { Objective } from "@/lib/types";

/** `creditAt` = timestamp to stamp when ticking (used when viewing a past day). */
export function ObjectiveRow({ o, creditAt, editable = true }: { o: Objective; creditAt?: number | undefined; editable?: boolean }) {
  const { subjects, setObjectiveDone, updateObjective, deleteObjective } = useStudy();
  const subject = subjects.find((s) => s.id === o.subjectId);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(o.title);
  if (editing)
    return (
      <form
        className="flex items-center gap-2 rounded-xl px-2 py-1.5"
        onSubmit={(e) => {
          e.preventDefault();
          if (title.trim()) updateObjective(o.id, { title: title.trim() });
          setEditing(false);
        }}
      >
        <Input value={title} onChange={(e) => setTitle(e.target.value)} autoFocus className="h-9" aria-label="Objective" />
        <Button type="submit" size="icon-sm" aria-label="Save"><Check /></Button>
        <Button type="button" variant="ghost" size="icon-sm" aria-label="Cancel" onClick={() => setEditing(false)}><X /></Button>
      </form>
    );
  return (
    <div className="group flex items-start gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-muted/60">
      <Checkbox checked={o.done} onCheckedChange={(v) => setObjectiveDone(o.id, !!v, creditAt)} aria-label="Done" className="mt-0.5 size-5" />
      <div className="min-w-0 flex-1">
        <p className={cn("text-sm leading-snug", o.done && "text-muted-foreground line-through")}>{o.title}</p>
        {subject && (
          <span className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
            <SubjectDot color={subject.color} className="size-2" />
            {subject.name}
          </span>
        )}
      </div>
      {editable && (
        <>
          <Button variant="ghost" size="icon-sm" aria-label="Edit objective" className="text-muted-foreground" onClick={() => { setTitle(o.title); setEditing(true); }}>
            <Pencil />
          </Button>
          <Button variant="ghost" size="icon-sm" aria-label="Delete objective" className="text-muted-foreground" onClick={() => deleteObjective(o.id)}>
            <Trash2 />
          </Button>
        </>
      )}
    </div>
  );
}
