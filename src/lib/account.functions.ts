import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const TABLES = ["subjects", "topics", "tasks", "focus_sessions", "objectives", "test_scores", "exam_periods", "exam_papers"] as const;

/** Permanently deletes the caller's study data and their account. */
export const deleteMyAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    for (const t of TABLES) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from(t as any) as any).delete().eq("user_id", userId);
      if (error) throw new Error("Couldn't delete your data. Please try again.");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) throw new Error("Couldn't delete your account. Please try again.");
    return { ok: true };
  });
