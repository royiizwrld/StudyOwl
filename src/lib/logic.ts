import { format, subDays, startOfWeek } from "date-fns";
import type {
  FocusSession,
  Priority,
  Subject,
  TimerMode,
  TimerSettings,
  Topic,
  TopicStatus,
} from "./types";

export const DEFAULT_SETTINGS: TimerSettings = {
  focus: 25,
  shortBreak: 5,
  longBreakEnabled: false,
  longBreak: 15,
  longBreakEvery: 4,
  autoStart: false,
  muted: false,
};

export const DEFAULT_DAILY_GOAL = 100;

export const PRESETS = [
  { label: "25/5", focus: 25, shortBreak: 5 },
  { label: "45/10", focus: 45, shortBreak: 10 },
  { label: "50/10", focus: 50, shortBreak: 10 },
  { label: "90/20", focus: 90, shortBreak: 20 },
];

const clamp = (n: number, min: number, max: number, fallback: number) => {
  const v = Math.round(Number(n));
  if (!Number.isFinite(v)) return fallback;
  return Math.min(max, Math.max(min, v));
};

export function clampSettings(s: Partial<TimerSettings>): TimerSettings {
  return {
    focus: clamp(s.focus ?? 25, 1, 120, 25),
    shortBreak: clamp(s.shortBreak ?? 5, 1, 30, 5),
    longBreakEnabled: !!s.longBreakEnabled,
    longBreak: clamp(s.longBreak ?? 15, 1, 60, 15),
    longBreakEvery: clamp(s.longBreakEvery ?? 4, 1, 12, 4),
    autoStart: !!s.autoStart,
    muted: !!s.muted,
  };
}

export function modeMinutes(mode: TimerMode, s: TimerSettings) {
  return mode === "focus" ? s.focus : mode === "short" ? s.shortBreak : s.longBreak;
}

/** Which break follows after `completedFocusCount` focus sessions. */
export function nextBreak(completedFocusCount: number, s: TimerSettings): TimerMode {
  if (s.longBreakEnabled && completedFocusCount > 0 && completedFocusCount % s.longBreakEvery === 0)
    return "long";
  return "short";
}

/** Remaining ms derived from an absolute end timestamp (accurate in background tabs). */
export function remainingFrom(endsAt: number, now: number) {
  return Math.max(0, endsAt - now);
}

export const dayKey = (d: Date | number) => format(d, "yyyy-MM-dd");

export function minutesByDay(sessions: FocusSession[]) {
  const map = new Map<string, number>();
  for (const s of sessions) {
    const k = dayKey(s.endedAt);
    map.set(k, (map.get(k) ?? 0) + s.minutes);
  }
  return map;
}

/** Days that have at least one completed focus session. */
export function activeDays(sessions: FocusSession[]) {
  return new Set(sessions.filter((s) => s.completed).map((s) => dayKey(s.endedAt)));
}

export function computeStreaks(sessions: FocusSession[], today: Date = new Date()) {
  const days = activeDays(sessions);
  // current streak: counts back from today; if today has none, from yesterday
  let current = 0;
  let cursor = today;
  if (!days.has(dayKey(cursor))) cursor = subDays(cursor, 1);
  while (days.has(dayKey(cursor))) {
    current++;
    cursor = subDays(cursor, 1);
  }
  // longest streak
  const sorted = [...days].sort();
  let longest = 0;
  let run = 0;
  let prev: string | null = null;
  for (const d of sorted) {
    if (prev && dayKey(subDays(new Date(d + "T12:00:00"), 1)) === prev) run++;
    else run = 1;
    longest = Math.max(longest, run);
    prev = d;
  }
  return { current, longest };
}

export function minutesInRange(sessions: FocusSession[], from: number, to = Infinity) {
  return sessions
    .filter((s) => s.endedAt >= from && s.endedAt < to)
    .reduce((a, s) => a + s.minutes, 0);
}

