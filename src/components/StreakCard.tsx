import { format, subDays } from "date-fns";
import { Flame } from "lucide-react";
import { cn } from "@/lib/utils";
import { activeDays, computeStreaks, dayKey, minutesByDay } from "@/lib/logic";
import { useStudy } from "@/lib/store";

export function StreakCard() {
  const { sessions } = useStudy();
  const { current, longest } = computeStreaks(sessions);
  const mins = minutesByDay(sessions);
  const active = activeDays(sessions);
  const days = Array.from({ length: 30 }, (_, i) => subDays(new Date(), 29 - i));
  const level = (d: Date) => {
    const k = dayKey(d);
    if (!active.has(k)) return 0;
    const m = mins.get(k) ?? 0;
    return m >= 90 ? 3 : m >= 45 ? 2 : 1;
  };
  return (
    <div className="card-surface p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-semibold">Focus streak</h2>
        <Flame className={cn("size-5", current > 0 ? "text-warm" : "text-muted-foreground")} />
      </div>
      <div className="mb-5 flex gap-8">
        <div>
          <p className="font-display text-3xl font-semibold">{current}</p>
          <p className="text-xs text-muted-foreground">current {current === 1 ? "day" : "days"}</p>
        </div>
        <div>
          <p className="font-display text-3xl font-semibold text-muted-foreground">{longest}</p>
          <p className="text-xs text-muted-foreground">longest</p>
        </div>
      </div>
      <div className="grid grid-cols-10 gap-1.5">
        {days.map((d) => {
          const l = level(d);
          return (
            <div
              key={d.toISOString()}
              title={`${format(d, "EEE, MMM d")}: ${mins.get(dayKey(d)) ?? 0} min`}
              className={cn(
                "aspect-square rounded-[4px]",
                l === 0 && "bg-heat-0",
                l === 1 && "bg-heat-1",
                l === 2 && "bg-heat-2",
                l === 3 && "bg-heat-3",
              )}
            />
          );
        })}
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground">Last 30 days · a day counts with one completed focus session</p>
    </div>
  );
}
