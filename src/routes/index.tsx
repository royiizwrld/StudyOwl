import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  BarChart3, BookOpenCheck, Bot, CheckCircle2, Cloud, Flame, Menu, ShieldCheck, Star, Timer, Wand2, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { StudyProvider, useStudy } from "@/lib/store";
import { TimerProvider } from "@/lib/timer";
import { SubjectCard } from "@/components/SubjectCard";
import { Pomodoro } from "@/components/pomodoro/Pomodoro";
import { CONTACT_EMAIL } from "@/components/account/LegalPage";
import { isStandalone, useAuth } from "@/lib/auth";
import owl from "@/assets/owl.png";

const TITLE = "Studyowl — Study smarter and know what to focus on";
const DESC = "A calm study planner for students: subjects and topics, Pomodoro focus timer, streaks, exam tracking and an AI study assistant that tells you what needs attention.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  { icon: BookOpenCheck, title: "Subjects, units & topics", text: "Break each subject into topics you can tick off as tasks, with priorities and due dates." },
  { icon: CheckCircle2, title: "Mark topics as understood", text: "Move topics from Not started to Studying to Understood and watch each subject's progress bar fill." },
  { icon: Star, title: "Flag tricky topics", text: "Star anything you want to revisit. Your Review list collects them, and you unflag in one tap." },
  { icon: Timer, title: "Adjustable Pomodoro timer", text: "25 minutes focus and 5 minutes break by default — change the lengths or pick a preset any time." },
  { icon: BarChart3, title: "Focus stats per subject", text: "See where your study minutes go today, this week and over time, subject by subject." },
  { icon: Flame, title: "Daily streaks & goals", text: "Set a daily focus goal and keep a streak going with a 30-day activity heatmap." },
  { icon: Wand2, title: "Smart bulk add", text: "Paste a syllabus or messy topic list (or upload a file) and get it organised into subjects and topics you can review before saving." },
  { icon: Bot, title: "AI study assistant", text: "Ask which subjects need more emphasis and get a suggested plan built from your own progress, due dates and focus time." },
  { icon: Cloud, title: "Sync across devices", text: "Sign in on your phone and laptop — your planner is saved to your account." },
];

const FAQ = [
  ["Is it free?", "Yes. You can create an account and use the planner without paying."],
  ["Can I change the timer length?", "Yes. Focus can be 1–120 minutes, short breaks 1–30, and you can add a long break after a set number of sessions. Presets include 25/5, 45/10, 50/10 and 90/20, and a reset button brings back 25/5."],
  ["How does the AI assistant know what I should study?", "With each question it receives a short summary of your own planner data — topic progress, flagged topics, due dates, exam dates, scores and recent focus time — and explains which signals led to its suggestions. Any changes it proposes only happen after you confirm them."],
  ["Can I use it on my phone?", "Yes. It's designed mobile-first, and you can install it to your home screen like an app."],
  ["Does my progress sync between devices?", "Yes. Your data is saved to your account, so changes appear on your other devices when you refresh or reopen the app."],
  ["Can I delete my account?", "Yes. In Settings, choose \"Delete account and all data\" and confirm. This permanently removes your account and your study data."],
] as const;

