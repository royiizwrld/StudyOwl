import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AuthCard, Field, friendlyAuthError, isEmail } from "@/components/account/AuthCard";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Reset your password — Studyowl" },
      { name: "description", content: "Get a link to reset your Studyowl password." },
      { property: "og:title", content: "Reset your password — Studyowl" },
      { property: "og:description", content: "Get a link to reset your Studyowl password." },
    ],
  }),
  component: Forgot,
});

function Forgot() {
  const [email, setEmail] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEmail(email)) return setFieldError("Enter a valid email address.");
    setFieldError(null);
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/reset-password` });
    setBusy(false);
    if (error) return setError(friendlyAuthError(error.message));
    setSent(true);
  };

  return (
    <AuthCard title="Forgot your password?" subtitle="We'll email you a link to set a new one." footer={<Link to="/login" className="font-semibold text-primary underline-offset-4 hover:underline">Back to sign in</Link>}>
      {sent ? (
        <div className="flex flex-col items-center gap-3 text-center" role="status">
          <MailCheck className="size-10 text-primary" aria-hidden />
          <p className="text-sm">If an account exists for <strong className="break-all">{email}</strong>, a reset link is on its way. Check your inbox and spam folder.</p>
        </div>
      ) : (
        <form onSubmit={submit} noValidate className="space-y-4">
          {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
          <Field label="Email" id="email" error={fieldError}>
            <Input id="email" type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={!!fieldError} className="h-11" />
          </Field>
          <Button type="submit" className="h-11 w-full" disabled={busy}>
            {busy && <Loader2 className="animate-spin" />} Send reset link
          </Button>
        </form>
      )}
    </AuthCard>
  );
}
