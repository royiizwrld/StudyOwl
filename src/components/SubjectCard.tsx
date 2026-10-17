import { Link } from "@tanstack/react-router";
import { BookmarkCheck } from "lucide-react";
import { ProgressBar, SubjectDot } from "@/components/ui-bits";
import { subjectProgress } from "@/lib/logic";
import { ExamBadge } from "@/components/ExamBadge";
import { useStudy } from "@/lib/store";
import type { Subject } from "@/lib/types";

export function SubjectCard({ subject }: { subject: Subject }) {
  const { topics } = useStudy();
  const p = subjectProgress(topics, subject.id);
  return (
    <Link
      to="/subjects/$subjectId"
      params={{ subjectId: subject.id }}
      className="card-surface group block p-5 transition-transform hover:-translate-y-0.5"
    >
      <div className="mb-4 flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <SubjectDot color={subject.color} className="size-3" />
          <h3 className="font-semibold">{subject.name}</h3>
        </div>
        {p.flagged > 0 && (
          <span className="flex items-center gap-1 rounded-full bg-star/15 px-2 py-0.5 text-xs font-semibold text-star">
            <BookmarkCheck className="size-3.5" /> {p.flagged}
          </span>
        )}
      </div>
      {subject.examDate && <ExamBadge date={subject.examDate} className="mb-3" />}
      <ProgressBar value={p.pct} color={subject.color} />
      <div className="mt-2 flex justify-between text-xs text-muted-foreground">
        <span>
          {p.understood}/{p.total} understood
        </span>
        <span className="font-semibold text-foreground">{p.pct}%</span>
      </div>
    </Link>
  );
}
