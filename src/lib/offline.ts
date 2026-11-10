import { COLLECTIONS, diffData, type CollectionKey } from "./cloud";
import type { StudyData } from "./types";

export type OutboxAction = {
  id: string;
  timestamp: number;
  retries: number;
  kind: "upsert" | "delete" | "profile";
  collection?: CollectionKey;
  rowId?: string;
  value?: Record<string, unknown>;
};
export interface LocalSnapshot {
  version: 1;
  data: StudyData | null;
  profile: Record<string, unknown> | null;
  outbox: OutboxAction[];
}
export const snapshotKey = (userId: string) => `study-planner:offline:v1:${userId}`;
export function readSnapshot(userId: string): LocalSnapshot {
  const raw = localStorage.getItem(snapshotKey(userId));
  if (raw) {
    try {
      const value = JSON.parse(raw) as LocalSnapshot;
      if (value.version === 1 && Array.isArray(value.outbox)) return value;
    } catch { /* A damaged cache must not prevent cloud recovery. */ }
  }
  return { version: 1, data: null, profile: null, outbox: [] };
}
export function writeSnapshot(userId: string, snapshot: LocalSnapshot) {
  // Snapshot and queue are one atomic write: never acknowledge an unpersisted edit.
  localStorage.setItem(snapshotKey(userId), JSON.stringify(snapshot));
  window.dispatchEvent(new CustomEvent("study-outbox", { detail: userId }));
}
export function actionsForDiff(previous: StudyData, next: StudyData): OutboxAction[] {
  const diff = diffData(previous, next);
  const action = (value: Omit<OutboxAction, "id" | "timestamp" | "retries">): OutboxAction => ({
    ...value, id: crypto.randomUUID(), timestamp: Date.now(), retries: 0,
  });
  const result: OutboxAction[] = [];
  for (const collection of Object.keys(COLLECTIONS) as CollectionKey[]) {
    for (const row of diff.upserts[collection] ?? []) result.push(action({ kind: "upsert", collection, rowId: row.id, value: row as Record<string, unknown> }));
    for (const rowId of diff.deletes[collection] ?? []) result.push(action({ kind: "delete", collection, rowId }));
  }
  if (diff.profile) result.push(action({ kind: "profile", value: diff.profile }));
  return result;
}
export function persistChange(userId: string, previous: StudyData, next: StudyData) {
  const cache = readSnapshot(userId);
  writeSnapshot(userId, { ...cache, data: next, outbox: [...cache.outbox, ...actionsForDiff(previous, next)] });
}
export function queueProfile(userId: string, patch: Record<string, unknown>) {
  const cache = readSnapshot(userId);
  writeSnapshot(userId, {
    ...cache, profile: { ...cache.profile, ...patch },
    outbox: [...cache.outbox, { id: crypto.randomUUID(), timestamp: Date.now(), retries: 0, kind: "profile", value: patch }],
  });
}
export function overlayOutbox(data: StudyData, actions: OutboxAction[]): StudyData {
  let next = { ...data };
  for (const action of actions) {
    if (action.kind === "profile") {
      const p = action.value ?? {};
      next = { ...next,
        settings: (p.pomodoro_settings as StudyData["settings"]) ?? next.settings,
        dailyGoal: (p.daily_goal as number) ?? next.dailyGoal,
        gradeGoals: (p.grade_goals as StudyData["gradeGoals"]) ?? next.gradeGoals,
      };
    } else if (action.collection) {
      const rows = next[action.collection] as { id: string }[];
      const remaining = rows.filter((row) => row.id !== action.rowId);
      const value = action.value as { id: string } | undefined;
      next = { ...next, [action.collection]: action.kind === "upsert" && value ? [...remaining, value] : remaining };
    }
  }
  return next;
}
export function permanentWriteError(error: unknown) {
  const code = (error as { code?: string } | null)?.code;
  // Auth, rate-limit and server errors stay queued. Only invalid data/ownership is dropped.
  return ["23503", "23502", "23514", "22P02", "42501"].includes(code ?? "");
}
const running = new Map<string, Promise<{ synced: number; dropped: number }>>();
export function replayOutbox(userId: string, send: (action: OutboxAction) => Promise<void>) {
  const existing = running.get(userId);
  if (existing) return existing;
  const job = (async () => {
    let synced = 0;
    let dropped = 0;
    while (navigator.onLine) {
      const action = readSnapshot(userId).outbox[0];
      if (!action) break;
      try {
        await send(action);
        synced++;
      } catch (error) {
        if (!permanentWriteError(error)) {
          const cache = readSnapshot(userId);
          writeSnapshot(userId, { ...cache, outbox: cache.outbox.map((a) => a.id === action.id ? { ...a, retries: a.retries + 1 } : a) });
          break;
        }
        dropped++;
      }
      const cache = readSnapshot(userId);
      writeSnapshot(userId, { ...cache, outbox: cache.outbox.filter((a) => a.id !== action.id) });
    }
    return { synced, dropped };
  })().finally(() => running.delete(userId));
  running.set(userId, job);
  return job;
}