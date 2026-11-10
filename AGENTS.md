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
- All planner edits flow through StudyProvider/useStudy; src/lib/offline.ts atomically persists user-keyed snapshots and timestamped outbox actions before publishing optimistic state, then src/lib/cloud.ts replays idempotent writes sequentially — failed writes survive reloads and cloud refreshes overlay unacknowledged edits.
- Signed-in pages live under `src/routes/_authenticated/` (client-only guard redirecting to /login); public pages stay top-level — keeps the landing/auth/legal pages crawlable.
- AI endpoints verify the bearer token and the assistant builds its data snapshot server-side from the caller's own rows — never trust client-sent data.
- The service worker registers only via src/lib/pwa.tsx on production non-preview hosts; Workbox caches same-origin app-shell navigations NetworkFirst and static assets, excluding auth/API/OAuth calls and never caching user API responses — installed planners can reopen offline without leaking account data through HTML.
- Profile edits share the user-keyed persistent outbox; cached sessions enable offline access only for previously signed-in users and expired sessions must reauthenticate before cloud replay — a cache is never authority for server permissions.
- Pure planner rules (timer limits, streaks, bulk merge) live in `src/lib/logic.ts` with tests in `src/test/logic.test.ts` — keeps rules testable.
- AI calls run only in server routes under `src/routes/api/` using `src/lib/ai/*.server.ts` — keeps the key off the browser.
- Assistant quick actions are proposals only; the UI applies them after the user confirms — the AI never changes data itself.
- Exam papers own their marks through a linked TestScore (scoreId) written only by the store's savePaper — Scores history and exam periods never disagree.
