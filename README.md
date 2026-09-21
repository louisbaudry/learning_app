# Learning App

An educational platform for parents to create AI-assisted learning content
for their children, assign it as homework, and track progress remotely.

**Origin:** built for a teenage son with Down Syndrome, so his father can
keep teaching him between limited visits. Designed from the start to scale
to other families — including, eventually, families in Ukraine and beyond.

## Status: Phase 1 — Foundation & Infrastructure

**Supabase project (canonical):** `dyjntcuovsoyhbkxnmih`
(`https://dyjntcuovsoyhbkxnmih.supabase.co`) — this is the one and only
backend for this app. A second Supabase project was briefly created in
parallel during early Phase 1 work and has since been torn down; if you
ever see a different project ref in a branch, PR, or note, it's stale —
this is the one to build against. See `SUPABASE_SETUP.md` for what's
deployed to it.

✅ **Phase 0 Complete:** Full specifications, database design, UI wireframes  
✅ **Phase 1 In Progress:**
  - Supabase PostgreSQL database with Row Level Security ✅
  - Monorepo structure with npm workspaces ✅
  - Next.js admin panel with Supabase Auth ✅
  - Shared TypeScript types package ✅
  - Edge Functions: device linking (`redeem-link-code`) ✅, AI lesson
    generation (`generate-lesson`) ✅, image uploads (🚧 not started)

**What's implemented:**
- Complete Supabase schema with 13 tables + 1 view, RLS policies, triggers,
  indexes — tracked in `supabase/migrations/` (9 migrations as of
  2026-09-21, matching what's actually deployed on the canonical project;
  see `CLAUDE.md` for the running log of what each one fixed)
- Admin panel: login, signup, family dashboard (no content/assignment UI yet)
- `redeem-link-code` Edge Function: device linking. **Rewritten 2026-09-15**
  — the original version never actually returned usable session
  credentials, a dead end that blocked every device link attempt. Now uses
  standard client-side anonymous auth (`signInAnonymously()`) plus this
  function only links that session to a student
- `generate-lesson` Edge Function: calls the Claude API with the versioned
  v1 pedagogical prompt, validates and inserts a draft lesson — see
  `EDGE_FUNCTIONS.md` §4. Not yet deployed to production or wired to any
  admin panel UI.
- `apps/admin/src/pages/play/[code].tsx` (added 2026-09-15) — a temporary,
  no-login, student-facing web page for testing the full assign → answer →
  results loop before the real mobile app exists. Reuses the exact same
  backend the mobile app will use; **not** the decided mobile architecture,
  see `CLAUDE.md` before building anything on top of it
- Four more real bugs found and fixed along the way (all in `CLAUDE.md`'s
  repository-layout notes): `submit_answer()` reading a nonexistent column,
  a missing `search_path` on every helper function that silently broke
  *every* parent signup, a `SECURITY DEFINER` view that leaked every
  family's question data to any authenticated caller, and (2026-09-21) a
  `PUBLIC`-role grant that made the search_path fix's own `handle_new_user`
  lockdown incomplete
- Shared types for cross-app type safety
- Mobile app: still just a `package.json` placeholder — dependencies were
  bumped 2026-09-20 (Expo 49→57, React Native 0.72→0.87) but no app code
  exists yet to build against them

**What's next** lives on the [project board](https://github.com/louisbaudry/learning_app/issues),
not in this file — one issue per open entry in [`BACKLOG.md`](BACKLOG.md),
labelled by epic and size. This section describes the shape of the
project; the board is the only thing that tracks its progress. Broadly,
the open epics are: finishing the backend (deploy `generate-lesson`,
`upload-image`), the admin panel (students, content review, assignments,
progress), the real Expo mobile app, the `TESTING.md` priority tiers, and
the accessibility/i18n/privacy work that Phase 1.5 ends on.

## Documentation

### Specifications & Design (Phase 0)

| Document | What it covers |
|---|---|
| [`BACKLOG.md`](BACKLOG.md) | Every Phase 1/1.5 work item, by epic and size. Completed entries keep the record of what the work taught; open entries link to the GitHub issue that carries their status |
| [`SPECIFICATIONS.md`](SPECIFICATIONS.md) | Vision, user personas, feature list, system architecture, security & privacy, accessibility & i18n, tech stack, roadmap, and every resolved architecture decision |
| [`DATABASE_SCHEMA.md`](DATABASE_SCHEMA.md) | Full PostgreSQL schema (Supabase), Row Level Security policies, triggers, storage buckets |
| [`AI_CONTENT_GENERATION.md`](AI_CONTENT_GENERATION.md) | How Claude generates lessons: prompt design, structured-output contract, model/A-B strategy, mandatory parent review workflow |
| [`PRIVACY_POLICY.md`](PRIVACY_POLICY.md) | Draft parent-facing privacy policy (French) — legal basis, sub-processors, retention. Not legal advice, pending professional review |
| [`TESTING.md`](TESTING.md) | Testing strategy for when application code exists: risk-ordered priority tiers (RLS/Edge Functions first), tools per platform, CI plan |
| [`prompts/lesson-generation/v1.md`](prompts/lesson-generation/v1.md) | The versioned pedagogical system prompt used to generate lessons |
| [`design/`](design/) | UI wireframes — 5 mobile screens (student) + 4 admin-panel screens (parent), as Claude Design artboards |

