import { Link } from "@tanstack/react-router";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";
import { useId, useState, type ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import owl from "@/assets/owl.png";

export function AuthCard({ title, subtitle, children, footer }: { title: string; subtitle?: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-background px-4 py-6">
      <Link to="/" className="inline-flex w-fit items-center gap-1 rounded-md text-sm text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring">
        <ArrowLeft className="size-4" /> Back to home
      </Link>
      <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-8">
        <div className="mb-6 flex flex-col items-center text-center">
          <img src={owl} alt="Studyowl logo" width={56} height={56} className="size-14" />
          <h1 className="mt-3 font-display text-2xl font-semibold">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        <div className="rounded-2xl border bg-card p-5 shadow-sm">{children}</div>
        {footer && <div className="mt-5 text-center text-sm text-muted-foreground">{footer}</div>}
      </main>
    </div>
  );
}

export function Field({ label, error, children, id, hint }: { label: string; error?: string | null; children: ReactNode; id: string; hint?: string }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
      {error && <p id={`${id}-error`} className="text-xs font-medium text-destructive" role="alert">{error}</p>}
    </div>
  );
}

export function PasswordInput({ value, onChange, error, autoComplete, label = "Password", hint }: { value: string; onChange: (v: string) => void; error?: string | null; autoComplete: string; label?: string; hint?: string }) {
  const id = useId();
  const [show, setShow] = useState(false);
  return (
    <Field label={label} error={error} id={id} hint={hint}>
      <div className="relative">
        <Input
          id={id}
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          className="h-11 pr-11"
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-md text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
          aria-label={show ? "Hide password" : "Show password"}
          aria-pressed={show}
        >
          {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
    </Field>
  );
}

export const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());

export function friendlyAuthError(msg: string | undefined) {
  const m = (msg ?? "").toLowerCase();
  if (m.includes("invalid login")) return "That email and password don't match. Check them and try again.";
  if (m.includes("email not confirmed")) return "Please confirm your email first — check your inbox for the link.";
  if (m.includes("already registered") || m.includes("already been registered")) return "An account with this email already exists. Try signing in instead.";
  if (m.includes("rate limit") || m.includes("too many")) return "Too many attempts. Please wait a minute and try again.";
  if (m.includes("weak") || m.includes("pwned")) return "That password is too easy to guess. Please choose a stronger one.";
  if (m.includes("failed to fetch") || m.includes("network")) return "Can't reach the server. Check your connection and try again.";
  return msg || "Something went wrong. Please try again.";
}
