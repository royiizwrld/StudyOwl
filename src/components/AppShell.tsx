import { Link, useRouterState } from "@tanstack/react-router";
import { BarChart3, BookOpen, CheckSquare, LayoutDashboard, Moon, Star, Sun, Timer } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTimer } from "@/lib/timer";
import { AssistantLauncher } from "@/components/assistant/AssistantPanel";
import owl from "@/assets/owl.png";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/subjects", label: "Subjects", icon: BookOpen },
  { to: "/tasks", label: "Tasks", icon: CheckSquare },
  { to: "/review", label: "Review", icon: Star },
  { to: "/focus", label: "Focus", icon: Timer },
  { to: "/stats", label: "Stats", icon: BarChart3 },
] as const;

function ThemeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const saved = localStorage.getItem("study-planner:theme");
    const isDark = saved ? saved === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
    setDark(isDark);
    document.documentElement.classList.toggle("dark", isDark);
  }, []);
  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("study-planner:theme", next ? "dark" : "light");
  };
  return (
    <Button variant="ghost" size="icon" onClick={toggle} aria-label="Toggle dark mode">
      {dark ? <Sun /> : <Moon />}
    </Button>
  );
}

function TimerChip() {
  const t = useTimer();
  if (!t.running) return null;
  const m = Math.floor(t.remaining / 60000);
  const s = Math.floor((t.remaining % 60000) / 1000);
  return (
    <Link to="/focus" className="rounded-full bg-secondary px-3 py-1 font-display text-xs font-semibold tabular-nums text-secondary-foreground">
      {t.mode === "focus" ? "Focus" : "Break"} {m}:{s.toString().padStart(2, "0")}
    </Link>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const isActive = (to: string) => (to === "/" ? path === "/" : path.startsWith(to));
  return (
    <div className="min-h-screen md:flex">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r bg-sidebar p-4 md:flex">
        <Link to="/" className="mb-8 flex items-center gap-2 px-2">
          <img src={owl} alt="" width={36} height={36} className="size-9" />
          <span className="font-display text-lg font-semibold">Studyowl</span>
        </Link>
        <nav className="flex flex-col gap-1">
          {NAV.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                isActive(to) && "bg-sidebar-accent text-sidebar-accent-foreground",
              )}
            >
              <Icon className="size-4" />
              {label}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-2 border-b bg-background/85 px-4 py-2 backdrop-blur md:px-8">
          <Link to="/" className="flex items-center gap-2 md:hidden">
            <img src={owl} alt="" width={28} height={28} className="size-7" />
            <span className="font-display font-semibold">Studyowl</span>
          </Link>
          <div className="hidden md:block" />
          <div className="flex items-center gap-2">
            <TimerChip />
            <ThemeToggle />
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-28 pt-6 md:px-8 md:pb-12">{children}</main>
      </div>
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-6 border-t bg-background/95 backdrop-blur md:hidden">
        {NAV.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className={cn(
              "flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium text-muted-foreground",
              isActive(to) && "text-primary",
            )}
          >
            <Icon className="size-5" />
            {label}
          </Link>
        ))}
      </nav>
      <AssistantLauncher />
    </div>
  );
}
