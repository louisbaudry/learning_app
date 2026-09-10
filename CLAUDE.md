# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project status

**Phase 1 — Foundation & Infrastructure.** The complete design (Phase 0) is
done. Application code now exists:
- ✅ Supabase PostgreSQL database with RLS, triggers, indexes (deployed)
- ✅ Monorepo with npm workspaces (admin panel, mobile app, shared types)
- ✅ Next.js admin panel with Supabase Auth (scaffold complete)
- 🚧 Edge Functions for device linking, image uploads, AI generation

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
  - `src/lib/supabase.ts` — Supabase client initialization
  - `tsconfig.json`, `next.config.js`, `.env.example`
- `apps/mobile/` — React Native + Expo placeholder (to be scaffolded).
- `packages/shared-types/` — TypeScript interfaces for database models, enums,
  API types. Imported by both admin panel and mobile app.
- `packages/supabase-client/` — Shared Supabase utilities (future).
- `supabase/functions/` — Edge Functions (TypeScript).
  - `redeem-link-code/` — Device linking (validate code, create auth user)
  - `submit-answer/` — Answer validation wrapper (planned)
  - `upload-image/` — Image upload & signed URLs (planned)
  - `generate-lesson/` — AI lesson generation (planned, see `AI_CONTENT_GENERATION.md`)
  - **Known gap:** there is no `supabase/migrations/` here — the schema on
    `dyjntcuovsoyhbkxnmih` (§ above) was applied directly rather than via
    saved migration files, so the repo has no record of the exact DDL that
    produced it beyond `SUPABASE_SETUP.md`'s summary. Any *new* schema
    change should start the convention properly: add a numbered
    `supabase/migrations/*.sql` file in the same change as the
    `DATABASE_SCHEMA.md` update, applied in filename order, never edited in
    place once applied.

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
