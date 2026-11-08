import { describe, expect, it, vi } from "vitest";
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
import { diffData } from "@/lib/cloud";
import { EMPTY_DATA } from "@/lib/store";
import type { Subject } from "@/lib/types";

const sub = (id: string, name = "Bio"): Subject => ({ id, name, color: "x", createdAt: 1 });

describe("cloud sync diff", () => {
  it("reports nothing when data is unchanged", () => {
    expect(diffData(EMPTY_DATA, EMPTY_DATA).empty).toBe(true);
  });
  it("upserts only new or edited rows and deletes removed ones", () => {
    const prev = { ...EMPTY_DATA, subjects: [sub("a"), sub("b"), sub("c")] };
    const next = { ...EMPTY_DATA, subjects: [sub("a"), sub("b", "Chem"), sub("d")] };
    const d = diffData(prev, next);
    expect(d.upserts.subjects?.map((s) => s.id)).toEqual(["b", "d"]);
    expect(d.deletes.subjects).toEqual(["c"]);
  });
  it("saves a changed daily goal to the profile", () => {
    const d = diffData(EMPTY_DATA, { ...EMPTY_DATA, dailyGoal: 60 });
    expect(d.profile).toEqual({ daily_goal: 60 });
  });
});
