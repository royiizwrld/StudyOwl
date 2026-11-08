import { supabase } from "@/integrations/supabase/client";
import { clampSettings, DEFAULT_DAILY_GOAL, DEFAULT_SETTINGS } from "./logic";
import type { GradeGoals, StudyData, TimerSettings } from "./types";

/** Which StudyData array lives in which database table. */
export const COLLECTIONS = {
  subjects: "subjects",
  topics: "topics",
  tasks: "tasks",
  sessions: "focus_sessions",
  objectives: "objectives",
  scores: "test_scores",
  examPeriods: "exam_periods",
  papers: "exam_papers",
} as const;
export type CollectionKey = keyof typeof COLLECTIONS;
const KEYS = Object.keys(COLLECTIONS) as CollectionKey[];

type Client = typeof supabase;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const table = (name: string, c: Client = supabase) => c.from(name as any) as any;

export async function loadCloud(userId: string, base: StudyData, defaultsGrade: GradeGoals, client: Client = supabase): Promise<StudyData> {
  const results = await Promise.all(
    KEYS.map(async (k) => {
      const { data, error } = await table(COLLECTIONS[k], client).select("data").eq("user_id", userId).limit(10000);
      if (error) throw error;
      return [k, (data as { data: unknown }[]).map((r) => r.data)] as const;
    }),
  );
  const { data: profRow, error } = await client.from("profiles").select("*").eq("id", userId).maybeSingle();
  const prof = profRow as { pomodoro_settings: unknown; daily_goal: number; grade_goals: unknown } | null;
  if (error) throw error;
  const out: StudyData = { ...base };
  for (const [k, rows] of results) (out as unknown as Record<string, unknown[]>)[k] = rows;
  out.settings = clampSettings({ ...DEFAULT_SETTINGS, ...((prof?.pomodoro_settings as Partial<TimerSettings> | null) ?? {}) });
  out.dailyGoal = prof?.daily_goal ?? DEFAULT_DAILY_GOAL;
  out.gradeGoals = { ...defaultsGrade, ...((prof?.grade_goals as Partial<GradeGoals> | null) ?? {}) };
  return out;
}

export interface Diff {
  upserts: Partial<Record<CollectionKey, { id: string }[]>>;
  deletes: Partial<Record<CollectionKey, string[]>>;
  profile: Record<string, unknown> | null;
  empty: boolean;
}

/** Pure: what changed between the last-saved snapshot and the current data. */
export function diffData(prev: StudyData, next: StudyData): Diff {
  const d: Diff = { upserts: {}, deletes: {}, profile: null, empty: true };
  for (const k of KEYS) {
    const a = prev[k] as { id: string }[];
    const b = next[k] as { id: string }[];
    if (a === b) continue;
    const before = new Map(a.map((x) => [x.id, JSON.stringify(x)]));
    const ids = new Set(b.map((x) => x.id));
    const ups = b.filter((x) => before.get(x.id) !== JSON.stringify(x));
    const dels = a.filter((x) => !ids.has(x.id)).map((x) => x.id);
    if (ups.length) { d.upserts[k] = ups; d.empty = false; }
    if (dels.length) { d.deletes[k] = dels; d.empty = false; }
  }
  const p: Record<string, unknown> = {};
  if (JSON.stringify(prev.settings) !== JSON.stringify(next.settings)) p["pomodoro_settings"] = next.settings;
  if (prev.dailyGoal !== next.dailyGoal) p["daily_goal"] = next.dailyGoal;
  if (JSON.stringify(prev.gradeGoals) !== JSON.stringify(next.gradeGoals)) p["grade_goals"] = next.gradeGoals;
  if (Object.keys(p).length) { d.profile = p; d.empty = false; }
  return d;
}

export async function pushDiff(userId: string, diff: Diff) {
  const jobs: PromiseLike<{ error: unknown }>[] = [];
  for (const [k, rows] of Object.entries(diff.upserts) as [CollectionKey, { id: string }[]][]) {
    for (let i = 0; i < rows.length; i += 500) {
      const chunk = rows.slice(i, i + 500).map((r) => ({ id: r.id, user_id: userId, data: r, updated_at: new Date().toISOString() }));
      jobs.push(table(COLLECTIONS[k]).upsert(chunk, { onConflict: "user_id,id" }));
    }
  }
  for (const [k, ids] of Object.entries(diff.deletes) as [CollectionKey, string[]][]) {
    jobs.push(table(COLLECTIONS[k]).delete().eq("user_id", userId).in("id", ids));
  }
  if (diff.profile) jobs.push(supabase.from("profiles").update(diff.profile as never).eq("id", userId));
  const res = await Promise.all(jobs);
  const failed = res.find((r) => r.error);
  if (failed) throw failed.error;
}
