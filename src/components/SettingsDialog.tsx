import { Check, Monitor, Moon, Settings, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useStudy } from "@/lib/store";

type Mode = "light" | "dark" | "system";
export const THEMES = [
  { id: "sage", name: "Warm Paper & Sage", swatch: ["oklch(0.975 0.008 85)", "oklch(0.52 0.07 150)"] },
  { id: "obsidian", name: "Midnight Obsidian", swatch: ["oklch(0.2 0.02 265)", "oklch(0.6 0.12 265)"] },
  { id: "crimson", name: "Harvard Crimson", swatch: ["oklch(0.975 0.01 20)", "oklch(0.5 0.15 20)"] },
  { id: "navy", name: "Oxford Navy", swatch: ["oklch(0.975 0.008 250)", "oklch(0.42 0.1 255)"] },
  { id: "pine", name: "Forest Pine", swatch: ["oklch(0.975 0.01 160)", "oklch(0.45 0.08 165)"] },
  { id: "terracotta", name: "Desert Terracotta", swatch: ["oklch(0.975 0.012 60)", "oklch(0.58 0.13 45)"] },
  { id: "nordic", name: "Nordic Slate", swatch: ["oklch(0.975 0.005 230)", "oklch(0.5 0.04 230)"] },
  { id: "rosewood", name: "Vintage Rosewood", swatch: ["oklch(0.975 0.01 355)", "oklch(0.5 0.1 355)"] },
  { id: "emerald", name: "Biolab Emerald", swatch: ["oklch(0.975 0.01 165)", "oklch(0.55 0.13 165)"] },
  { id: "mono", name: "Minimal Monochrome", swatch: ["oklch(0.98 0 0)", "oklch(0.3 0 0)"] },
] as const;

const MODE_KEY = "study-planner:theme";
const THEME_KEY = "study-planner:palette";

function apply(mode: Mode, theme: string) {
  const dark = mode === "dark" || (mode === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  const el = document.documentElement;
  el.classList.toggle("dark", dark);
  if (theme === "sage") el.removeAttribute("data-theme");
  else el.setAttribute("data-theme", theme);
}

export function SettingsDialog() {
  const { settings, setSettings, dailyGoal, setDailyGoal, gradeGoals, setGradeGoals } = useStudy();
  const [mode, setMode] = useState<Mode>("system");
  const [theme, setTheme] = useState("sage");
  useEffect(() => {
    const m = (localStorage.getItem(MODE_KEY) as Mode | null) ?? "system";
    const t = localStorage.getItem(THEME_KEY) ?? "sage";
    setMode(m);
    setTheme(t);
    apply(m, t);
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => apply((localStorage.getItem(MODE_KEY) as Mode | null) ?? "system", localStorage.getItem(THEME_KEY) ?? "sage");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  const pickMode = (m: Mode) => { setMode(m); localStorage.setItem(MODE_KEY, m); apply(m, theme); };
  const pickTheme = (t: string) => { setTheme(t); localStorage.setItem(THEME_KEY, t); apply(mode, t); };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Settings"><Settings /></Button>
      </DialogTrigger>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>Make Studyowl look and feel the way you like.</DialogDescription>
        </DialogHeader>
        <section className="space-y-2">
          <h3 className="text-sm font-semibold">Appearance</h3>
          <div className="grid grid-cols-3 gap-2">
            {([["light", Sun, "Light"], ["dark", Moon, "Dark"], ["system", Monitor, "System"]] as const).map(([m, Icon, label]) => (
              <button key={m} onClick={() => pickMode(m)} className={cn("flex flex-col items-center gap-1 rounded-xl border p-3 text-sm", mode === m ? "border-primary bg-secondary font-semibold" : "hover:bg-muted")}>
                <Icon className="size-4" /> {label}
              </button>
            ))}
          </div>
        </section>
        <section className="space-y-2">
          <h3 className="text-sm font-semibold">Theme</h3>
          <div className="grid grid-cols-2 gap-2">
            {THEMES.map((t) => (
              <button key={t.id} onClick={() => pickTheme(t.id)} className={cn("flex items-center gap-2 rounded-xl border p-2 text-left text-xs", theme === t.id ? "border-primary bg-secondary font-semibold" : "hover:bg-muted")}>
                <span className="flex shrink-0 overflow-hidden rounded-full border">
                  <span className="size-5" style={{ background: t.swatch[0] }} />
                  <span className="size-5" style={{ background: t.swatch[1] }} />
                </span>
                <span className="min-w-0 flex-1 leading-tight">{t.name}</span>
                {theme === t.id && <Check className="size-3.5 shrink-0 text-primary" />}
              </button>
            ))}
          </div>
        </section>
        <section className="space-y-3">
          <h3 className="text-sm font-semibold">Study</h3>
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="goal">Daily focus goal (minutes)</Label>
            <Input id="goal" type="number" min={5} max={1440} defaultValue={dailyGoal} key={dailyGoal} onBlur={(e) => setDailyGoal(Number(e.target.value))} className="h-9 w-24" />
          </div>
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="mute">Mute timer sound</Label>
            <Switch id="mute" checked={settings.muted} onCheckedChange={(v) => setSettings({ muted: v })} />
          </div>
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="gentle">Gentle mode (hide target comparisons)</Label>
            <Switch id="gentle" checked={gradeGoals.hideComparison} onCheckedChange={(v) => setGradeGoals({ hideComparison: v })} />
          </div>
        </section>
      </DialogContent>
    </Dialog>
  );
}
