import { addDays, format, isBefore, startOfDay } from "date-fns";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui-bits";
import { ObjectiveRow } from "@/components/objectives/ObjectiveRow";
import { ObjectivesDialog } from "@/components/objectives/ObjectivesDialog";
import { weekKey } from "@/lib/logic";
import { useStudy } from "@/lib/store";

/** Objectives for the week containing `date`; ticks on a past day are credited to that day. */
export function WeekObjectivesCard({ date }: { date: Date }) {
  const { objectives } = useStudy();
  const [week, setWeek] = useState(weekKey(date));
  useEffect(() => setWeek(weekKey(date)), [date]);
  const start = new Date(week + "T12:00:00");
  const list = objectives.filter((o) => o.weekStart === week);
  const done = list.filter((o) => o.done).length;
  const title = list.find((o) => o.weekTitle)?.weekTitle;
  const past = isBefore(date, startOfDay(new Date()));
  const creditAt = past ? new Date(format(date, "yyyy-MM-dd") + "T18:00:00").getTime() : undefined;
  const shift = (n: number) => setWeek(weekKey(addDays(start, n * 7)));
  return (
    <section className="card-surface p-4">
      <div className="mb-2 flex items-center gap-2 px-1">
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-semibold">{title ?? "This week's objectives"}</h2>
          <p className="text-xs text-muted-foreground">
            {format(start, "MMM d")} – {format(addDays(start, 6), "MMM d")} · {list.length ? `${done} of ${list.length} done` : "none yet"}
          </p>
        </div>
        <Button variant="ghost" size="icon-sm" aria-label="Previous week" onClick={() => shift(-1)}><ChevronLeft /></Button>
        <Button variant="ghost" size="icon-sm" aria-label="Next week" onClick={() => shift(1)}><ChevronRight /></Button>
      </div>
      {list.length > 0 && <div className="mx-1 mb-2"><ProgressBar value={done / list.length} /></div>}
      {list.length ? (
        list.map((o) => <ObjectiveRow key={o.id} o={o} creditAt={creditAt} editable={false} />)
      ) : (
        <div className="px-1 py-3">
          <p className="mb-3 text-sm text-muted-foreground">No objectives for this week.</p>
          <ObjectivesDialog defaultWeek={week} trigger={<Button size="sm" variant="outline"><Plus /> Add objectives</Button>} />
        </div>
      )}
    </section>
  );
}
