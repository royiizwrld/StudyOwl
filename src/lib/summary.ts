import { differenceInCalendarDays } from "date-fns";
import { computeStreaks, minutesBySubject, minutesInRange, todayStart } from "./logic";
import type { StudyData } from "./types";

/** Compact snapshot of the user's data sent with each assistant message. */
export function buildSummary(d: StudyData) {
  const now = Date.now();
  const d7 = now - 7 * 86400000;
  const d30 = now - 30 * 86400000;
  const m7 = minutesBySubject(d.sessions, d7);
  const m30 = minutesBySubject(d.sessions, d30);
  const today = new Date();
  const daysUntil = (iso: string) => differenceInCalendarDays(new Date(iso + "T12:00:00"), today);
  return {
    today: today.toISOString().slice(0, 10),
    subjects: d.subjects.map((s) => {
      const ts = d.topics.filter((t) => t.subjectId === s.id);
      const count = (st: string) => ts.filter((t) => t.status === st).length;
      return {
        id: s.id,
        name: s.name,
        topics_total: ts.length,
        not_started: count("not_started"),
        studying: count("studying"),
        understood: count("understood"),
        completion_pct: ts.length ? Math.round((count("understood") / ts.length) * 100) : 0,
        focus_min_7d: m7.get(s.id) ?? 0,
        focus_min_30d: m30.get(s.id) ?? 0,
        topics: ts.map((t) => ({
          id: t.id,
          title: t.title,
          status: t.status,
          priority: t.priority,
          due_in_days: t.dueDate ? daysUntil(t.dueDate) : null,
          flagged_days_ago: t.flagged && t.flaggedAt ? Math.floor((now - t.flaggedAt) / 86400000) : null,
        })),
      };
    }),
    untagged_focus_min_7d: m7.get(null) ?? 0,
    untagged_focus_min_30d: m30.get(null) ?? 0,
    open_tasks: d.tasks
      .filter((t) => !t.done)
      .map((t) => ({
        title: t.title,
        subject: d.subjects.find((s) => s.id === t.subjectId)?.name ?? null,
        priority: t.priority,
        due_in_days: t.dueDate ? daysUntil(t.dueDate) : null,
      })),
    focus_min_today: minutesInRange(d.sessions, todayStart()),
    daily_goal_min: d.dailyGoal,
    streak: computeStreaks(d.sessions),
    pomodoro: d.settings,
  };
}
