import { Link } from "@tanstack/react-router";
import { AlertTriangle, CalendarClock, Check, RotateCcw } from "lucide-react";
import { ExamBadge } from "@/components/ExamBadge";
import { Button } from "@/components/ui/button";
import { SubjectDot } from "@/components/ui-bits";
import { daysUntil, dueRevisions, REVIEW_DAYS, weakSpots } from "@/lib/logic";
import { useStudy } from "@/lib/store";

export function WeakSpotsCard() {
  const store = useStudy();
  const spots = weakSpots(store);
  return (
    <section className="card-surface p-5">
      <h2 className="mb-3 flex items-center gap-2 font-semibold">
        <AlertTriangle className="size-4 text-accent" /> Weak spots
      </h2>
      {spots.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nothing needs urgent attention. Keep it up!</p>
      ) : (
        <ol className="space-y-2">
          {spots.map((w, i) => {
            const subj = store.subjects.find((s) => s.id === w.subjectId);
            return (
              <li key={w.kind + w.id}>
                <Link
                  to="/subjects/$subjectId"
                  params={{ subjectId: w.subjectId }}
                  className="flex items-start gap-3 rounded-lg p-2 transition-colors hover:bg-muted"
                >
                  <span className="font-display text-sm font-semibold text-muted-foreground">{i + 1}</span>
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 text-sm font-medium">
                      {subj && <SubjectDot color={subj.color} />}
                      {w.name}
                      <span className="text-xs font-normal text-muted-foreground">{w.kind === "topic" ? `topic · ${subj?.name ?? ""}` : "subject"}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">{w.reasons.join(" · ")}</p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

export function RevisionCard() {
  const { topics, subjects, markRevised, setStatus } = useStudy();
  const due = dueRevisions(topics);
  return (
    <section className="card-surface p-5">
      <h2 className="mb-1 flex items-center gap-2 font-semibold">
        <RotateCcw className="size-4 text-primary" /> Quick revision
      </h2>
      <p className="mb-3 text-xs text-muted-foreground">Understood topics come back after 3, 7 and 14 days.</p>
      {due.length === 0 ? (
        <p className="text-sm text-muted-foreground">No reviews due today.</p>
      ) : (
        <ul className="space-y-2">
          {due.map((t) => {
            const subj = subjects.find((s) => s.id === t.subjectId);
            return (
              <li key={t.id} className="flex items-center justify-between gap-2 rounded-lg p-2 hover:bg-muted">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 truncate text-sm font-medium">
                    {subj && <SubjectDot color={subj.color} />} {t.title}
                  </p>
                  <p className="text-xs text-muted-foreground">{REVIEW_DAYS[t.reviewStage ?? 0]}-day review</p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button size="xs" variant="ghost" onClick={() => setStatus([t.id], "studying")}>
                    Needs work
                  </Button>
                  <Button size="xs" onClick={() => markRevised(t.id)}>
                    <Check /> Reviewed
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export function NextExamsCard() {
  const { papers, subjects } = useStudy();
  const next = papers.filter((p) => !p.scoreId && daysUntil(p.date) >= 0).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 3);
  return (
    <section className="card-surface p-5">
      <h2 className="mb-3 flex items-center gap-2 font-semibold">
        <CalendarClock className="size-4 text-primary" /> Upcoming exams
      </h2>
      {next.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No exams planned. <Link to="/scores" className="underline">Add one</Link>
        </p>
      ) : (
        <ul className="space-y-2">
          {next.map((p) => {
            const s = subjects.find((x) => x.id === p.subjectId);
            return (
              <li key={p.id} className="flex items-center gap-2 text-sm">
                {s && <SubjectDot color={s.color} />}
                <span className="min-w-0 flex-1 truncate">{p.title}</span>
                <ExamBadge date={p.date} />
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
