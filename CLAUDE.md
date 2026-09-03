# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project status

**Phase 0 — specifications and design, not yet implemented.** This repository
currently contains no application code (no Supabase project, no Next.js admin
panel, no React Native app). It contains the complete, decided design for all
of those, plus one runnable Node.js experiment. Before writing app code,
always ground changes in the five spec documents below — they are the source
of truth, not a proposal.

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

- `SPECIFICATIONS.md`, `DATABASE_SCHEMA.md`, `AI_CONTENT_GENERATION.md` —
  the specs (see above). Edit these when a design decision changes, and log
  the decision inline rather than deleting the prior reasoning.
- `prompts/lesson-generation/v1.md` — the canonical, versioned source of the
  AI lesson-generation system prompt. **Never edit a version file in place**
  once it's been used to generate lessons under test — create `v2.md`, etc.,
  so `ai_generations.prompt_version` (once implemented) stays meaningful for
  A/B comparisons.
- `experiments/generation-test/` — a standalone Node.js harness (see
  Commands below) that generates real French lessons with the current
  prompt and validates them against the same rules the future Edge Function
  will enforce (`AI_CONTENT_GENERATION.md` §5). Its `generate.mjs` embeds a
  copy of the v1 prompt text — if you edit `prompts/lesson-generation/v1.md`,
  update the matching constants in `generate.mjs` too (or point it at a new
  version file) so the two don't silently drift.
- `design/` — the UI wireframes as Claude Design `.dc.html` artboards
  (5 mobile screens for the student, 4 admin-panel screens for the parent)
  plus `canvas.json` (layout/paging). These are source files for the `design`
  skill's canvas — re-seed and republish through that skill rather than
  hand-editing the published artifact. Each artboard carries an HTML comment
  at the top linking the external standard ([WCAG 2.2 AA](https://www.w3.org/TR/WCAG22/))
  it's built to — keep that comment in sync with the actual contrast/alt-text
  choices in the file when you edit one.
- `PRIVACY_POLICY.md` — draft parent-facing privacy policy grounded in
  `SPECIFICATIONS.md` §11 Decision 12 (legal basis, sub-processors,
  retention). **Not legal advice and not publishable as-is** — it has
  placeholder sections (`À compléter`) and must be reviewed by a legal
  professional before it's linked from the actual app. Keep it in sync with
  Decision 12 and `DATABASE_SCHEMA.md` (e.g. `profiles.terms_accepted_at`)
  when either changes.
- `TESTING.md` — the testing strategy grounded in `SPECIFICATIONS.md` §11
  Decision 13: risk-ordered priority tiers (RLS policies and Edge Functions
  first — they're the entire security model, per Decision 2), tools per
  platform, and a CI plan. No test files exist yet because no application
  code exists yet — this is what a feature PR follows once it does. Keep it
  in sync with the tech stack (§8) and RLS policies (`DATABASE_SCHEMA.md`
  §5) when either changes.

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

There is no app build/lint/test yet — the only runnable code is the AI
generation test harness:

```bash
cd experiments/generation-test
npm install
export ANTHROPIC_API_KEY=sk-ant-...   # never commit this
npm run generate                       # generates the default 10-case batch on claude-opus-5
node generate.mjs --model claude-sonnet-5   # A/B against a different model
node generate.mjs --only 3             # regenerate a single test case by number
```

Output goes to `experiments/generation-test/output/` (git-ignored): one JSON
file per lesson plus a human-readable `review.<model>.md` for grading.

Dependency notes (verified against the published registry, not assumed):
`@anthropic-ai/sdk` is still on the `0.x` line — do not pin `^1`, it does not
exist yet. Its `helpers/zod` module requires **zod v4** (it imports
`zod/v4` internally), not v3.

## Conventions

- All code and comments are in English; all learner- and parent-facing
  content is authored in French first (Arthur's language), per
  `SPECIFICATIONS.md`.
- Every schema or architecture change belongs in `DATABASE_SCHEMA.md` /
  `SPECIFICATIONS.md` in the same change that needs it — this repo treats
  the specs as living documents, not a one-time planning artifact.
