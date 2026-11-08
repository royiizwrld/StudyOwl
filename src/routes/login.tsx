import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AuthCard, Field, PasswordInput, friendlyAuthError, isEmail } from "@/components/account/AuthCard";
import { supabase } from "@/integrations/supabase/client";
import { safeRedirect, useAuth } from "@/lib/auth";

export const Route = createFileRoute("/login")({
  validateSearch: z.object({ redirect: z.string().optional(), reset: z.string().optional(), verified: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Sign in — Studyowl Study Planner" },
      { name: "description", content: "Sign in to your Studyowl study planner." },
      { property: "og:title", content: "Sign in — Studyowl Study Planner" },
      { property: "og:description", content: "Sign in to your Studyowl study planner." },
    ],
  }),
  component: Login,
});

function Login() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const to = safeRedirect(search.redirect);

  useEffect(() => {
    if (!loading && user) void navigate({ to, replace: true });
  }, [user, loading, to, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: typeof errors = {};
    if (!isEmail(email)) errs.email = "Enter a valid email address.";
    if (!password) errs.password = "Enter your password.";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (error) return setError(friendlyAuthError(error.message));
    void navigate({ to, replace: true });
  };

  return (
    <AuthCard
      title="Welcome back"
      subtitle="Sign in to pick up where you left off."
      footer={<>New here? <Link to="/signup" className="font-semibold text-primary underline-offset-4 hover:underline">Create an account</Link></>}
    >
      {search.verified && !search.reset && <Alert className="mb-4"><AlertDescription>Email confirmed — you can sign in now.</AlertDescription></Alert>}
      {search.reset && <Alert className="mb-4"><AlertDescription>Your password was updated. Sign in with your new password.</AlertDescription></Alert>}
      {error && <Alert variant="destructive" className="mb-4"><AlertDescription>{error}</AlertDescription></Alert>}
      <form method="post" onSubmit={submit} noValidate className="space-y-4">
        <Field label="Email" id="email" error={errors.email}>
          <Input id="email" type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={!!errors.email} aria-describedby={errors.email ? "email-error" : undefined} className="h-11" />
        </Field>
        <PasswordInput value={password} onChange={setPassword} error={errors.password} autoComplete="current-password" />
        <div className="text-right">
          <Link to="/forgot-password" className="text-sm font-medium text-primary underline-offset-4 hover:underline">Forgot password?</Link>
        </div>
        <Button type="submit" className="h-11 w-full" disabled={busy}>
          {busy && <Loader2 className="animate-spin" />} {busy ? "Signing in…" : "Sign in"}
        </Button>
      </form>
    </AuthCard>
  );
}
