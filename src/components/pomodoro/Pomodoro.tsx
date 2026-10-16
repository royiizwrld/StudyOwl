import { Link } from "@tanstack/react-router";
import { Pause, Play, RotateCcw, SkipForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Ring } from "@/components/ui-bits";
import { TimerSettingsDialog } from "./TimerSettingsDialog";
import { useStudy } from "@/lib/store";
import { useTimer } from "@/lib/timer";
import { cn } from "@/lib/utils";

const MODE_LABEL = { focus: "Focus", short: "Short break", long: "Long break" } as const;

export function fmt(ms: number) {
  const total = Math.ceil(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export function Pomodoro({ compact }: { compact?: boolean }) {
  const t = useTimer();
  const { subjects, topics, settings } = useStudy();
  const progress = t.durationMs ? 1 - t.remaining / t.durationMs : 0;
  const isFocus = t.mode === "focus";
  const subjectTopics = topics.filter((x) => x.subjectId === t.subjectId);

  return (
    <div className={cn("card-surface relative flex flex-col items-center p-5", !compact && "p-8")}>
      <div className="flex w-full items-center justify-between">
        <span
          className={cn(
            "rounded-full px-3 py-1 text-xs font-semibold",
            isFocus ? "bg-primary text-primary-foreground" : "bg-warm text-warm-foreground",
          )}
        >
          {MODE_LABEL[t.mode]}
        </span>
        <TimerSettingsDialog />
      </div>

      <div className="my-4">
        <Ring value={progress} size={compact ? 180 : 260} stroke={compact ? 10 : 14} barClass={isFocus ? "stroke-primary" : "stroke-warm"}>
          <span className={cn("font-display font-semibold tabular-nums", compact ? "text-4xl" : "text-6xl")}>{fmt(t.remaining)}</span>
          <span className="mt-1 text-xs text-muted-foreground">
            {settings.focus}/{settings.shortBreak}
            {settings.longBreakEnabled ? `/${settings.longBreak}` : ""} · #{t.completedFocus + (isFocus ? 1 : 0)}
          </span>
        </Ring>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon-lg" onClick={t.reset} aria-label="Reset">
          <RotateCcw />
        </Button>
        {t.running ? (
          <Button size="lg" onClick={t.pause} className="w-32 rounded-full">
            <Pause /> Pause
          </Button>
        ) : (
          <Button size="lg" onClick={t.start} className="w-32 rounded-full">
            <Play /> Start
          </Button>
        )}
        <Button variant="outline" size="icon-lg" onClick={t.skip} aria-label="Skip to next interval">
          <SkipForward />
        </Button>
      </div>

      {compact ? (
        <Link to="/focus" className="mt-4 text-xs font-medium text-primary hover:underline">
          Open focus mode
        </Link>
      ) : (
        <div className="mt-6 grid w-full max-w-md grid-cols-1 gap-2 sm:grid-cols-2">
          <Select value={t.subjectId ?? "none"} onValueChange={(v) => t.setTarget(v === "none" ? null : v, null)}>
            <SelectTrigger aria-label="Subject studying">
              <SelectValue placeholder="What are you studying?" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No subject</SelectItem>
              {subjects.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={t.topicId ?? "none"} onValueChange={(v) => t.setTarget(t.subjectId, v === "none" ? null : v)} disabled={!t.subjectId}>
            <SelectTrigger aria-label="Topic studying">
              <SelectValue placeholder="Topic (optional)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Any topic</SelectItem>
              {subjectTopics.map((x) => (
                <SelectItem key={x.id} value={x.id}>
                  {x.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}
