# Student Study Planner — Build Plan

## Visual direction
Calm "paper & ink" look: warm off-white surfaces, deep slate ink, sage-green primary, soft terracotta accent. Headings in Sora, body in Manrope. Rounded cards, subtle shadows, full light/dark theme toggle. Mobile-first with a bottom tab bar on phones and a side nav on desktop.

## Pages
- **Dashboard** (/) — today's focus vs. daily goal (progress ring), streak card (current, longest, 30-day heatmap), subject cards (color tag, progress bar, flagged count), upcoming tasks, compact Pomodoro.
- **Subjects** (/subjects, /subjects/$id) — create/edit subjects with colors; per-subject topic list with status cycle (Not started / Studying / Understood), priority, due date, review star.
- **Tasks** (/tasks) — standalone tasks with subject tag, priority, due date, done toggle; filters.
- **Review list** (/review) — all flagged topics, oldest flag first, unflag button.
- **Focus** (/focus) — full Pomodoro: circular countdown, Focus/Short/Long mode indicator, Start/Pause/Reset, subject/topic picker, settings panel (number inputs, presets 25/5, 45/10, 50/10, 90/20, long break + interval, auto-start, mute, "Reset to default (25/5)"). Confirms before changing a running session.
- **Stats** (/stats) — focus minutes per subject (donut), today / this week totals, understood vs remaining per subject (stacked bar).
- **Bulk Add** (dialog, from Subjects & Dashboard) — paste text or upload .txt / PDF / image; AI returns subjects + topics; editable preview (rename, delete, reassign, add), batch priority, due date, starting status; merges into existing subjects by name; nothing saved until "Confirm & Add".
- **AI assistant** — floating button on every page, opens a side panel: starter questions, streamed markdown answers, typing indicator, "Clear chat", and confirm-before-apply quick actions (e.g. flag topics for review, set status, add task).

## Data
Everything in the browser (localStorage): subjects, topics, tasks, sessions, timer settings, daily goal (default 100 min), theme, chat history (single conversation). A sample subject is seeded on first load, with a "Clear sample data" button. Timer uses timestamps so it stays accurate in background tabs; each session logs actual minutes completed.

## AI (Lovable Cloud)
Enable Lovable Cloud; all AI calls run server-side so no key reaches the browser. Friendly messages for rate limits, out-of-credits and invalid AI output.

## Technical details
- Shared types in `src/lib/types.ts`; single `StudyProvider` + `useStudy()` hook (`src/lib/store.tsx`) owning all localStorage reads/writes, hydrated in an effect to avoid SSR mismatches.
- Pure helpers with vitest tests: streak calc, per-day/week/subject minute aggregation, subject merge by case-insensitive name, timer remaining-time from timestamps, settings clamping (1-120 / 1-30 / 1-60) and defaults.
- Timer engine hook `useTimer` stores `{mode, endsAt, pausedRemaining, cycleCount}` in localStorage; Web Audio beep alert.
- Server routes (TanStack, AI SDK via Lovable AI Gateway, default model `openai/gpt-6-astra` on Responses):
  - `/api/bulk-parse` — accepts text or an image/PDF (sent as file part); strict JSON-schema output `{subjects:[{name, topics:[string]}]}`, validated with zod, fallback parse on failure.
  - `/api/assistant` — streaming chat; client sends messages + compact data summary (per-subject status counts, flagged topics with age, focus minutes 7/30 days per subject, upcoming dues, streak, Pomodoro settings). System prompt: use only provided data, explain every recommendation, plan in user's Pomodoro lengths, concise and encouraging. Proposals tool (`propose_actions`) with no server execution; UI renders them as confirm buttons applied via the store.
- Chat UI built with AI Elements (Conversation, Message, MessageResponse, PromptInput, Tool) and `useChat`.
- Charts via recharts; per-route head() metadata.
