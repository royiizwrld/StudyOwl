import { format } from "date-fns";
import { Bookmark, BookmarkCheck, CalendarDays, Check, Circle, CircleDot, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ItemDialog } from "@/components/ItemDialog";
import { PriorityBadge, SubjectDot } from "@/components/ui-bits";
import { cn } from "@/lib/utils";
import { useStudy } from "@/lib/store";
import { STATUS_LABEL, type Topic, type TopicStatus } from "@/lib/types";

const NEXT: Record<TopicStatus, TopicStatus> = { not_started: "studying", studying: "understood", understood: "not_started" };

export function StatusButton({ topic }: { topic: Topic }) {
  const { setStatus } = useStudy();
  const Icon = topic.status === "understood" ? Check : topic.status === "studying" ? CircleDot : Circle;
  return (
    <button
      onClick={() => setStatus([topic.id], NEXT[topic.status])}
      title={`${STATUS_LABEL[topic.status]} — click to change`}
      className={cn(
        "flex size-7 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
        topic.status === "understood" && "border-success bg-success text-primary-foreground",
        topic.status === "studying" && "border-warm text-warm",
        topic.status === "not_started" && "border-input text-muted-foreground",
      )}
      aria-label={`Status: ${STATUS_LABEL[topic.status]}`}
    >
      <Icon className="size-4" />
    </button>
  );
}

export function FlagButton({ topic }: { topic: Topic }) {
  const { setFlag } = useStudy();
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={() => setFlag([topic.id], !topic.flagged)}
      aria-label={topic.flagged ? "Remove from review list" : "Flag for review"}
      title={topic.flagged ? "Needs review — click to unflag" : "Flag as needs review"}
      className={cn(topic.flagged ? "text-star" : "text-muted-foreground")}
    >
      {topic.flagged ? <BookmarkCheck className="fill-current" /> : <Bookmark />}
    </Button>
  );
}

export function TopicRow({ topic, showSubject }: { topic: Topic; showSubject?: boolean }) {
  const { deleteTopic, subjects, setStatus } = useStudy();
  const subject = subjects.find((s) => s.id === topic.subjectId);
  return (
    <div className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-muted/60">
      <StatusButton topic={topic} />
      <div className="min-w-0 flex-1">
        <p className={cn("truncate font-medium", topic.status === "understood" && "text-muted-foreground line-through decoration-1")}>
          {topic.title}
        </p>
        <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {showSubject && subject && (
            <span className="flex items-center gap-1.5">
              <SubjectDot color={subject.color} className="size-2" />
              {subject.name}
            </span>
          )}
          <select
            value={topic.status}
            onChange={(e) => setStatus([topic.id], e.target.value as TopicStatus)}
            className="rounded bg-transparent text-xs text-muted-foreground focus:outline-none"
            aria-label="Status"
          >
            {Object.entries(STATUS_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <PriorityBadge p={topic.priority} />
          {topic.dueDate && (
            <span className="flex items-center gap-1">
              <CalendarDays className="size-3" />
              {format(new Date(topic.dueDate + "T12:00:00"), "MMM d")}
            </span>
          )}
        </div>
      </div>
      <FlagButton topic={topic} />
      <ItemDialog
        kind="topic"
        topic={topic}
        trigger={
          <Button variant="ghost" size="icon-sm" aria-label="Edit topic" className="text-muted-foreground">
            <Pencil />
          </Button>
        }
      />
      <Button variant="ghost" size="icon-sm" aria-label="Delete topic" className="text-muted-foreground" onClick={() => deleteTopic(topic.id)}>
        <Trash2 />
      </Button>
    </div>
  );
}
