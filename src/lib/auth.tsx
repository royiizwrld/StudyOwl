import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { readSnapshot, writeSnapshot, queueProfile, replayOutbox } from "./offline";
import { pushAction } from "./cloud";
import type { Tables } from "@/integrations/supabase/types";

export type Profile = Tables<"profiles">;
export const TERMS_VERSION = "2026-11-04-draft";

interface AuthValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  updateProfile: (patch: Partial<Profile>) => Promise<void>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthValue | null>(null);

export function fullName(p: Pick<Profile, "first_name" | "last_name"> | null | undefined) {
  if (!p) return "";
  return [p.first_name, p.last_name].filter(Boolean).join(" ");
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (uid: string | undefined) => {
    if (!uid) return setProfile(null);
    const cached = readSnapshot(uid);
    if (cached.profile) setProfile(cached.profile as Profile);
    if (!navigator.onLine) return;
    const { data, error } = await supabase.from("profiles").select("*").eq("id", uid).maybeSingle();
    if (error) return;
    if (data) {
      const cache = readSnapshot(uid);
      const merged = cache.outbox.filter((a) => a.kind === "profile").reduce((p, a) => ({ ...p, ...a.value }), data);
      setProfile(merged as Profile);
      writeSnapshot(uid, { ...cache, profile: merged });
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (tz && data.timezone !== tz) void supabase.from("profiles").update({ timezone: tz }).eq("id", uid);
    } else {
      // Profile row missing (e.g. created before the trigger existed) — create it.
      const { data: created } = await supabase.from("profiles").insert({ id: uid }).select("*").maybeSingle();
      setProfile(created ?? null);
      if (created) writeSnapshot(uid, { ...readSnapshot(uid), profile: created });
    }
  }, []);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      if (event === "SIGNED_IN" || event === "USER_UPDATED" || event === "SIGNED_OUT") {
        setTimeout(() => void loadProfile(s?.user.id), 0);
      }
    });
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      setLoading(false);
      void loadProfile(data.session?.user.id);
    });
    return () => sub.subscription.unsubscribe();
  }, [loadProfile]);

  const value: AuthValue = {
    session,
    user: session?.user ?? null,
    profile,
    loading,
    refreshProfile: () => loadProfile(session?.user.id),
    updateProfile: async (patch) => {
      if (!session) return;
      queueProfile(session.user.id, patch);
      setProfile((p) => (p ? { ...p, ...patch } : p));
      await replayOutbox(session.user.id, pushAction.bind(null, session.user.id));
    },
    signOut: async () => {
      await supabase.auth.signOut();
      setProfile(null);
    },
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used inside AuthProvider");
  return v;
}

/** Standalone = launched as an installed app. */
export function isStandalone() {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true;
}

/** Only allow same-origin relative redirects. */
export function safeRedirect(r: unknown, fallback = "/dashboard") {
  return typeof r === "string" && r.startsWith("/") && !r.startsWith("//") ? r : fallback;
}

/** Bearer header for calls to the app's own AI endpoints. */
export async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  return data.session ? { authorization: `Bearer ${data.session.access_token}` } : {};
}