### Infrastructure & Development (Phase 1)

| Document | What it covers |
|---|---|
| [`SUPABASE_SETUP.md`](SUPABASE_SETUP.md) | Database deployment: schema, RLS policies, helper functions, indexes, extensions |
| [`MONOREPO_SETUP.md`](MONOREPO_SETUP.md) | Project structure: npm workspaces, admin panel, mobile app, shared types |
| [`EDGE_FUNCTIONS.md`](EDGE_FUNCTIONS.md) | Server-side functions: device linking, image uploads, AI generation, deployment & testing |
| [`apps/admin/`](apps/admin/) | Next.js admin panel with Supabase Auth, login/signup, family dashboard |
| [`packages/shared-types/`](packages/shared-types/) | TypeScript interfaces for database models, enums, API types |
| [`supabase/migrations/`](supabase/migrations/) | The actual applied SQL for the canonical project, in order — the source of truth for what's deployed, alongside `SUPABASE_SETUP.md`'s summary |
| [`supabase/functions/`](supabase/functions/) | Edge Function source (`redeem-link-code`, `generate-lesson`) |

## Standards this project follows

Design, schema, and testing decisions are grounded in named external
standards rather than invented conventions. Each is referenced with a link
at the point it's actually used (`SPECIFICATIONS.md` §11 Decisions 10–13,
`DATABASE_SCHEMA.md`, `PRIVACY_POLICY.md`, `TESTING.md`); this table is the
index.

| Standard | Used for |
|---|---|
| [WCAG 2.2 (AA)](https://www.w3.org/TR/WCAG22/) | Contrast, non-text content (alt text), target size — applied to the `design/` wireframes and required of the eventual admin panel and mobile app UI |
| [IMS/1EdTech QTI 3.0](https://www.1edtech.org/standards/qti/index) | Shape (not full compliance) for the `questions`/`question_options` assessment item model |
| [Éduscol](https://eduscol.education.gouv.fr/) / [Socle commun](https://www.education.gouv.fr/le-socle-commun-de-connaissances-de-competences-et-de-culture-3054) | French national curriculum reference for the optional `contents.curriculum_cycle`/`curriculum_domain` tags |
| [ISO/IEC 25010](https://www.iso.org/standard/35733.html) | Software quality model used to order `TESTING.md`'s risk-based priority tiers and map them to `SPECIFICATIONS.md` §12's success criteria |
| [GDPR](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32016R0679) ([Art. 8](https://gdpr-info.eu/art-8-gdpr/), [Art. 9](https://gdpr-info.eu/art-9-gdpr/), [Art. 5](https://gdpr-info.eu/art-5-gdpr/)) | Legal basis for processing a child's data, special-category data (none stored), accountability/consent record, data export & retention |
| [CNIL](https://www.cnil.fr/) recommendations on minors | French-specific guidance behind the age-15 consent threshold referenced in Decision 12 |
| [COPPA](https://www.ftc.gov/legal-library/browse/rules/childrens-online-privacy-protection-rule-coppa) | Noted as a future consideration only if a US market is ever added (not applicable to the MVP) |

## Tech stack (decided)

- **Mobile app:** React Native + Expo (Android first, iOS later, one codebase)
- **Web admin panel:** Next.js + React + TypeScript
- **Backend:** Supabase only — PostgreSQL with Row Level Security, Supabase
  Auth, Supabase Storage, and Edge Functions for AI calls and other logic
  that can't run on the client. No standalone API server.
- **AI content generation:** Claude API, using structured outputs so every
  generated lesson matches the database schema exactly
- **Languages:** code and comments in English; app content is multilingual,
  starting with French and English

See `SPECIFICATIONS.md` §8 and §11 for the full rationale behind each choice.

## Validating AI-generated content

Before any app code is written, the riskiest assumption — that Claude can
generate good, age-appropriate French lessons for a teenage learner with
Down Syndrome — is tested directly:

```bash
cd experiments/generation-test
npm install
export ANTHROPIC_API_KEY=sk-ant-...
npm run generate
```

This produces 10 sample lessons across math, literacy, and life skills, and
writes a French-language review file to `experiments/generation-test/output/`
for grading. See that folder's own `README.md` for details, including how to
A/B test different models.

## Contributing / working in this repo

If you're an AI assistant working in this codebase, read
[`CLAUDE.md`](CLAUDE.md) first — it has architectural context and rules that
apply to every change here.
