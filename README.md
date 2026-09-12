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
  indexes — and, as of 2026-09-10, tracked in `supabase/migrations/`
  (6 migrations, matching what's actually deployed on the canonical project)
- Admin panel: login, signup, family dashboard (no content/assignment UI yet)
- `redeem-link-code` Edge Function: device linking (validate one-time code,
  create anonymous auth user)
- `generate-lesson` Edge Function: calls the Claude API with the versioned
  v1 pedagogical prompt, validates and inserts a draft lesson — see
  `EDGE_FUNCTIONS.md` §4. Not yet deployed to production or wired to any
  admin panel UI.
- Shared types for cross-app type safety
- Mobile app: only a `package.json` placeholder — not actually scaffolded yet

**Next up:**
- Deploy `generate-lesson` to production; build the admin panel form that calls it
- `upload-image` Edge Function (signed URLs)
- Admin panel features (create students, content editor/review, assign lessons)
- Scaffold and build the mobile app (React Native + Expo)

## Documentation

### Specifications & Design (Phase 0)

| Document | What it covers |
|---|---|
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
