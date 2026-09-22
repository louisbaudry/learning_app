# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project status

**Phase 1 — Foundation & Infrastructure.** The complete design (Phase 0) is
done. Application code now exists:
- ✅ Supabase PostgreSQL database with RLS, triggers, indexes (deployed)
- ✅ Monorepo with npm workspaces (admin panel, mobile app, shared types)
- ✅ Next.js admin panel with Supabase Auth (scaffold complete)
- ✅ Edge Functions: device linking (`redeem-link-code`), AI lesson
  generation (`generate-lesson`)
- 🚧 Edge Functions: image uploads (`upload-image`); admin panel UI to
  actually call `generate-lesson`

**The canonical Supabase project is `dyjntcuovsoyhbkxnmih`**
(`https://dyjntcuovsoyhbkxnmih.supabase.co`, see `SUPABASE_SETUP.md`). A
second project got created in parallel by mistake early in Phase 1, when two
sessions independently built the backend at the same time without either
knowing about the other; it has been torn down. **Never create another
Supabase project for this app** — if a schema change is needed, apply it to
this one (and record it — see the `supabase/` entry below for the current
gap there).

Always ground changes in the spec documents below — they are the source of
truth. When implementing features, update the relevant spec (DATABASE_SCHEMA.md,
EDGE_FUNCTIONS.md, etc.) at the same time, rather than drifting from design.

Read in this order for full context:
0. `BACKLOG.md` — what has been built and what it taught, plus the
   repo's open GitHub issues (what's next — one per open backlog entry,
   labelled by epic and size). Start here; it is the fastest way to see
   where the project actually is. Don't start an item without reading
   the spec section it names.
1. `SPECIFICATIONS.md` — vision, personas, features, architecture, all
   resolved decisions (§11: mobile framework, backend, images, AI review,
   offline, business model, child login, co-parent access, data export,
   curriculum alignment, assessment item standard, child data legal basis,
   testing strategy).
2. `DATABASE_SCHEMA.md` — the complete PostgreSQL schema (Supabase), RLS
   policies, triggers, and resolved review points (retry/scoring, due dates,
   timezone).
3. `AI_CONTENT_GENERATION.md` — the Claude API integration design: prompt
   structure, structured-output contract, model/A-B strategy, review
   workflow.
4. `design/` — UI wireframes (see below).
5. `TESTING.md` — the testing strategy for once application code exists:
   risk-ordered priority tiers, tools per platform, CI plan.

## The working rhythm

1. **Spec before code.** A design decision (a schema change, a new Edge
   Function contract, a product-scope change) gets written into the
   relevant spec — `DATABASE_SCHEMA.md`, `EDGE_FUNCTIONS.md`,
   `SPECIFICATIONS.md` — before or alongside the implementation, not
   after. A schema change also adds its numbered
   `supabase/migrations/*.sql` file in that same change.
2. **One card, one branch, one PR.** Take a single issue from the board,
   branch for it, and end with a PR whose body says `Closes #NN` — on
   merge that closes the issue and moves its card, so the board stays
   true with no bookkeeping. Rewrite the `BACKLOG.md` entry as _record_
   in the same change: strike the title through, say where the code
   lives, keep what it taught (a bug caught, a design choice made), and
   drop the issue link. Its **status** is the issue's job, never the
   file's; `BACKLOG.md`'s own header states the two heading forms.
3. **Never merge without being asked.** Push the branch, open the PR,
   describe what it does — then wait. This holds even when the change
   looks obviously safe.
4. **Branch from `main`, merge back to `main`, promptly.** Never branch
   from another session's branch, and never let one accumulate several
   sessions of work.
