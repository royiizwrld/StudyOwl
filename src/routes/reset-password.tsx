import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AuthCard, PasswordInput, friendlyAuthError } from "@/components/account/AuthCard";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Set a new password — Studyowl" },
      { name: "description", content: "Choose a new password for your Studyowl account." },
      { property: "og:title", content: "Set a new password — Studyowl" },
      { property: "og:description", content: "Choose a new password for your Studyowl account." },
    ],
  }),
  component: Reset,
});

function Reset() {
  const navigate = useNavigate();
  const [ready, setReady] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<{ p?: string; c?: string }>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === "PASSWORD_RECOVERY" || s) setReady(true);
    });
    const hasToken = /type=recovery|access_token|code=/.test(window.location.hash + window.location.search);
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
      else if (!hasToken) setReady(false);
    });
    const t = setTimeout(() => setReady((r) => r ?? false), 4000);
    return () => { sub.subscription.unsubscribe(); clearTimeout(t); };
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: typeof errors = {};
    if (password.length < 8) errs.p = "Password must be at least 8 characters.";
    if (confirm !== password) errs.c = "Passwords don't match.";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) { setBusy(false); return setError(friendlyAuthError(error.message)); }
    await supabase.auth.signOut();
    void navigate({ to: "/login", search: { reset: "1" }, replace: true });
  };

  return (
    <AuthCard title="Set new password" footer={<Link to="/login" className="font-semibold text-primary underline-offset-4 hover:underline">Back to sign in</Link>}>
      {ready === null && <p className="flex items-center justify-center gap-2 text-sm text-muted-foreground" role="status"><Loader2 className="size-4 animate-spin" /> Checking your reset link…</p>}
      {ready === false && (
        <div className="space-y-3 text-center text-sm">
          <p>This reset link is invalid or has expired.</p>
          <Button asChild className="h-11 w-full"><Link to="/forgot-password">Request a new link</Link></Button>
        </div>
      )}
      {ready && (
        <form method="post" onSubmit={submit} noValidate className="space-y-4">
          {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
          <PasswordInput label="New password" value={password} onChange={setPassword} error={errors.p} autoComplete="new-password" hint="At least 8 characters." />
          <PasswordInput label="Confirm new password" value={confirm} onChange={setConfirm} error={errors.c} autoComplete="new-password" />
          <Button type="submit" className="h-11 w-full" disabled={busy}>
            {busy && <Loader2 className="animate-spin" />} Save new password
          </Button>
        </form>
      )}
    </AuthCard>
  );
}
