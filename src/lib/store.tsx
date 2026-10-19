import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { addDays, format } from "date-fns";
import { clampSettings, DEFAULT_DAILY_GOAL, DEFAULT_SETTINGS, mergeBulk, withStatus, type BulkDraftSubject } from "./logic";
import {
  colorAt,
  type ExamPaper,
  type ExamPeriod,
  type FocusSession,
  type GradeGoals,
  type Priority,
  type StudyData,
  type Subject,
  type Task,
  type TestScore,
  type TimerSettings,
  type Topic,
  type TopicStatus,
} from "./types";

const KEY = "study-planner:v1";
export const DEFAULT_GRADE_GOALS: GradeGoals = { overallTarget: null, maskTarget: false, hideComparison: false };
export const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID().slice(0, 8)
    : Math.random().toString(36).slice(2, 10);

const EMPTY: StudyData = {
  subjects: [],
  topics: [],
  tasks: [],
  sessions: [],
  settings: DEFAULT_SETTINGS,
  dailyGoal: DEFAULT_DAILY_GOAL,
  scores: [],
  examPeriods: [],
  papers: [],
  gradeGoals: DEFAULT_GRADE_GOALS,
};

function seed(): StudyData {
  const now = Date.now();
  const sid = uid();
  const pid = uid();
  const d = (n: number) => format(addDays(new Date(), n), "yyyy-MM-dd");
  const t = (title: string, status: TopicStatus, priority: Priority, due: string | null, flagged = false, flagDaysAgo = 0): Topic => ({
    id: uid(), subjectId: sid, title, status, priority, dueDate: due, flagged,
    flaggedAt: flagged ? now - flagDaysAgo * 86400000 : null, createdAt: now, sample: true,
    understoodAt: status === "understood" ? now - 4 * 86400000 : null, reviewStage: 0,
  });
  const sessions: FocusSession[] = [1, 2, 4].map((ago) => ({
    id: uid(), subjectId: sid, topicId: null, startedAt: now - ago * 86400000 - 25 * 60000,
    endedAt: now - ago * 86400000, minutes: 25, completed: true, sample: true,
  }));
  return {
    ...EMPTY,
    subjects: [{ id: sid, name: "Biology (sample)", color: colorAt(0), createdAt: now, sample: true, examDate: d(18) }],
    topics: [
      t("Cell structure", "understood", "medium", null),
      t("Photosynthesis", "studying", "high", d(3), true, 5),
      t("Cellular respiration", "not_started", "high", d(5), true, 2),
      t("DNA replication", "not_started", "medium", d(10)),
      t("Mitosis & meiosis", "studying", "low", null),
    ],
    tasks: [{ id: uid(), title: "Submit lab report", subjectId: sid, priority: "high", dueDate: d(2), done: false, createdAt: now, sample: true }],
    sessions,
    examPeriods: [{ id: pid, name: "Term 1 Midterms (sample)", type: "major_exam", startDate: d(16), endDate: d(22), target: 75, method: "average", manualPct: null, includeInOverall: true, sample: true }],
    papers: [
      { id: uid(), periodId: pid, subjectId: sid, title: "Biology Paper 1", type: "major_exam", date: d(18), target: 75, weight: 1, scoreId: null, sample: true },
      { id: uid(), periodId: pid, subjectId: sid, title: "Biology Paper 2 (practical)", type: "major_exam", date: d(21), target: 70, weight: 1, scoreId: null, sample: true },
    ],
    scores: [
      { id: uid(), subjectId: sid, title: "Cells quiz", type: "quiz", score: 14, outOf: 20, date: d(-9), sample: true },
      { id: uid(), subjectId: sid, title: "Term 1 CAT", type: "cat", score: 52, outOf: 100, date: d(-4), sample: true },
    ],
  };
}

function load(): StudyData {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return seed();
    const p = JSON.parse(raw) as Partial<StudyData>;
    return {
      subjects: p.subjects ?? [],
      topics: p.topics ?? [],
      tasks: p.tasks ?? [],
      sessions: p.sessions ?? [],
      settings: clampSettings({ ...DEFAULT_SETTINGS, ...(p.settings ?? {}) }),
      dailyGoal: p.dailyGoal ?? DEFAULT_DAILY_GOAL,
      scores: p.scores ?? [],
      examPeriods: p.examPeriods ?? [],
      papers: p.papers ?? [],
      gradeGoals: { ...DEFAULT_GRADE_GOALS, ...(p.gradeGoals ?? {}) },
    };
  } catch {
    return seed();
  }
}