5. **One session at a time on one area.** Every session writes its record
   into `BACKLOG.md`, which makes that file a single point of contention
   by design. Two sessions on the same epic conflict there, in entries
   neither was editing on purpose. This project has already paid for
   ignoring that once: two parallel sessions built the backend
   simultaneously and created a second Supabase project that had to be
   torn down (see `BACKLOG.md` #2).

## Where "what's left" actually lives

Two places, deliberately split. **Open GitHub issues** carry status,
ordering and what's in flight — one per open `BACKLOG.md` entry, labelled
`epic:*` and `size:*`, linked from that entry. **`BACKLOG.md`** carries
the record of what shipped and why.

Check the issues before assuming what's left, and the backlog before
assuming a decision was never made. Don't trust the "Project status"
section above or `README.md` for what's done — both go stale immediately;
they describe the shape of the project, not its progress. Updating a
backlog entry's _status_ in markdown is the thing not to do — move the
card instead.

## Key architectural decisions (do not re-litigate without asking)

- **No standalone backend server.** Both the web admin panel and the mobile
  app talk directly to Supabase via its client SDK. PostgreSQL Row Level
  Security enforces all access control (family-scoped for parents,
  device-scoped for the child's linked phone). Supabase Edge Functions are
  used ONLY for logic that must not run on the client: AI generation calls
  (holds the Claude API key), device-link-code redemption, and answer
  validation (`submit_answer`, so `is_correct` can't be read client-side
  before answering).
- **Mobile: React Native + Expo** (not native Kotlin) — one codebase for
  Android now and iOS later, plus over-the-air updates.
- **Tenancy unit is `families`, not `users`.** A parent is a `family_member`
  with a role (`owner` / `co_parent` / `viewer`). MVP has one owner per
  family; this shape exists so co-parent invites (Phase 2) don't require a
  schema redesign.
- **AI-generated content is never auto-published.** It always lands as
  `contents.status = 'draft'`; a parent must review and explicitly publish
  before it becomes assignable. This is enforced by RLS/status checks, not
  just UI.
- **Scoring counts the first attempt only.** After a wrong answer the
  student sees a hint and can retry until correct (`responses.attempt`
  records every try), but `assignments.score_*` and all analytics use
  attempt 1 — so progress data reflects real level, not eventual success.
- **Due dates are soft.** They order the student's feed and drive "overdue"
  visibility for the parent, but assignments never lock.
- **The child is never a Supabase Auth email/password user.** A parent
  generates a one-time `device_link_codes` entry; redeeming it (via Edge
  Function) creates an anonymous Supabase Auth user tied to
  `student_devices`, optionally protected by a PIN stored as
  `students.pin_hash`.
- Multilingual from day one: `language` columns use `'en' | 'fr' | 'es' |
  'uk'`. Code and comments are always in English regardless of content
  language.

## Repository layout

### Specifications & Design (Phase 0)

- `BACKLOG.md` — the Phase 1/1.5 work record. Every open entry is a
  GitHub issue on the project board; completed entries keep the
  write-up of what the work taught. Never record progress here.
- `SPECIFICATIONS.md`, `DATABASE_SCHEMA.md`, `AI_CONTENT_GENERATION.md` —
  the specs. Edit these when a design decision changes, and log the decision
  inline rather than deleting the prior reasoning.
- `PRIVACY_POLICY.md` — draft parent-facing privacy policy (not legal advice,
  pending professional review). Keep in sync with `DATABASE_SCHEMA.md` when
  either changes.
- `TESTING.md` — testing strategy (risk-ordered priority tiers, tools per
  platform, CI plan). Update when tech stack or RLS policies change.
- `prompts/lesson-generation/v1.md` — canonical, versioned system prompt.
  **Never edit a version file in place** — create `v2.md`, etc.
- `experiments/generation-test/` — Node.js harness for validating AI output.
- `design/` — UI wireframes (5 mobile + 4 admin screens, WCAG 2.2 AA).

### Infrastructure & Development (Phase 1)

- `SUPABASE_SETUP.md` — database deployment and schema reference.
- `MONOREPO_SETUP.md` — monorepo structure and development workflow.
- `EDGE_FUNCTIONS.md` — server-side functions (device linking, uploads, AI).
- `apps/admin/` — Next.js admin panel (TypeScript, Supabase Auth).
  - `src/pages/` — Next.js pages (login, dashboard, ...)
  - `src/pages/play/[code].tsx` — ⚠️ **temporary test harness** (added
    2026-09-15), not the decided mobile architecture. A no-login,
    student-facing web page that reuses the exact same backend (schema,
    RLS, `redeem-link-code`, `submit_answer()`) the real mobile app will
    use, built only to validate the core loop (assign → answer → see
    results) end-to-end before investing in the React Native/Expo app —
    see the full flow in the file's own header comment. Delete or replace
    once the real mobile app exists; don't build on top of it.
  - `src/lib/supabase.ts` — Supabase client initialization
  - `tsconfig.json`, `next.config.js`, `.env.example`
- `apps/mobile/` — React Native + Expo placeholder (to be scaffolded).
- `packages/shared-types/` — TypeScript interfaces for database models, enums,
  API types. Imported by both admin panel and mobile app.
- `packages/supabase-client/` — Shared Supabase utilities (future).
- `supabase/functions/` — Edge Functions (TypeScript).
  - `redeem-link-code/` — ✅ Device linking. **Rewritten 2026-09-15** (see
    `EDGE_FUNCTIONS.md` §1) — the original version was a dead end that
    never returned usable session credentials, blocking every device link
    attempt; now uses standard client-side `signInAnonymously()` +
    this function only *links* that session to a student.
  - `submit-answer/` — Answer validation wrapper (planned; `submit_answer()`
    DB function it would wrap already works)
  - `upload-image/` — Image upload & signed URLs (planned)
  - `generate-lesson/` — ✅ AI lesson generation, see `EDGE_FUNCTIONS.md` §4
    and `AI_CONTENT_GENERATION.md`. Calls Claude with the versioned v1
    prompt, inserts the draft via the `insert_ai_lesson()` DB function
    (one transaction), logs every attempt to `ai_generations`. Not yet
    deployed to production or wired to any admin panel UI.
- `supabase/migrations/` — as of 2026-09-10, backfilled from the 4
  migrations actually applied to `dyjntcuovsoyhbkxnmih` on 2026-09-06
  (pulled verbatim from `supabase_migrations.schema_migrations`, not
  reconstructed from docs), closing the gap this section used to flag.
  8 migrations total as of 2026-09-15: 01–04 are the original schema, 05
  fixed the `submit_answer()` bug below, 06 added `insert_ai_lesson()` for
  `generate-lesson`, 07 fixed the `handle_new_user()` bug below, 08 fixed
  the `student_question_options` view bug below. Any *new* schema change
  adds a numbered `supabase/migrations/*.sql` file in the same change as
  the `DATABASE_SCHEMA.md` update, applied in filename order, never
  edited in place once applied.
  Note: `mcp__Supabase__execute_sql` runs read-only on this project (any
  top-level INSERT/UPDATE/DELETE fails with "read-only transaction") —
  use `apply_migration` for writes, even one-off data seeding that isn't
  really a schema migration (there's no separate seed-data tool).
  **Note (found 2026-09-15, cost ~an hour of misdiagnosis — read this
  before debugging an Edge Function "hang" from a cloud/sandboxed Claude
  Code session):** this kind of session's outbound proxy cannot reach
  Supabase Edge Functions (`/functions/v1/*`) at all — confirmed via
  `curl -v`: TLS handshake and request send succeed, then zero response
  bytes ever arrive, while `/rest/v1/*` and `/auth/v1/*` on the same
  project respond instantly. `/root/.ccr/README.md`'s own troubleshooting
  guide names the cause: Edge Functions run on an HTTP/2-only backend,
  which that section lists as explicitly unsupported through the proxy
  (alongside gRPC and WebSocket upgrades) — "report, do not work around."
  A hang here is **not** evidence of a bug in the function (`verify_jwt`,
  CORS/OPTIONS handling, etc.) — don't spend time changing function
  config/code to chase it. Ask the user to test from their own machine
  instead (their browser/curl won't go through this proxy).
- **Bug fixed (found and fixed 2026-09-10):** the deployed
  `submit_answer()` function (migration `02_create_helper_functions_and_rls`)
  selected a column `explanation` from `question_options` for
  multiple_choice/image_identification answers — but `question_options`
  has no `explanation` column (only `questions` does; see
  `DATABASE_SCHEMA.md` §3.8–3.9). This is plpgsql, so it wasn't caught at
  function-creation time; it would have raised `column "explanation" does
  not exist` the first time a student answered a non-fill-in-blank
  question. Fixed in migration `05_fix_submit_answer_explanation_column`
  (applied to `dyjntcuovsoyhbkxnmih` and committed) — `explanation` is now
  always read from `questions`, for all question types.
- **Bug fixed (found and fixed 2026-09-15, higher severity — blocked every
  signup):** none of the 7 `public` functions had an explicit
  `search_path`. In most call contexts Postgres/PostgREST supplies one
  that includes `public`, so this went unnoticed — but the `auth.users`
  insert trigger that fires `handle_new_user()` on every parent signup
  does not, so its unqualified `insert into profiles (...)` failed with
  `relation "profiles" does not exist`, aborting the signup transaction.
  Caught 2026-09-15 on the first real signup attempt (also flagged by
  Supabase's own security advisor as "Function Search Path Mutable" for
  all 7). Fixed in migration `07_fix_function_search_path` (applied to
  `dyjntcuovsoyhbkxnmih`): explicit `search_path = public, pg_temp` on
  `my_family_ids`, `my_student_id`, `normalize_answer`, `touch_updated_at`,
  `handle_new_user`, `submit_answer`, `insert_ai_lesson`. Also revoked
  `handle_new_user()`'s (unintended, advisor-flagged) direct callability by
  `anon`/`authenticated` via `/rest/v1/rpc/handle_new_user` — it should
  only ever run as the trigger.
- **Bug fixed (found and fixed 2026-09-15, real data leak):** the
  `student_question_options` view (migration
  `02_create_helper_functions_and_rls` — hides `is_correct` from students)
  was created `SECURITY DEFINER` by default (Postgres's default for a
  plain `create view` before explicit `security_invoker`), and has no
  `WHERE` clause of its own — it relies entirely on the querying role's
  RLS on `question_options` to restrict rows. Being security-definer meant
  it ran with the *view owner's* privileges instead, bypassing that RLS
  for every caller: any authenticated user querying it got every family's
  question option labels back, not just their own assigned ones (flagged
  by Supabase's security advisor as "Security Definer View", ERROR level).
  Fixed in migration `08_fix_student_question_options_view_security`
  (applied to `dyjntcuovsoyhbkxnmih`): `security_invoker = true` on the
  view, so the existing (correct) `question_options_student_read` /
  `question_options_parent_read` RLS policies apply as originally intended.

## Standards referenced

Several design/schema/testing decisions are grounded in named external
standards — see `SPECIFICATIONS.md` §11 (Decisions 10–13) for the full
rationale behind each. When you add or touch content related to one of
these, link the standard the same way the existing code does (a comment at
the top of the file, or an inline markdown link at first mention in prose)
rather than naming it bare:

| Standard | Link | Where it shows up |
|---|---|---|
| WCAG 2.2 (AA) | <https://www.w3.org/TR/WCAG22/> | `design/*.dc.html` header comments, `SPECIFICATIONS.md` §7.1 |
| IMS/1EdTech QTI 3.0 | <https://www.1edtech.org/standards/qti/index> | `DATABASE_SCHEMA.md` §3.8–3.9 (`questions`/`question_options` shape), `experiments/generation-test/generate.mjs` |
| Éduscol / Socle commun | <https://eduscol.education.gouv.fr/> | `DATABASE_SCHEMA.md` `curriculum_cycle`, `AI_CONTENT_GENERATION.md` request parameters |
| GDPR (Art. 5, 8, 9) | <https://gdpr-info.eu/> | `SPECIFICATIONS.md` §11 Decision 12, `DATABASE_SCHEMA.md` `terms_accepted_at`/`disability_type` note, `PRIVACY_POLICY.md` |
| CNIL recommendations on minors | <https://www.cnil.fr/> | `PRIVACY_POLICY.md`, `SPECIFICATIONS.md` §11 Decision 12 (age-15 consent threshold rationale) |
| COPPA | <https://www.ftc.gov/legal-library/browse/rules/childrens-online-privacy-protection-rule-coppa> | `SPECIFICATIONS.md` §11 deferred-standards list (US-only, not applicable to MVP) |
| ISO/IEC 25010 | <https://www.iso.org/standard/35733.html> | `TESTING.md` (priority-tier ordering, mapping to §12 success criteria) |

## Commands

### Phase 1: Admin Panel & Infrastructure

```bash
# Install all dependencies (monorepo root)
npm install

# Run the admin panel (http://localhost:3000)
npm run dev -w @learning-app/admin

# Run type checking across all workspaces
npm run type-check

# Deploy Edge Functions locally (requires Supabase CLI)
supabase functions deploy redeem-link-code --no-verify-jwt

# generate-lesson needs the caller's JWT verified (omit --no-verify-jwt)
# and ANTHROPIC_API_KEY set as a Supabase secret first:
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
supabase functions deploy generate-lesson
```

**Environment setup:**
```bash
# Copy template and fill in your Supabase credentials
cp apps/admin/.env.example apps/admin/.env.local
# Edit: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
```

### AI Content Generation Testing

Test the lesson generation harness (Phase 0 validation):

```bash
cd experiments/generation-test
npm install
export ANTHROPIC_API_KEY=sk-ant-...   # never commit this
npm run generate                       # generates 10-case batch (claude-opus-5)
node generate.mjs --model claude-sonnet-5   # A/B against different model
node generate.mjs --only 3             # regenerate single case
```

Output: `experiments/generation-test/output/` (git-ignored)

**Dependency notes:**
- `@anthropic-ai/sdk` is still on `0.x` line (do not pin `^1`)
- Its `helpers/zod` module requires **zod v4** (imports `zod/v4` internally)

## Conventions

- All code and comments are in English; all learner- and parent-facing
  content is authored in French first (Arthur's language), per
  `SPECIFICATIONS.md`.
- Every schema or architecture change belongs in `DATABASE_SCHEMA.md` /
  `SPECIFICATIONS.md` in the same change that needs it — this repo treats
  the specs as living documents, not a one-time planning artifact.