export function todayStart(now = new Date()) {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function weekStart(now = new Date()) {
  return startOfWeek(now, { weekStartsOn: 1 }).getTime();
}

export function minutesBySubject(sessions: FocusSession[], from = 0) {
  const map = new Map<string | null, number>();
  for (const s of sessions) {
    if (s.endedAt < from) continue;
    map.set(s.subjectId, (map.get(s.subjectId) ?? 0) + s.minutes);
  }
  return map;
}

export function subjectProgress(topics: Topic[], subjectId: string) {
  const list = topics.filter((t) => t.subjectId === subjectId);
  const understood = list.filter((t) => t.status === "understood").length;
  return {
    total: list.length,
    understood,
    flagged: list.filter((t) => t.flagged).length,
    pct: list.length ? Math.round((understood / list.length) * 100) : 0,
  };
}

export const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

export interface BulkDraftSubject {
  name: string;
  topics: string[];
}

export interface MergeOptions {
  priority: Priority;
  dueDate: string | null;
  status: TopicStatus;
  colorFor: (index: number) => string;
  newId: () => string;
  now: number;
}

/**
 * Merge a bulk draft into existing data. Subjects match by case-insensitive name;
 * topics already present in a subject (same normalized title) are skipped.
 */
export function mergeBulk(
  subjects: Subject[],
  topics: Topic[],
  draft: BulkDraftSubject[],
  opts: MergeOptions,
) {
  const newSubjects: Subject[] = [];
  const newTopics: Topic[] = [];
  const byName = new Map(subjects.map((s) => [norm(s.name), s]));
  let colorIdx = subjects.length;
  for (const d of draft) {
    const name = d.name.trim();
    if (!name) continue;
    let subject = byName.get(norm(name));
    if (!subject) {
      subject = { id: opts.newId(), name, color: opts.colorFor(colorIdx++), createdAt: opts.now };
      byName.set(norm(name), subject);
      newSubjects.push(subject);
    }
    const existing = new Set(
      [...topics, ...newTopics].filter((t) => t.subjectId === subject!.id).map((t) => norm(t.title)),
    );
    for (const raw of d.topics) {
      const title = raw.trim();
      if (!title || existing.has(norm(title))) continue;
      existing.add(norm(title));
      newTopics.push({
        id: opts.newId(),
        subjectId: subject.id,
        title,
        priority: opts.priority,
        dueDate: opts.dueDate,
        status: opts.status,
        flagged: false,
        flaggedAt: null,
        createdAt: opts.now,
      });
    }
  }
  return { newSubjects, newTopics };
}

// ---------- Spaced revision ----------
export const REVIEW_DAYS = [3, 7, 14] as const;
const DAY = 86400000;

/** Understood topics whose next 3/7/14-day review checkpoint has arrived. */
export function dueRevisions<T extends { status: string; understoodAt?: number | null; reviewStage?: number }>(topics: T[], now = Date.now()): T[] {
  return topics.filter((t) => {
    if (t.status !== "understood" || !t.understoodAt) return false;
    const stage = t.reviewStage ?? 0;
    if (stage >= REVIEW_DAYS.length) return false;
    return now - t.understoodAt >= REVIEW_DAYS[stage]! * DAY;
  });
}

/** Status change side effects: entering Understood starts the review clock. */
export function withStatus<T extends { status: string; understoodAt?: number | null; reviewStage?: number }>(t: T, status: T["status"], now = Date.now()): T {
  if (t.status === status) return t;
  if (status === "understood") return { ...t, status, understoodAt: now, reviewStage: 0 };
  return { ...t, status, understoodAt: null, reviewStage: 0 };
}

// ---------- Scores ----------
export const pct = (s: { score: number; outOf: number }) => (s.outOf > 0 ? (s.score / s.outOf) * 100 : 0);
export function averagePct(scores: { score: number; outOf: number }[]): number | null {
  if (!scores.length) return null;
  return Math.round(scores.reduce((a, s) => a + pct(s), 0) / scores.length);
}

export function daysUntil(iso: string, now = new Date()): number {
  const a = new Date(iso + "T00:00:00");
  const b = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((a.getTime() - b.getTime()) / DAY);
}

// ---------- Weak spots ----------
export interface WeakSpot {
  kind: "subject" | "topic";
  id: string;
  subjectId: string;
  name: string;
  score: number;
  reasons: string[];
}

export function weakSpots(
  d: {
    subjects: { id: string; name: string; examDate?: string | null }[];
    topics: { id: string; subjectId: string; title: string; status: string; flagged: boolean; dueDate: string | null; priority: string }[];
    scores: { subjectId: string; score: number; outOf: number }[];
    sessions: { subjectId: string | null; startedAt: number; minutes: number }[];
  },
  now = new Date(),
  limit = 3,
): WeakSpot[] {
  const out: WeakSpot[] = [];
  const weekAgo = now.getTime() - 7 * DAY;
  for (const s of d.subjects) {
    const ts = d.topics.filter((t) => t.subjectId === s.id);
    const reasons: string[] = [];
    let score = 0;
    const avg = averagePct(d.scores.filter((x) => x.subjectId === s.id));
    if (avg !== null && avg < 70) { score += (70 - avg) * 1.5; reasons.push(`average score ${avg}%`); }
    if (ts.length) {
      const done = Math.round((ts.filter((t) => t.status === "understood").length / ts.length) * 100);
      if (done < 50) { score += (50 - done) * 0.6; reasons.push(`${done}% understood`); }
    }
    const flagged = ts.filter((t) => t.flagged).length;
    if (flagged) { score += flagged * 6; reasons.push(`${flagged} flagged`); }
    const recent = d.sessions.filter((x) => x.subjectId === s.id && x.startedAt >= weekAgo).reduce((a, x) => a + x.minutes, 0);
    if (ts.length && recent < 30) { score += 10; reasons.push(`${recent} min studied this week`); }
    if (s.examDate) {
      const days = daysUntil(s.examDate, now);
      if (days >= 0 && days <= 21) { score = score * 1.5 + (21 - days) * 1.5; reasons.push(`exam in ${days} day${days === 1 ? "" : "s"}`); }
    }
    if (score > 0 && reasons.length) out.push({ kind: "subject", id: s.id, subjectId: s.id, name: s.name, score, reasons });
  }
  for (const t of d.topics) {
    if (t.status === "understood") continue;
    const reasons: string[] = [];
    let score = 0;
    if (t.flagged) { score += 15; reasons.push("flagged for review"); }
    if (t.dueDate) {
      const days = daysUntil(t.dueDate, now);
      if (days < 0) { score += 30; reasons.push("overdue"); }
      else if (days <= 3) { score += 20 - days * 3; reasons.push(`due in ${days} day${days === 1 ? "" : "s"}`); }
    }
    if (reasons.length && t.priority === "high") { score += 8; reasons.push("high priority"); }
    if (score >= 20) out.push({ kind: "topic", id: t.id, subjectId: t.subjectId, name: t.title, score, reasons });
  }
  return out.sort((a, b) => b.score - a.score).slice(0, limit);
}
