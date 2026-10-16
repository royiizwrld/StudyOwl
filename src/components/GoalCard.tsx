import { useState } from "react";
import { Target } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Ring } from "@/components/ui-bits";
import { minutesInRange, todayStart } from "@/lib/logic";
import { useStudy } from "@/lib/store";

export function GoalCard() {
  const { sessions, dailyGoal, setDailyGoal } = useStudy();
  const today = minutesInRange(sessions, todayStart());
  const [val, setVal] = useState(String(dailyGoal));
  return (
    <div className="card-surface flex flex-col items-center p-5">
      <div className="mb-3 flex w-full items-center justify-between">
        <h2 className="font-semibold">Daily focus goal</h2>
        <Popover onOpenChange={(o) => o && setVal(String(dailyGoal))}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label="Edit daily goal">
              <Target />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56">
            <form
              className="space-y-2"
              onSubmit={(e) => {
                e.preventDefault();
                setDailyGoal(Number(val));
              }}
            >
              <Label htmlFor="goal">Minutes per day</Label>
              <div className="flex gap-2">
                <Input id="goal" type="number" min={5} max={1440} value={val} onChange={(e) => setVal(e.target.value)} />
                <Button type="submit" size="sm" className="h-9">
                  Save
                </Button>
              </div>
            </form>
          </PopoverContent>
        </Popover>
      </div>
      <Ring value={today / dailyGoal} size={150} stroke={12} barClass={today >= dailyGoal ? "stroke-success" : "stroke-primary"}>
        <span className="font-display text-3xl font-semibold">{today}</span>
        <span className="text-xs text-muted-foreground">of {dailyGoal} min</span>
      </Ring>
      <p className="mt-3 text-sm text-muted-foreground">
        {today >= dailyGoal ? "Goal reached — lovely work." : `${dailyGoal - today} min to go today`}
      </p>
    </div>
  );
}
