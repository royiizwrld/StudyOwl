import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check, Download, FileText, LogOut, Monitor, Moon, Smartphone, Sun, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageHeader } from "@/components/ui-bits";
import { PasswordInput, friendlyAuthError } from "@/components/account/AuthCard";
import { TimerSettingsDialog } from "@/components/pomodoro/TimerSettingsDialog";
import { IosSteps } from "@/components/pwa/InstallBanner";
import { THEMES } from "@/components/SettingsDialog";
import { supabase } from "@/integrations/supabase/client";
import { fullName, useAuth } from "@/lib/auth";
import { useStudy } from "@/lib/store";
import { useTheme } from "@/lib/theme";
import { usePwa } from "@/lib/pwa";
import { deleteMyAccount } from "@/lib/account.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Studyowl Study Planner" },
      { name: "description", content: "Manage your profile, theme, timer, goals and account." },
      { property: "og:title", content: "Settings — Studyowl Study Planner" },
      { property: "og:description", content: "Manage your profile, theme, timer, goals and account." },
    ],
  }),
  component: SettingsPage,
});

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="card-surface space-y-3 p-5">
      <h2 className="font-display font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function SettingsPage() {
  const { user, profile, updateProfile, signOut } = useAuth();
  const { settings, dailyGoal, setDailyGoal } = useStudy();
  const { mode, theme, pickMode, pickTheme } = useTheme();
  const navigate = useNavigate();
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [goal, setGoal] = useState(String(dailyGoal));
  useEffect(() => { setFirst(profile?.first_name ?? ""); setLast(profile?.last_name ?? ""); }, [profile?.first_name, profile?.last_name]);

  const saveName = async () => {
    if (!first.trim()) return toast.error("First name can't be empty.");
    try { await updateProfile({ first_name: first.trim(), last_name: last.trim() || null }); toast.success("Name saved"); }
    catch { toast.error("Couldn't save your name. Check your connection and try again."); }
  };

  const logout = async () => {
    await signOut();
    void navigate({ to: "/", replace: true });
  };

  return (
    <div className="space-y-4">
      <PageHeader title="Settings" subtitle="Your account and preferences" />
      <section className="card-surface p-5">
        <p className="font-display text-xl font-semibold">{fullName(profile) || "Your account"}</p>
        <p className="break-all text-sm text-muted-foreground">{user?.email}</p>
      </section>

      <Section title="Your name">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5"><Label htmlFor="sf">First name</Label><Input id="sf" value={first} onChange={(e) => setFirst(e.target.value)} className="h-11" /></div>
          <div className="space-y-1.5"><Label htmlFor="sl">Last name (optional)</Label><Input id="sl" value={last} onChange={(e) => setLast(e.target.value)} className="h-11" /></div>
        </div>
        <Button onClick={saveName}>Save name</Button>
      </Section>

      <Section title="Appearance">
        <div className="grid grid-cols-3 gap-2">
          {([["light", Sun, "Light"], ["dark", Moon, "Dark"], ["system", Monitor, "System"]] as const).map(([m, Icon, label]) => (
            <button key={m} onClick={() => pickMode(m)} aria-pressed={mode === m} className={cn("flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl border p-3 text-sm", mode === m ? "border-primary bg-secondary font-semibold" : "hover:bg-muted")}>
              <Icon className="size-4" /> {label}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {THEMES.map((t) => (
            <button key={t.id} onClick={() => pickTheme(t.id)} aria-pressed={theme === t.id} className={cn("flex min-h-11 items-center gap-2 rounded-xl border p-2 text-left text-xs", theme === t.id ? "border-primary bg-secondary font-semibold" : "hover:bg-muted")}>
              <span className="flex shrink-0 overflow-hidden rounded-full border"><span className="size-5" style={{ background: t.swatch[0] }} /><span className="size-5" style={{ background: t.swatch[1] }} /></span>
              <span className="flex-1">{t.name}</span>
              {theme === t.id && <Check className="size-4 text-primary" />}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Pomodoro timer">
        <p className="text-sm text-muted-foreground">Focus {settings.focus} min · Short break {settings.short} min{settings.longEnabled ? ` · Long break ${settings.long} min every ${settings.longEvery}` : ""}</p>
        <TimerSettingsDialog />
      </Section>

      <Section title="Daily focus goal">
        <div className="flex items-end gap-2">
          <div className="space-y-1.5"><Label htmlFor="goal">Minutes per day</Label><Input id="goal" type="number" min={5} max={1440} value={goal} onChange={(e) => setGoal(e.target.value)} className="h-11 w-32" /></div>
          <Button onClick={() => { setDailyGoal(Number(goal)); toast.success("Daily goal saved"); }}>Save goal</Button>
        </div>
      </Section>

      <ChangePassword email={user?.email ?? ""} />
      <InstallItem />

      <Section title="Legal">
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline"><Link to="/terms"><FileText /> Terms and Conditions</Link></Button>
          <Button asChild variant="outline"><Link to="/privacy"><FileText /> Privacy Policy</Link></Button>
        </div>
      </Section>

      <Section title="Account">
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={logout}><LogOut /> Log out</Button>
          <DeleteAccount />
        </div>
      </Section>
    </div>
  );
}

function ChangePassword({ email }: { email: string }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errs, setErrs] = useState<{ c?: string; n?: string; m?: string }>({});
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const er: typeof errs = {};
    if (!current) er.c = "Enter your current password.";
    if (next.length < 8) er.n = "Password must be at least 8 characters.";
    if (confirm !== next) er.m = "Passwords don't match.";
    setErrs(er);
    if (Object.keys(er).length) return;
    setBusy(true);
    const { error: authErr } = await supabase.auth.signInWithPassword({ email, password: current });
    if (authErr) { setBusy(false); return setErrs({ c: "Current password is incorrect." }); }
    const { error } = await supabase.auth.updateUser({ password: next, current_password: current } as { password: string });
    setBusy(false);
    if (error) return toast.error(friendlyAuthError(error.message));
    setCurrent(""); setNext(""); setConfirm("");
    toast.success("Password changed");
  };
  return (
    <Section title="Change password">
      <form onSubmit={submit} noValidate className="grid gap-3 sm:max-w-sm">
        <PasswordInput label="Current password" value={current} onChange={setCurrent} error={errs.c} autoComplete="current-password" />
        <PasswordInput label="New password" value={next} onChange={setNext} error={errs.n} autoComplete="new-password" hint="At least 8 characters." />
        <PasswordInput label="Confirm new password" value={confirm} onChange={setConfirm} error={errs.m} autoComplete="new-password" />
        <Button type="submit" disabled={busy} className="w-fit">{busy ? "Saving…" : "Change password"}</Button>
      </form>
    </Section>
  );
}

function InstallItem() {
  const { canPrompt, isIOS, standalone, installed, promptInstall } = usePwa();
  const [ios, setIos] = useState(false);
  const [help, setHelp] = useState(false);
  let body: React.ReactNode;
  if (standalone || installed) body = <p className="flex items-center gap-2 text-sm"><Check className="size-4 text-primary" /> App installed</p>;
  else if (canPrompt) body = <Button onClick={() => void promptInstall()}><Download /> Install app</Button>;
  else if (isIOS) body = <Button onClick={() => setIos(true)}><Smartphone /> How to install</Button>;
  else body = (
    <>
      <Button variant="outline" onClick={() => setHelp((h) => !h)}><Smartphone /> Install app</Button>
      {help && <p className="text-sm text-muted-foreground">Open this site in Chrome, Edge or Samsung Internet and use the browser menu's "Install app" or "Add to Home screen". On iPhone, use Safari → Share → Add to Home Screen. (Install isn't available inside the editor preview.)</p>}
    </>
  );
  return (
    <Section title="Install app">
      {body}
      <IosSteps open={ios} onOpenChange={setIos} />
    </Section>
  );
}

function DeleteAccount() {
  const del = useServerFn(deleteMyAccount);
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const run = async () => {
    setBusy(true);
    try {
      await del();
      await signOut().catch(() => undefined);
      toast.success("Your account and data were deleted.");
      void navigate({ to: "/", replace: true });
    } catch (e) {
      toast.error((e as Error).message || "Couldn't delete your account. Please try again.");
      setBusy(false);
    }
  };
  return (
    <>
      <Button variant="destructive" onClick={() => setOpen(true)}><Trash2 /> Delete account and all data</Button>
      <Dialog open={open} onOpenChange={(o) => { setOpen(o); setText(""); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete account and all data?</DialogTitle>
            <DialogDescription>This permanently removes your account, subjects, topics, tasks, focus sessions, scores and settings. It can't be undone.</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="confirm-del">Type DELETE to confirm</Label>
            <Input id="confirm-del" value={text} onChange={(e) => setText(e.target.value)} autoComplete="off" className="h-11" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button variant="destructive" disabled={text !== "DELETE" || busy} onClick={run}>{busy ? "Deleting…" : "Delete everything"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
