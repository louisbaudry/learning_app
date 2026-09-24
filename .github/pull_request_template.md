Closes #

<!--
What this does, and why. Prose, not a file list — the diff already lists
the files. If it changes a decision, say which one and what replaced it.
-->

### Before merge

- [ ] **`BACKLOG.md` entry rewritten as record.** Strike the title through,
      say where the code lives, keep what it taught, drop the issue link —
      `**#N · ~~Title~~ · DONE — where it lives**`. Don't leave it carrying
      both a write-up and a live issue link: that reads as open on the board
      and done in the file. (`CLAUDE.md` → The working rhythm, rule 2.)
- [ ] **Spec updated in this same change**, if this changed a design
      decision — `SPECIFICATIONS.md`, `DATABASE_SCHEMA.md`,
      `EDGE_FUNCTIONS.md`, `AI_CONTENT_GENERATION.md`. The specs are the
      source of truth; code that drifts from them is the bug.
- [ ] **Schema change carries its numbered `supabase/migrations/*.sql`**,
      applied to `dyjntcuovsoyhbkxnmih` and never edited in place once
      applied.
- [ ] `npm run type-check` passes.

<!--
Never merge without being asked — push, describe, then wait. This holds
even when the change looks obviously safe. (CLAUDE.md → rule 3.)
-->
