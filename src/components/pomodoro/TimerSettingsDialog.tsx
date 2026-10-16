import { useEffect, useState } from "react";
import { Settings2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { clampSettings, DEFAULT_SETTINGS, PRESETS } from "@/lib/logic";
import { useStudy } from "@/lib/store";
import { useTimer } from "@/lib/timer";
import { cn } from "@/lib/utils";
import type { TimerSettings } from "@/lib/types";

function NumField({ id, label, value, min, max, onChange, disabled }: { id: string; label: string; value: number; min: number; max: number; onChange: (n: number) => void; disabled?: boolean }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs">
        {label} <span className="text-muted-foreground">({min}–{max})</span>
      </Label>
      <Input id={id} type="number" min={min} max={max} value={value} disabled={disabled} onChange={(e) => onChange(Number(e.target.value))} />
    </div>
  );
}

export function TimerSettingsDialog() {
  const { settings, setSettings } = useStudy();
  const timer = useTimer();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<TimerSettings>(settings);
  const [confirm, setConfirm] = useState<TimerSettings | null>(null);

  useEffect(() => {
    if (open) setDraft(settings);
  }, [open, settings]);

  const set = (patch: Partial<TimerSettings>) => setDraft((d) => ({ ...d, ...patch }));

  const commit = (cfg: TimerSettings) => {
    const clean = clampSettings(cfg);
    setSettings(clean);
    if (timer.inProgress) setConfirm(clean);
    else timer.applySettings(clean, true);
    setOpen(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Timer settings">
            <Settings2 />
          </Button>
        </DialogTrigger>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Timer settings</DialogTitle>
            <DialogDescription>Changes are saved and apply to your next session.</DialogDescription>
          </DialogHeader>
          <div className="space-y-5">
            <div>
              <Label className="mb-2 block text-xs">Quick presets</Label>
              <div className="flex flex-wrap gap-2">
                {PRESETS.map((p) => (
                  <Button
                    key={p.label}
                    type="button"
                    size="sm"
                    variant={draft.focus === p.focus && draft.shortBreak === p.shortBreak ? "default" : "outline"}
                    onClick={() => set({ focus: p.focus, shortBreak: p.shortBreak })}
                  >
                    {p.label}
                  </Button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <NumField id="t-focus" label="Focus (min)" value={draft.focus} min={1} max={120} onChange={(n) => set({ focus: n })} />
              <NumField id="t-short" label="Short break (min)" value={draft.shortBreak} min={1} max={30} onChange={(n) => set({ shortBreak: n })} />
            </div>
            <div className="rounded-xl border p-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="t-long-on">Long break</Label>
                <Switch id="t-long-on" checked={draft.longBreakEnabled} onCheckedChange={(v) => set({ longBreakEnabled: v })} />
              </div>
              <div className={cn("mt-3 grid grid-cols-2 gap-3", !draft.longBreakEnabled && "opacity-50")}>
                <NumField id="t-long" label="Long break (min)" value={draft.longBreak} min={1} max={60} disabled={!draft.longBreakEnabled} onChange={(n) => set({ longBreak: n })} />
                <NumField id="t-every" label="After # focus sessions" value={draft.longBreakEvery} min={1} max={12} disabled={!draft.longBreakEnabled} onChange={(n) => set({ longBreakEvery: n })} />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="t-auto">Auto-start next interval</Label>
              <Switch id="t-auto" checked={draft.autoStart} onCheckedChange={(v) => set({ autoStart: v })} />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="t-mute">Mute alert sound</Label>
              <Switch id="t-mute" checked={draft.muted} onCheckedChange={(v) => set({ muted: v })} />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:justify-between">
            <Button type="button" variant="outline" onClick={() => commit(DEFAULT_SETTINGS)}>
              Reset to default (25/5)
            </Button>
            <Button type="button" onClick={() => commit(draft)}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertDialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apply to the current session?</AlertDialogTitle>
            <AlertDialogDescription>
              A session is in progress. Your new settings are saved for the next session. Do you also want to resize the one running now?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Next session only</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirm) timer.applySettings(confirm, true);
                setConfirm(null);
              }}
            >
              Apply now
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
