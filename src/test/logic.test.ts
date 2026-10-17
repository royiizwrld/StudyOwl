import { describe, expect, it } from "vitest";
import { clampSettings, computeStreaks, DEFAULT_DAILY_GOAL, DEFAULT_SETTINGS, mergeBulk, nextBreak, remainingFrom } from "@/lib/logic";
import type { FocusSession, Subject, Topic } from "@/lib/types";

const sess = (daysAgo: number, completed = true): FocusSession => {
  const d = new Date(2026, 9, 16, 12);
  d.setDate(d.getDate() - daysAgo);
  return { id: String(Math.random()), subjectId: null, topicId: null, startedAt: d.getTime() - 1, endedAt: d.getTime(), minutes: 25, completed };
};

describe("timer defaults", () => {
  it("defaults to 25 min focus, 5 min short break, long break every 4", () => {
    expect(DEFAULT_SETTINGS.focus).toBe(25);
    expect(DEFAULT_SETTINGS.shortBreak).toBe(5);
    expect(DEFAULT_SETTINGS.longBreakEvery).toBe(4);
  });
  it("daily goal defaults to 100 minutes", () => expect(DEFAULT_DAILY_GOAL).toBe(100));
  it("clamps focus to 1-120, short to 1-30, long to 1-60", () => {
    const s = clampSettings({ focus: 500, shortBreak: 0, longBreak: 99 });
    expect([s.focus, s.shortBreak, s.longBreak]).toEqual([120, 1, 60]);
  });
  it("takes a long break after the configured number of focus sessions", () => {
    const s = { ...DEFAULT_SETTINGS, longBreakEnabled: true, longBreakEvery: 4 };
    expect(nextBreak(3, s)).toBe("short");
    expect(nextBreak(4, s)).toBe("long");
  });
  it("derives remaining time from timestamps", () => {
    expect(remainingFrom(10_000, 4_000)).toBe(6_000);
    expect(remainingFrom(10_000, 12_000)).toBe(0);
  });
});

describe("streaks", () => {
  const today = new Date(2026, 9, 16, 18);
  it("counts consecutive days with a completed session", () => {
    const r = computeStreaks([sess(0), sess(1), sess(2), sess(5), sess(6), sess(7), sess(8)], today);
    expect(r.current).toBe(3);
    expect(r.longest).toBe(4);
  });
  it("partial sessions don't count toward a streak", () => {
    expect(computeStreaks([sess(0, false)], today).current).toBe(0);
  });
  it("streak survives until today ends if yesterday was active", () => {
    expect(computeStreaks([sess(1), sess(2)], today).current).toBe(2);
  });
});

describe("bulk merge", () => {
  const subjects: Subject[] = [{ id: "s1", name: "Chemistry", color: "c", createdAt: 0 }];
  const topics: Topic[] = [{ id: "t1", subjectId: "s1", title: "Bonding", priority: "low", dueDate: null, status: "understood", flagged: false, flaggedAt: null, createdAt: 0 }];
  let n = 0;
  const opts = { priority: "high" as const, dueDate: null, status: "not_started" as const, colorFor: () => "x", newId: () => `n${n++}`, now: 1 };
  it("merges into an existing subject by name instead of duplicating", () => {
    const r = mergeBulk(subjects, topics, [{ name: " chemistry ", topics: ["bonding", "Moles"] }], opts);
    expect(r.newSubjects).toHaveLength(0);
    expect(r.newTopics.map((t) => t.title)).toEqual(["Moles"]);
    expect(r.newTopics[0]?.subjectId).toBe("s1");
  });
  it("creates new subjects for unknown names", () => {
    const r = mergeBulk(subjects, topics, [{ name: "Math", topics: ["Limits"] }], opts);
    expect(r.newSubjects.map((s) => s.name)).toEqual(["Math"]);
  });
});

import { dueRevisions, weakSpots, withStatus, averagePct } from "@/lib/logic";
describe("spaced revision", () => {
  const D = 86400000, now = 100 * D;
  const t = (ago: number, stage = 0) => ({ status: "understood", understoodAt: now - ago * D, reviewStage: stage });
  it("resurfaces after 3, 7 and 14 days", () => {
    expect(dueRevisions([t(2)], now)).toHaveLength(0);
    expect(dueRevisions([t(3)], now)).toHaveLength(1);
    expect(dueRevisions([t(6, 1)], now)).toHaveLength(0);
    expect(dueRevisions([t(7, 1)], now)).toHaveLength(1);
    expect(dueRevisions([t(14, 2)], now)).toHaveLength(1);
    expect(dueRevisions([t(30, 3)], now)).toHaveLength(0);
  });
  it("marking understood starts the clock", () => {
    const r = withStatus({ status: "studying" as string, understoodAt: null }, "understood", 5);
    expect(r.understoodAt).toBe(5);
  });
});
describe("weak spots", () => {
  it("returns at most 3 and ranks low scores", () => {
    const subjects = ["a", "b", "c", "d"].map((id) => ({ id, name: id }));
    const scores = [{ subjectId: "a", score: 20, outOf: 100 }, { subjectId: "b", score: 95, outOf: 100 }];
    const r = weakSpots({ subjects, topics: [], scores, sessions: [] });
    expect(r[0]?.id).toBe("a");
    expect(r.length).toBeLessThanOrEqual(3);
    expect(averagePct(scores)).toBe(58);
  });
});
