import { useEffect, useState } from "react";
import { useAuth } from "./auth";

export type Mode = "light" | "dark" | "system";
export const MODE_KEY = "study-planner:theme";
export const THEME_KEY = "study-planner:palette";

export function applyTheme(mode: Mode, theme: string) {
  const dark = mode === "dark" || (mode === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  const el = document.documentElement;
  el.classList.toggle("dark", dark);
  if (theme === "sage") el.removeAttribute("data-theme");
  else el.setAttribute("data-theme", theme);
}

const readMode = () => (localStorage.getItem(MODE_KEY) as Mode | null) ?? "system";
const readTheme = () => localStorage.getItem(THEME_KEY) ?? "sage";

/** Inline script run before paint so pages never flash the wrong theme. */
export const THEME_BOOT_SCRIPT = `try{var m=localStorage.getItem("${MODE_KEY}")||"system",t=localStorage.getItem("${THEME_KEY}")||"sage",d=m==="dark"||(m==="system"&&matchMedia("(prefers-color-scheme: dark)").matches),e=document.documentElement;e.classList.toggle("dark",d);if(t!=="sage")e.setAttribute("data-theme",t)}catch(_){}`;

/** Keeps the page theme in sync with the device setting and, when signed in, the account's saved choice. */
export function useThemeSync() {
  const { profile } = useAuth();
  useEffect(() => {
    applyTheme(readMode(), readTheme());
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme(readMode(), readTheme());
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  useEffect(() => {
    if (!profile) return;
    const m = profile.theme_preference as Mode;
    const t = profile.color_theme;
    if (m && m !== readMode()) localStorage.setItem(MODE_KEY, m);
    if (t && t !== readTheme()) localStorage.setItem(THEME_KEY, t);
    applyTheme(readMode(), readTheme());
    window.dispatchEvent(new Event("study-theme"));
  }, [profile?.theme_preference, profile?.color_theme]); // eslint-disable-line react-hooks/exhaustive-deps
}

export function useTheme() {
  const { user, updateProfile } = useAuth();
  const [mode, setMode] = useState<Mode>("system");
  const [theme, setTheme] = useState("sage");
  useEffect(() => {
    const read = () => { setMode(readMode()); setTheme(readTheme()); };
    read();
    window.addEventListener("study-theme", read);
    return () => window.removeEventListener("study-theme", read);
  }, []);
  const save = (patch: { theme_preference?: string; color_theme?: string }) => {
    if (user) void updateProfile(patch).catch(() => undefined);
  };
  return {
    mode,
    theme,
    pickMode: (m: Mode) => { setMode(m); localStorage.setItem(MODE_KEY, m); applyTheme(m, theme); save({ theme_preference: m }); },
    pickTheme: (t: string) => { setTheme(t); localStorage.setItem(THEME_KEY, t); applyTheme(mode, t); save({ color_theme: t }); },
  };
}
