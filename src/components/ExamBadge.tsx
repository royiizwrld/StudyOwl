import { CalendarClock } from "lucide-react";
import { daysUntil } from "@/lib/logic";
import { cn } from "@/lib/utils";

export function ExamBadge({ date, className }: { date: string; className?: string }) {
  const d = daysUntil(date);
  const label = d < 0 ? "Exam passed" : d === 0 ? "Exam today" : `Exam in ${d} day${d === 1 ? "" : "s"}`;
  const urgent = d >= 0 && d <= 7;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold",
        urgent ? "bg-accent/20 text-accent-foreground" : "bg-secondary text-secondary-foreground",
        d < 0 && "opacity-60",
        className,
      )}
    >
      <CalendarClock className="size-3.5" /> {label}
    </span>
  );
}
