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
