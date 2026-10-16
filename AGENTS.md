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
- All planner data lives in browser localStorage through the single `StudyProvider`/`useStudy()` in `src/lib/store.tsx`; components never touch storage directly — one source of truth.
- Pure planner rules (timer limits, streaks, bulk merge) live in `src/lib/logic.ts` with tests in `src/test/logic.test.ts` — keeps rules testable.
- AI calls run only in server routes under `src/routes/api/` using `src/lib/ai/*.server.ts` — keeps the key off the browser.
- Assistant quick actions are proposals only; the UI applies them after the user confirms — the AI never changes data itself.
