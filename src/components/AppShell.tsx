import { Link, useRouterState } from "@tanstack/react-router";
import { BarChart3, BookOpen, CheckSquare, GraduationCap, LayoutDashboard, Menu, PanelLeftClose, PanelLeftOpen, Star, Timer } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useEffect, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTimer } from "@/lib/timer";
import { AssistantLauncher } from "@/components/assistant/AssistantPanel";
import { SettingsDialog } from "@/components/SettingsDialog";
import owl from "@/assets/owl.png";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/subjects", label: "Subjects", icon: BookOpen },
  { to: "/tasks", label: "Tasks & Objectives", icon: CheckSquare },
  { to: "/review", label: "Review", icon: Star },
  { to: "/scores", label: "Scores", icon: GraduationCap },
  { to: "/focus", label: "Focus", icon: Timer },
  { to: "/stats", label: "Stats", icon: BarChart3 },
] as const;
const MOBILE_MAIN = ["/", "/subjects", "/focus", "/scores"];

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
  const [collapsed, setCollapsed] = useState(false);
  const [more, setMore] = useState(false);
  useEffect(() => setCollapsed(localStorage.getItem("study-planner:sidebar") === "collapsed"), []);
  useEffect(() => setMore(false), [path]);
  const toggle = () => {
    setCollapsed((c) => {
      localStorage.setItem("study-planner:sidebar", c ? "open" : "collapsed");
      return !c;
    });
  };
  const extra = NAV.filter((n) => !MOBILE_MAIN.includes(n.to));
  const moreActive = extra.some((n) => isActive(n.to));
  return (
    <div className="min-h-screen md:flex">
      <aside className={cn("sticky top-0 hidden h-screen shrink-0 flex-col border-r bg-sidebar p-3 transition-[width] duration-200 md:flex", collapsed ? "w-16" : "w-60")}>
        <div className={cn("mb-6 flex items-center", collapsed ? "flex-col gap-2" : "justify-between")}>
          <Link to="/" className="flex items-center gap-2 px-1" title="Studyowl">
            <img src={owl} alt="" width={36} height={36} className="size-9 shrink-0" />
            {!collapsed && <span className="font-display text-lg font-semibold">Studyowl</span>}
          </Link>
          <Button variant="ghost" size="icon-sm" onClick={toggle} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}>
            {collapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
          </Button>
        </div>
        <nav className="flex flex-col gap-1">
          {NAV.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              title={collapsed ? label : undefined}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                collapsed && "justify-center px-0",
                isActive(to) && "bg-sidebar-accent text-sidebar-accent-foreground",
              )}
            >
              <Icon className="size-4 shrink-0" />
              {!collapsed && label}
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
            <SettingsDialog />
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-32 pt-5 md:px-8 md:pb-12 md:pt-6">{children}</main>
      </div>
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        {NAV.filter((n) => MOBILE_MAIN.includes(n.to)).map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className={cn("flex min-h-14 flex-col items-center justify-center gap-1 text-[11px] font-medium text-muted-foreground", isActive(to) && "text-primary")}
          >
            <Icon className="size-5" />
            {label}
          </Link>
        ))}
        <button
          onClick={() => setMore(true)}
          className={cn("flex min-h-14 flex-col items-center justify-center gap-1 text-[11px] font-medium text-muted-foreground", moreActive && "text-primary")}
        >
          <Menu className="size-5" />
          More
        </button>
      </nav>
      <Sheet open={more} onOpenChange={setMore}>
        <SheetContent side="bottom" className="rounded-t-2xl pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
          <SheetHeader><SheetTitle>More</SheetTitle></SheetHeader>
          <div className="grid grid-cols-3 gap-3 px-4">
            {extra.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                className={cn("flex flex-col items-center gap-2 rounded-xl bg-muted p-4 text-sm font-medium", isActive(to) && "bg-secondary text-primary")}
              >
                <Icon className="size-6" />
                {label}
              </Link>
            ))}
          </div>
        </SheetContent>
      </Sheet>
      <AssistantLauncher />
    </div>
  );
}