function useStoreValue() {
  const [data, setData] = useState<StudyData>(EMPTY);
  const [ready, setReady] = useState(false);
  const loaded = useRef(false);

  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;
    setData(load());
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) localStorage.setItem(KEY, JSON.stringify(data));
  }, [data, ready]);

  const update = useCallback((fn: (d: StudyData) => StudyData) => setData(fn), []);

  const actions = useMemo(() => ({
    addSubject: (name: string, color: string) => {
      const s: Subject = { id: uid(), name: name.trim(), color, createdAt: Date.now() };
      update((d) => ({ ...d, subjects: [...d.subjects, s] }));
      return s;
    },
    updateSubject: (id: string, patch: Partial<Subject>) =>
      update((d) => ({ ...d, subjects: d.subjects.map((s) => (s.id === id ? { ...s, ...patch } : s)) })),
    deleteSubject: (id: string) =>
      update((d) => ({
        ...d,
        subjects: d.subjects.filter((s) => s.id !== id),
        topics: d.topics.filter((t) => t.subjectId !== id),
        scores: d.scores.filter((s) => s.subjectId !== id),
        papers: d.papers.filter((p) => p.subjectId !== id),
        tasks: d.tasks.map((t) => (t.subjectId === id ? { ...t, subjectId: null } : t)),
      })),
    addTopic: (t: Omit<Topic, "id" | "createdAt" | "flagged" | "flaggedAt"> & { flagged?: boolean }) =>
      update((d) => ({
        ...d,
        topics: [...d.topics, { ...t, id: uid(), createdAt: Date.now(), flagged: !!t.flagged, flaggedAt: t.flagged ? Date.now() : null }],
      })),
    updateTopic: (id: string, patch: Partial<Topic>) =>
      update((d) => ({
        ...d,
        topics: d.topics.map((t) => {
          if (t.id !== id) return t;
          const { status, ...rest } = patch;
          const next = { ...t, ...rest };
          return status ? withStatus(next, status) : next;
        }),
      })),
    deleteTopic: (id: string) => update((d) => ({ ...d, topics: d.topics.filter((t) => t.id !== id) })),
    setFlag: (ids: string[], flagged: boolean) =>
      update((d) => ({
        ...d,
        topics: d.topics.map((t) =>
          ids.includes(t.id) ? { ...t, flagged, flaggedAt: flagged ? (t.flaggedAt ?? Date.now()) : null } : t,
        ),
      })),
    setStatus: (ids: string[], status: TopicStatus) =>
      update((d) => ({ ...d, topics: d.topics.map((t) => (ids.includes(t.id) ? withStatus(t, status) : t)) })),
    markRevised: (id: string) =>
      update((d) => ({ ...d, topics: d.topics.map((t) => (t.id === id ? { ...t, reviewStage: (t.reviewStage ?? 0) + 1 } : t)) })),
    addScore: (s: Omit<TestScore, "id">) => update((d) => ({ ...d, scores: [...d.scores, { ...s, id: uid() }] })),
    updateScore: (id: string, patch: Partial<TestScore>) =>
      update((d) => ({ ...d, scores: d.scores.map((s) => (s.id === id ? { ...s, ...patch } : s)) })),
    deleteScore: (id: string) =>
      update((d) => ({
        ...d,
        scores: d.scores.filter((s) => s.id !== id),
        papers: d.papers.map((p) => (p.scoreId === id ? { ...p, scoreId: null } : p)),
      })),
    savePeriod: (p: Omit<ExamPeriod, "id"> & { id?: string }) => {
      const id = p.id ?? uid();
      update((d) => {
        const exists = d.examPeriods.some((x) => x.id === id);
        const next = { ...p, id } as ExamPeriod;
        return { ...d, examPeriods: exists ? d.examPeriods.map((x) => (x.id === id ? next : x)) : [...d.examPeriods, next] };
      });
      return id;
    },
    deletePeriod: (id: string, keepScores: boolean) =>
      update((d) => {
        const paperIds = d.papers.filter((p) => p.periodId === id).map((p) => p.id);
        return {
          ...d,
          examPeriods: d.examPeriods.filter((x) => x.id !== id),
          papers: d.papers.filter((p) => p.periodId !== id),
          scores: keepScores
            ? d.scores.map((s) => (s.periodId === id ? { ...s, periodId: null, paperId: null } : s))
            : d.scores.filter((s) => s.periodId !== id && !paperIds.includes(s.paperId ?? "")),
        };
      }),
    /** Save an exam paper; when marks are given they sync into the Scores history automatically. */
    savePaper: (p: Omit<ExamPaper, "id" | "scoreId"> & { id?: string }, marks: { score: number; outOf: number } | null) =>
      update((d) => {
        const id = p.id ?? uid();
        const prev = d.papers.find((x) => x.id === id);
        let scoreId = prev?.scoreId ?? null;
        let scores = d.scores;
        if (marks) {
          const v = { subjectId: p.subjectId, title: p.title, type: p.type, score: marks.score, outOf: marks.outOf, date: p.date, periodId: p.periodId, paperId: id };
          if (scoreId && scores.some((s) => s.id === scoreId)) scores = scores.map((s) => (s.id === scoreId ? { ...s, ...v } : s));
          else { scoreId = uid(); scores = [...scores, { ...v, id: scoreId }]; }
        } else if (scoreId) {
          scores = scores.filter((s) => s.id !== scoreId);
          scoreId = null;
        }
        const next: ExamPaper = { ...p, id, scoreId };
        return { ...d, scores, papers: prev ? d.papers.map((x) => (x.id === id ? next : x)) : [...d.papers, next] };
      }),
    deletePaper: (id: string) =>
      update((d) => {
        const p = d.papers.find((x) => x.id === id);
        return { ...d, papers: d.papers.filter((x) => x.id !== id), scores: d.scores.filter((s) => s.id !== p?.scoreId) };
      }),
    setGradeGoals: (g: Partial<GradeGoals>) => update((d) => ({ ...d, gradeGoals: { ...d.gradeGoals, ...g } })),
    addTask: (t: Omit<Task, "id" | "createdAt" | "done">) =>
      update((d) => ({ ...d, tasks: [...d.tasks, { ...t, id: uid(), done: false, createdAt: Date.now() }] })),
    updateTask: (id: string, patch: Partial<Task>) =>
      update((d) => ({
        ...d,
        tasks: d.tasks.map((t) => {
          if (t.id !== id) return t;
          const next = { ...t, ...patch };
          if (patch.done !== undefined && patch.done !== t.done && patch.completedAt === undefined) next.completedAt = patch.done ? Date.now() : null;
          return next;
        }),
      })),
    deleteTask: (id: string) => update((d) => ({ ...d, tasks: d.tasks.filter((t) => t.id !== id) })),
    logSession: (s: Omit<FocusSession, "id">) =>
      update((d) => ({ ...d, sessions: [...d.sessions, { ...s, id: uid() }] })),
    setSettings: (s: Partial<TimerSettings>) =>
      update((d) => ({ ...d, settings: clampSettings({ ...d.settings, ...s }) })),
    setDailyGoal: (m: number) =>
      update((d) => ({ ...d, dailyGoal: Math.max(5, Math.min(1440, Math.round(m) || DEFAULT_DAILY_GOAL)) })),
    clearSample: () =>
      update((d) => ({
        ...d,
        subjects: d.subjects.filter((x) => !x.sample),
        topics: d.topics.filter((x) => !x.sample),
        tasks: d.tasks.filter((x) => !x.sample),
        sessions: d.sessions.filter((x) => !x.sample),
        scores: d.scores.filter((x) => !x.sample),
        examPeriods: d.examPeriods.filter((x) => !x.sample),
        papers: d.papers.filter((x) => !x.sample),
      })),
    bulkAdd: (draft: BulkDraftSubject[], opts: { priority: Priority; dueDate: string | null; status: TopicStatus }) => {
      let result = { subjects: 0, topics: 0 };
      update((d) => {
        const { newSubjects, newTopics } = mergeBulk(d.subjects, d.topics, draft, {
          ...opts,
          colorFor: colorAt,
          newId: uid,
          now: Date.now(),
        });
        result = { subjects: newSubjects.length, topics: newTopics.length };
        return { ...d, subjects: [...d.subjects, ...newSubjects], topics: [...d.topics, ...newTopics] };
      });
      return result;
    },
  }), [update]);

  const hasSample = data.subjects.some((s) => s.sample) || data.topics.some((t) => t.sample) || data.tasks.some((t) => t.sample);

  return { ...data, ready, hasSample, ...actions };
}

type Store = ReturnType<typeof useStoreValue>;
const Ctx = createContext<Store | null>(null);

export function StudyProvider({ children }: { children: ReactNode }) {
  const value = useStoreValue();
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStudy() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useStudy must be used inside StudyProvider");
  return v;
}
