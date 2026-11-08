import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, MailCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AuthCard, Field, PasswordInput, friendlyAuthError, isEmail } from "@/components/account/AuthCard";
import { supabase } from "@/integrations/supabase/client";
import { TERMS_VERSION, useAuth } from "@/lib/auth";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Create your account — Studyowl Study Planner" },
      { name: "description", content: "Create a free Studyowl account to plan subjects, focus with Pomodoro and sync across devices." },
      { property: "og:title", content: "Create your account — Studyowl Study Planner" },
      { property: "og:description", content: "Create a free Studyowl account to plan subjects, focus with Pomodoro and sync across devices." },
    ],
  }),
  component: Signup,
});

type Errs = Partial<Record<"first" | "email" | "password" | "confirm", string>>;

function Signup() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [agree, setAgree] = useState(false);
  const [errors, setErrors] = useState<Errs>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (!loading && user) void navigate({ to: "/dashboard", replace: true });
  }, [user, loading, navigate]);

  const validate = (): Errs => {
    const e: Errs = {};
    if (!first.trim()) e.first = "Please enter your first name.";
    if (!isEmail(email)) e.email = "Enter a valid email address.";
    if (password.length < 8) e.password = "Password must be at least 8 characters.";
    if (confirm !== password) e.confirm = "Passwords don't match.";
    return e;
  };

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length || !agree) return;
    setBusy(true);
    setError(null);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/login?verified=1`,
        data: {
          first_name: first.trim(),
          last_name: last.trim() || null,
          terms_accepted_at: new Date().toISOString(),
          terms_version: TERMS_VERSION,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
      },
    });
    setBusy(false);
    if (error) return setError(friendlyAuthError(error.message));
    if (data.user && data.user.identities?.length === 0) return setError("An account with this email already exists. Try signing in instead.");
    if (data.session) return void navigate({ to: "/dashboard" });
    setSentTo(email.trim());
  };

  const resend = async () => {
    if (!sentTo) return;
    setResending(true);
    const { error } = await supabase.auth.resend({ type: "signup", email: sentTo, options: { emailRedirectTo: `${window.location.origin}/login?verified=1` } });
    setResending(false);
    if (error) toast.error(friendlyAuthError(error.message));
    else toast.success("Email sent again. Check your inbox (and spam folder).");
  };

  if (sentTo)
    return (
      <AuthCard title="Check your email" footer={<Link to="/login" className="font-semibold text-primary underline-offset-4 hover:underline">Go to sign in</Link>}>
        <div className="flex flex-col items-center gap-3 text-center">
          <MailCheck className="size-10 text-primary" aria-hidden />
          <p className="text-sm">We sent a confirmation link to <strong className="break-all">{sentTo}</strong>. Open it to activate your account, then sign in.</p>
          <Button variant="outline" onClick={resend} disabled={resending} className="h-11 w-full">
            {resending && <Loader2 className="animate-spin" />} Resend email
          </Button>
        </div>
      </AuthCard>
    );

  return (
    <AuthCard
      title="Create your account"
      subtitle="Free, private to you, and synced across your devices."
      footer={<>Already have an account? <Link to="/login" className="font-semibold text-primary underline-offset-4 hover:underline">Sign in</Link></>}
    >
      {error && <Alert variant="destructive" className="mb-4"><AlertDescription>{error}</AlertDescription></Alert>}
      <form method="post" onSubmit={submit} noValidate className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="First name" id="first" error={errors.first}>
            <Input id="first" autoComplete="given-name" value={first} onChange={(e) => setFirst(e.target.value)} aria-invalid={!!errors.first} aria-describedby={errors.first ? "first-error" : undefined} className="h-11" />
          </Field>
          <Field label="Last name (optional)" id="last">
            <Input id="last" autoComplete="family-name" value={last} onChange={(e) => setLast(e.target.value)} className="h-11" />
          </Field>
        </div>
        <Field label="Email" id="email" error={errors.email}>
          <Input id="email" type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={!!errors.email} aria-describedby={errors.email ? "email-error" : undefined} className="h-11" />
        </Field>
        <PasswordInput value={password} onChange={setPassword} error={errors.password} autoComplete="new-password" hint="At least 8 characters." />
        <PasswordInput label="Confirm password" value={confirm} onChange={setConfirm} error={errors.confirm} autoComplete="new-password" />
        <div className="flex items-start gap-3">
          <Checkbox id="agree" checked={agree} onCheckedChange={(v) => setAgree(v === true)} className="mt-0.5" />
          <label htmlFor="agree" className="text-sm leading-snug">
            I agree to the{" "}
            <Link to="/terms" target="_blank" className="font-medium text-primary underline underline-offset-2">Terms and Conditions</Link>{" "}
            and{" "}
            <Link to="/privacy" target="_blank" className="font-medium text-primary underline underline-offset-2">Privacy Policy</Link>
          </label>
        </div>
        <Button type="submit" className="h-11 w-full" disabled={!agree || busy}>
          {busy && <Loader2 className="animate-spin" />} {busy ? "Creating account…" : "Create Account"}
        </Button>
      </form>
    </AuthCard>
  );
}
