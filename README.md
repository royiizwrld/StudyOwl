# Study Buddy Pro

Build a responsive Student Study Planner web app with a clean, calm, modern design (card layout, light/dark mode, mobile-friendly).

SUBJECTS, UNITS & TOPICS
- Users can create Subjects (e.g. Math, Biology, History), each with a color tag.
- Each Subject contains Units/Topics. Every topic is also a task with: title, subject, priority (Low/Medium/High), optional due date, and a status.
- Topic statuses: "Not started", "Studying", "Understood". The user checks a topic off as Understood when they feel comfortable with it, and can toggle it back at any time.
- A "Needs review" flag (star/bookmark icon) the user can add to any tricky topic, independent of status. Add a "Review list" view showing all flagged topics, and let users unflag a topic once they've mastered it.
- Subject cards show a progress bar (understood topics / total topics) and the number of flagged topics.
- Also support standalone tasks (e.g. "Submit essay") with subject tag, priority and due date.

POMODORO TIMER
- Defaults: 25-minute focus and 5-minute short break. These defaults always apply on first load and whenever the user resets to defaults.
- Fully adjustable: the user can set their own focus length (1-120 min), short break (1-30 min), and an optional long break (1-60 min) taken after a configurable number of focus sessions (default 4). Use number inputs plus quick presets (e.g. 25/5, 45/10, 50/10, 90/20).
- A settings icon beside the timer opens the panel. Changes save to localStorage and apply to the next session. If the timer is running, ask before applying changes to the current session.
- A "Reset to default (25/5)" button restores the defaults.
- Start, Pause, Reset controls, a visible Focus/Break mode indicator, a circular countdown display, and an audio alert at the end of each interval.
- Option to auto-start the next interval, and a toggle to mute the alert sound.
- Before starting, the user can optionally pick which subject/topic they're studying, so the session is logged against it.
- Calculate remaining time from timestamps so the timer stays accurate in background tabs.
- Log the actual minutes completed for each session, so stats stay correct with custom durations.

STATISTICS
- Total focus minutes per subject (bar or donut chart), plus focus minutes today and this week.
- Understood vs. remaining topics per subject.

DATA
- Persist everything in localStorage (subjects, topics, tasks, sessions, timer settings).
- Seed a small sample subject on first load, with a "Clear sample data" button.

Organize the code with separate components, shared types, and a single data context/hook for storage.                                                                                                                                                                                                                                                                                                           Add a daily focus streak tracker based on completed focus sessions: show the current streak, longest streak, and a small calendar heatmap of the last 30 days. A day counts if at least one focus session was completed. Add a configurable daily focus goal (in minutes, default 100) with a progress ring on the dashboard.                                                                                                                                                                                                                                        Add a "Bulk Add" feature. The user can paste or type a messy list of subjects with their units/topics, for example:

"Chemistry: atomic structure, bonding, moles, organic basics

Math - calculus (limits, derivatives, integrals), matrices, probability"

or upload a syllabus as text, PDF or image. Send it to the AI through an edge function and have it return structured JSON: subjects with their topics. Show an editable preview where the user can rename, delete, reassign or add topics, pick a priority and due date for the whole batch, and choose whether new topics start as "Not started". Merge into existing subjects instead of creating duplicates. Nothing is saved until the user clicks "Confirm & Add". Handle invalid AI output with a friendly error.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         Add an AI study assistant as a floating chat button that opens a side panel on every page.

BEHAVIOR

- The assistant analyzes the user's performance and answers questions like "Which subjects should I focus on?", "What should I study today?", "Which flagged topics have been waiting longest?", "How is my study time spread across subjects?"

- On each message, send the AI a compact summary of the user's data: per-subject topic counts by status, flagged topics, focus minutes per subject over the last 7 and 30 days, upcoming due dates, the current streak, and the user's Pomodoro settings.

- It identifies where the user should put more emphasis using these signals: low completion percentage, many flagged topics, near due dates, and little recent study time. It always explains why it recommends a subject or topic.

- It can suggest a study plan for the day or week, broken into Pomodoro sessions that use the user's own focus and break lengths.

- It only uses the data provided, never invents numbers, and says so if data is missing. Answers are concise, encouraging and practical.

- Include starter questions, markdown rendering, streaming responses, a "Clear chat" button, and a typing indicator.

- Add quick actions on responses, such as "Flag these topics for review", that apply changes only after the user confirms.

IMPLEMENTATION

- Use Lovable Cloud with an edge function to call the AI model so no API key is exposed in the browser. Handle errors and rate limits gracefully.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/4482e78e-c9a5-4655-9a36-746399a9d49d).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
