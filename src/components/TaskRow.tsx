import { format, isBefore, startOfDay } from "date-fns";
import { CalendarDays, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ItemDialog } from "@/components/ItemDialog";
import { PriorityBadge, SubjectDot } from "@/components/ui-bits";
import { cn } from "@/lib/utils";
import { useStudy } from "@/lib/store";
import type { Task } from "@/lib/types";

export function TaskRow({ task }: { task: Task }) {
  const { subjects, updateTask, deleteTask } = useStudy();
  const subject = subjects.find((s) => s.id === task.subjectId);
  const overdue = task.dueDate && !task.done && isBefore(new Date(task.dueDate + "T23:59:59"), startOfDay(new Date()));
  return (
    <div className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-muted/60">
      <Checkbox checked={task.done} onCheckedChange={(v) => updateTask(task.id, { done: !!v })} aria-label="Done" className="size-5" />
      <div className="min-w-0 flex-1">
        <p className={cn("truncate font-medium", task.done && "text-muted-foreground line-through")}>{task.title}</p>
        <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {subject && (
            <span className="flex items-center gap-1.5">
              <SubjectDot color={subject.color} className="size-2" />
              {subject.name}
            </span>
          )}
          <PriorityBadge p={task.priority} />
          {task.dueDate && (
            <span className={cn("flex items-center gap-1", overdue && "font-semibold text-destructive")}>
              <CalendarDays className="size-3" />
              {format(new Date(task.dueDate + "T12:00:00"), "MMM d")}
              {overdue && " · overdue"}
            </span>
          )}
        </div>
      </div>
      <ItemDialog
        kind="task"
        task={task}
        trigger={
          <Button variant="ghost" size="icon-sm" aria-label="Edit task" className="text-muted-foreground">
            <Pencil />
          </Button>
        }
      />
      <Button variant="ghost" size="icon-sm" aria-label="Delete task" className="text-muted-foreground" onClick={() => deleteTask(task.id)}>
        <Trash2 />
      </Button>
    </div>
  );
}
