import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { addDays, format } from "date-fns";
import { clampSettings, DEFAULT_DAILY_GOAL, DEFAULT_SETTINGS, mergeBulk, type BulkDraftSubject } from "./logic";
import {
  SUBJECT_COLORS,
  type FocusSession,
  type Priority,
  type StudyData,
  type Subject,
  type Task,
  type TimerSettings,
  type Topic,
  type TopicStatus,
} from "./types";

const KEY = "study-planner:v1";
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
};

function seed(): StudyData {
  const now = Date.now();
  const sid = uid();
  const d = (n: number) => format(addDays(new Date(), n), "yyyy-MM-dd");
  const t = (title: string, status: TopicStatus, priority: Priority, due: string | null, flagged = false, flagDaysAgo = 0): Topic => ({
    id: uid(), subjectId: sid, title, status, priority, dueDate: due, flagged,
    flaggedAt: flagged ? now - flagDaysAgo * 86400000 : null, createdAt: now, sample: true,
  });
  const sessions: FocusSession[] = [1, 2, 4].map((ago) => ({
    id: uid(), subjectId: sid, topicId: null, startedAt: now - ago * 86400000 - 25 * 60000,
    endedAt: now - ago * 86400000, minutes: 25, completed: true, sample: true,
  }));
  return {
    ...EMPTY,
    subjects: [{ id: sid, name: "Biology (sample)", color: SUBJECT_COLORS[0], createdAt: now, sample: true }],
    topics: [
      t("Cell structure", "understood", "medium", null),
      t("Photosynthesis", "studying", "high", d(3), true, 5),
      t("Cellular respiration", "not_started", "high", d(5), true, 2),
      t("DNA replication", "not_started", "medium", d(10)),
      t("Mitosis & meiosis", "studying", "low", null),
    ],
    tasks: [{ id: uid(), title: "Submit lab report", subjectId: sid, priority: "high", dueDate: d(2), done: false, createdAt: now, sample: true }],
    sessions,
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
        tasks: d.tasks.map((t) => (t.subjectId === id ? { ...t, subjectId: null } : t)),
      })),
    addTopic: (t: Omit<Topic, "id" | "createdAt" | "flagged" | "flaggedAt"> & { flagged?: boolean }) =>
      update((d) => ({
        ...d,
        topics: [...d.topics, { ...t, id: uid(), createdAt: Date.now(), flagged: !!t.flagged, flaggedAt: t.flagged ? Date.now() : null }],
      })),
    updateTopic: (id: string, patch: Partial<Topic>) =>
      update((d) => ({ ...d, topics: d.topics.map((t) => (t.id === id ? { ...t, ...patch } : t)) })),
    deleteTopic: (id: string) => update((d) => ({ ...d, topics: d.topics.filter((t) => t.id !== id) })),
    setFlag: (ids: string[], flagged: boolean) =>
      update((d) => ({
        ...d,
        topics: d.topics.map((t) =>
          ids.includes(t.id) ? { ...t, flagged, flaggedAt: flagged ? (t.flaggedAt ?? Date.now()) : null } : t,
        ),
      })),
    setStatus: (ids: string[], status: TopicStatus) =>
      update((d) => ({ ...d, topics: d.topics.map((t) => (ids.includes(t.id) ? { ...t, status } : t)) })),
    addTask: (t: Omit<Task, "id" | "createdAt" | "done">) =>
      update((d) => ({ ...d, tasks: [...d.tasks, { ...t, id: uid(), done: false, createdAt: Date.now() }] })),
    updateTask: (id: string, patch: Partial<Task>) =>
      update((d) => ({ ...d, tasks: d.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)) })),
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
      })),
    bulkAdd: (draft: BulkDraftSubject[], opts: { priority: Priority; dueDate: string | null; status: TopicStatus }) => {
      let result = { subjects: 0, topics: 0 };
      update((d) => {
        const { newSubjects, newTopics } = mergeBulk(d.subjects, d.topics, draft, {
          ...opts,
          colorFor: (i) => SUBJECT_COLORS[i % SUBJECT_COLORS.length],
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
