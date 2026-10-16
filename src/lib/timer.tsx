import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { modeMinutes, nextBreak, remainingFrom } from "./logic";
import { useStudy } from "./store";
import type { TimerMode, TimerSettings } from "./types";

const KEY = "study-planner:timer";

interface TimerState {
  mode: TimerMode;
  running: boolean;
  endsAt: number | null; // when running
  remainingMs: number; // when paused
  durationMs: number; // full length of the current interval
  startedAt: number | null; // first start of current interval
  completedFocus: number;
  subjectId: string | null;
  topicId: string | null;
}

function initial(s: TimerSettings): TimerState {
  const ms = s.focus * 60000;
  return { mode: "focus", running: false, endsAt: null, remainingMs: ms, durationMs: ms, startedAt: null, completedFocus: 0, subjectId: null, topicId: null };
}

function beep() {
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AC();
    [0, 0.35, 0.7].forEach((t) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = 660;
      o.connect(g);
      g.connect(ctx.destination);
      g.gain.setValueAtTime(0.0001, ctx.currentTime + t);
      g.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + t + 0.3);
      o.start(ctx.currentTime + t);
      o.stop(ctx.currentTime + t + 0.32);
    });
  } catch {
    /* audio unavailable */
  }
}

function useTimerValue() {
  const { settings, ready, logSession } = useStudy();
  const [state, setState] = useState<TimerState>(() => initial(settings));
  const [now, setNow] = useState(() => Date.now());
  const hydrated = useRef(false);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  // hydrate after store
  useEffect(() => {
    if (!ready || hydrated.current) return;
    hydrated.current = true;
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setState(JSON.parse(raw));
      else setState(initial(settings));
    } catch {
      setState(initial(settings));
    }
  }, [ready, settings]);

  useEffect(() => {
    if (hydrated.current) localStorage.setItem(KEY, JSON.stringify(state));
  }, [state]);

  const remaining = state.running && state.endsAt ? remainingFrom(state.endsAt, now) : state.remainingMs;

  const stateRef = useRef(state);
  stateRef.current = state;

  const logElapsed = useCallback((s: TimerState, completed: boolean, at: number) => {
    const elapsed = s.durationMs - (s.running && s.endsAt ? remainingFrom(s.endsAt, at) : s.remainingMs);
    if (s.mode === "focus" && elapsed >= 60000) {
      logSession({
        subjectId: s.subjectId, topicId: s.topicId, startedAt: s.startedAt ?? at - elapsed,
        endedAt: at, minutes: Math.round(elapsed / 60000), completed,
      });
    }
  }, [logSession]);

  const advance = (s: TimerState, completed: boolean, at: number): TimerState => {
    const cfg = settingsRef.current;
    const completedFocus = s.mode === "focus" && completed ? s.completedFocus + 1 : s.completedFocus;
    const mode: TimerMode = s.mode === "focus" ? (completed ? nextBreak(completedFocus, cfg) : "focus") : "focus";
    const ms = modeMinutes(mode, cfg) * 60000;
    const auto = completed && cfg.autoStart;
    return { ...s, mode, completedFocus, durationMs: ms, remainingMs: ms, running: auto, endsAt: auto ? at + ms : null, startedAt: auto ? at : null };
  };

  // ticking + completion (side effects outside state updaters)
  useEffect(() => {
    if (!state.running) return;
    const tick = () => {
      const t = Date.now();
      setNow(t);
      const s = stateRef.current;
      if (!s.running || !s.endsAt || s.endsAt > t) return;
      const at = s.endsAt;
      logElapsed(s, true, at);
      if (!settingsRef.current.muted) beep();
      toast(s.mode === "focus" ? "Focus session complete — time for a break" : "Break over — back to focus");
      const next = advance(s, true, at);
      stateRef.current = next;
      setState(next);
    };
    tick();
    const id = setInterval(tick, 250);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [state.running, logElapsed]);

  const start = () => {
    const t = Date.now();
    setNow(t);
    setState((s) => ({ ...s, running: true, endsAt: t + s.remainingMs, startedAt: s.startedAt ?? t }));
  };
  const pause = () => setState((s) => ({ ...s, running: false, remainingMs: s.endsAt ? remainingFrom(s.endsAt, Date.now()) : s.remainingMs, endsAt: null }));
  const reset = () => {
    const t = Date.now();
    const s = stateRef.current;
    logElapsed(s, false, t);
    const ms = modeMinutes(s.mode, settingsRef.current) * 60000;
    setState({ ...s, running: false, endsAt: null, remainingMs: ms, durationMs: ms, startedAt: null });
  };
  const skip = () => {
    const t = Date.now();
    const s = stateRef.current;
    if (s.mode === "focus") logElapsed(s, false, t);
    setState(advance(s, s.mode !== "focus", t));
  };
  const setTarget = (subjectId: string | null, topicId: string | null) => setState((s) => ({ ...s, subjectId, topicId }));

  /** Apply new settings. If `toCurrent`, also resize the interval in progress. */
  const applySettings = (cfg: TimerSettings, toCurrent: boolean) => setState((s) => {
    const idle = !s.running && s.remainingMs === s.durationMs;
    if (!toCurrent && !idle) return s;
    const t = Date.now();
    const ms = modeMinutes(s.mode, cfg) * 60000;
    const elapsed = s.durationMs - (s.running && s.endsAt ? remainingFrom(s.endsAt, t) : s.remainingMs);
    const rem = Math.max(1000, ms - elapsed);
    return { ...s, durationMs: ms, remainingMs: idle ? ms : rem, endsAt: s.running ? t + rem : null };
  });

  const inProgress = state.running || state.remainingMs !== state.durationMs;

  return { ...state, remaining, inProgress, start, pause, reset, skip, setTarget, applySettings };
}

type Timer = ReturnType<typeof useTimerValue>;
const Ctx = createContext<Timer | null>(null);
export function TimerProvider({ children }: { children: ReactNode }) {
  const v = useTimerValue();
  return <Ctx.Provider value={v}>{children}</Ctx.Provider>;
}
export function useTimer() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useTimer must be used inside TimerProvider");
  return v;
}
