import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";

export const CONTACT_EMAIL = "hello@example.com"; // placeholder — replace before launch
export const LEGAL_UPDATED = "4 November 2026";

export function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto max-w-2xl px-4 py-6 md:py-10">
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> Back to home
        </Link>
        <div className="mt-6 rounded-xl border border-dashed border-accent bg-accent/10 p-3 text-sm" role="note">
          <strong>Draft:</strong> this text is placeholder content and must be reviewed (ideally by a legal professional) before launch.
        </div>
        <article className="prose-legal mt-6 space-y-4 text-[15px] leading-relaxed [&_h2]:mt-8 [&_h2]:font-display [&_h2]:text-lg [&_h2]:font-semibold [&_li]:ml-5 [&_li]:list-disc">
          <h1 className="font-display text-3xl font-semibold">{title}</h1>
          <p className="text-sm text-muted-foreground">Last updated: {LEGAL_UPDATED}</p>
          {children}
        </article>
        <nav aria-label="Legal" className="mt-10 flex gap-4 border-t pt-4 text-sm text-muted-foreground">
          <Link to="/terms" className="hover:text-foreground">Terms</Link>
          <Link to="/privacy" className="hover:text-foreground">Privacy</Link>
          <a href={`mailto:${CONTACT_EMAIL}`} className="hover:text-foreground">{CONTACT_EMAIL}</a>
        </nav>
      </div>
    </div>
  );
}
