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

- Power icons use the shared `PowerIcon` visual mapping while persisting compact emoji keys, preserving existing database values and all current server contracts.
- Student notifications are a read-only feed of existing timestamped records, scoped by the signed QR session and class programming; this avoids duplicate event storage and disclosure across students.
- Programme quizzes are selected by the persisted session ID, not activity or session number, to avoid mixing sessions.
- Acrosport music proposals use the existing QR student scope and class programming; links are validated as HTTP(S), and only authors may remove their proposals.
- Apply application SQL migrations to the existing DATABASE_URL database, not the separate managed Cloud database, because application tables live in the former.
- Grade-to-level conversion lives in `grades.ts` and is shared by the teacher preview and grade saving; use configured levels in position order so variable scales stay consistent.
- Activity grading budgets and competency point allocations are resolved in `grades.ts`; Results uses these defaults without rewriting saved grades, keeping reference settings separate from historical evaluations.
