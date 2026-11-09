<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture
- All planner data flows through the single `StudyProvider`/`useStudy()` in `src/lib/store.tsx`, which loads the signed-in user's rows from the cloud and saves changes by diffing state (`src/lib/cloud.ts`, one jsonb row per item, RLS by user_id); components never touch storage directly — optimistic UI, one source of truth.
- Signed-in pages live under `src/routes/_authenticated/` (client-only guard redirecting to /login); public pages stay top-level — keeps the landing/auth/legal pages crawlable.
- AI endpoints verify the bearer token and the assistant builds its data snapshot server-side from the caller's own rows — never trust client-sent data.
- The service worker registers only via `src/lib/pwa.tsx` (production, non-preview hosts) and precaches static assets only — preview and API/auth calls are never cached.
- Pure planner rules (timer limits, streaks, bulk merge) live in `src/lib/logic.ts` with tests in `src/test/logic.test.ts` — keeps rules testable.
- AI calls run only in server routes under `src/routes/api/` using `src/lib/ai/*.server.ts` — keeps the key off the browser.
- Assistant quick actions are proposals only; the UI applies them after the user confirms — the AI never changes data itself.
- Exam papers own their marks through a linked TestScore (scoreId) written only by the store's savePaper — Scores history and exam periods never disagree.