function Landing() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [menu, setMenu] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (user) void navigate({ to: "/dashboard", replace: true });
    else if (isStandalone()) void navigate({ to: "/login", replace: true });
  }, [user, loading, navigate]);

  const links = [["#features", "Features"], ["#how", "How it works"], ["#faq", "FAQ"]] as const;

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground">Skip to content</a>
      <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            <img src={owl} alt="" width={32} height={32} className="size-8" />
            <span className="font-display text-lg font-semibold">Studyowl</span>
          </Link>
          <nav aria-label="Main" className="hidden items-center gap-6 text-sm md:flex">
            {links.map(([href, label]) => <a key={href} href={href} className="text-muted-foreground hover:text-foreground">{label}</a>)}
          </nav>
          <div className="hidden items-center gap-2 md:flex">
            <Button asChild variant="ghost"><Link to="/login">Sign in</Link></Button>
            <Button asChild><Link to="/signup">Get started</Link></Button>
          </div>
          <Button variant="ghost" size="icon" className="md:hidden" aria-label={menu ? "Close menu" : "Open menu"} aria-expanded={menu} aria-controls="mobile-menu" onClick={() => setMenu((m) => !m)}>
            {menu ? <X /> : <Menu />}
          </Button>
        </div>
        {menu && (
          <nav id="mobile-menu" aria-label="Mobile" className="border-t px-4 pb-4 md:hidden">
            {links.map(([href, label]) => <a key={href} href={href} onClick={() => setMenu(false)} className="block py-3 text-base">{label}</a>)}
            <div className="mt-2 grid grid-cols-2 gap-2">
              <Button asChild variant="outline" className="h-11"><Link to="/login">Sign in</Link></Button>
              <Button asChild className="h-11"><Link to="/signup">Get started</Link></Button>
            </div>
          </nav>
        )}
      </header>

      <main id="main">
        <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-12 md:grid-cols-2 md:py-20">
          <div>
            <h1 className="font-display text-4xl font-semibold leading-tight tracking-tight md:text-5xl">Study smarter. Always know what to focus on next.</h1>
            <p className="mt-4 max-w-lg text-lg text-muted-foreground">Organise every subject into topics, study in focused Pomodoro sessions, and let a friendly assistant point out what needs attention before your exams.</p>
            <div className="mt-7 flex flex-wrap items-center gap-4">
              <Button asChild size="lg" className="h-12 px-6 text-base"><Link to="/signup">Get started free</Link></Button>
              <Link to="/login" className="font-semibold text-primary underline-offset-4 hover:underline">Sign in</Link>
            </div>
          </div>
          <HeroPreview />
        </section>

        <section id="features" className="scroll-mt-20 border-t bg-muted/40 py-16">
          <div className="mx-auto max-w-6xl px-4">
            <h2 className="font-display text-3xl font-semibold">Everything you need for steady progress</h2>
            <p className="mt-2 max-w-2xl text-muted-foreground">Simple tools that work together, so planning takes minutes and studying gets the rest.</p>
            <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map(({ icon: Icon, title, text }) => (
                <li key={title} className="card-surface p-5">
                  <Icon className="size-6 text-primary" aria-hidden />
                  <h3 className="mt-3 font-semibold">{title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{text}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="how" className="scroll-mt-20 py-16">
          <div className="mx-auto max-w-6xl px-4">
            <h2 className="font-display text-3xl font-semibold">How it works</h2>
            <ol className="mt-8 grid gap-4 md:grid-cols-3">
              {[
                ["Create your account", "Sign up with your name and email — it takes under a minute."],
                ["Add your subjects and topics", "Type them in, or paste your syllabus and let bulk add organise it for you."],
                ["Study in focus sessions", "Run Pomodoro sessions and let the assistant guide what to study next."],
              ].map(([t, d], i) => (
                <li key={t} className="card-surface p-5">
                  <span className="flex size-9 items-center justify-center rounded-full bg-primary font-display font-semibold text-primary-foreground" aria-hidden>{i + 1}</span>
                  <h3 className="mt-3 font-semibold">{t}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{d}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="privacy" className="border-t bg-muted/40 py-16">
          <div className="mx-auto flex max-w-3xl flex-col items-start gap-4 px-4 md:flex-row">
            <ShieldCheck className="size-10 shrink-0 text-primary" aria-hidden />
            <div>
              <h2 className="font-display text-3xl font-semibold">Your data stays yours</h2>
              <p className="mt-3 text-muted-foreground">Your planner is private to your account: access rules mean only you, signed in, can read or change your study data. We don't sell personal data. You can delete your account and everything in it at any time from Settings.</p>
              <Link to="/privacy" className="mt-3 inline-block font-semibold text-primary underline-offset-4 hover:underline">Read the privacy policy</Link>
            </div>
          </div>
        </section>

        <section id="faq" className="scroll-mt-20 py-16">
          <div className="mx-auto max-w-3xl px-4">
            <h2 className="font-display text-3xl font-semibold">Frequently asked questions</h2>
            <Accordion type="single" collapsible className="mt-6">
              {FAQ.map(([q, a]) => (
                <AccordionItem key={q} value={q}>
                  <AccordionTrigger className="text-left text-base">{q}</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">{a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        <section className="border-t py-16">
          <div className="mx-auto max-w-3xl px-4 text-center">
            <h2 className="font-display text-3xl font-semibold">Ready for a calmer study routine?</h2>
            <p className="mt-2 text-muted-foreground">Set up your subjects today and start your first focus session.</p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Button asChild size="lg" className="h-12 px-6"><Link to="/signup">Get started free</Link></Button>
              <Button asChild size="lg" variant="outline" className="h-12 px-6"><Link to="/login">Sign in</Link></Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t py-8 text-sm text-muted-foreground">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4">
          <span>© {new Date().getFullYear()} Studyowl</span>
          <Link to="/terms" className="hover:text-foreground">Terms</Link>
          <Link to="/privacy" className="hover:text-foreground">Privacy</Link>
          <a href={`mailto:${CONTACT_EMAIL}`} className="hover:text-foreground">{CONTACT_EMAIL}</a>
        </div>
      </footer>
    </div>
  );
}

function HeroPreview() {
  return (
    <figure aria-label="Preview of the app using sample data" className="relative">
      <span className="absolute -top-3 left-4 z-10 rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground">Sample data</span>
      <div className="rounded-3xl border bg-muted/40 p-4">
        <StudyProvider mode={{ kind: "demo" }}>
          <TimerProvider>
            <PreviewInner />
          </TimerProvider>
        </StudyProvider>
      </div>
      <figcaption className="mt-2 text-center text-xs text-muted-foreground">Preview with sample subject and timer — try the timer.</figcaption>
    </figure>
  );
}

function PreviewInner() {
  const { subjects, ready } = useStudy();
  if (!ready) return <div className="h-80" />;
  return (
    <div className="grid gap-4">
      <div inert className="grid gap-3">
        {subjects.map((s) => <SubjectCard key={s.id} subject={s} />)}
      </div>
      <Pomodoro compact />
    </div>
  );
}
