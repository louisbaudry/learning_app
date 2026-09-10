# Learning App

An educational platform for parents to create AI-assisted learning content
for their children, assign it as homework, and track progress remotely.

**Origin:** built for a teenage son with Down Syndrome, so his father can
keep teaching him between limited visits. Designed from the start to scale
to other families — including, eventually, families in Ukraine and beyond.

## Status: Phase 1 — Backend implementation started

The design phase (architecture, database schema, AI content generation
design, UI wireframes, prompt-validation harness) is complete and reviewed.
The Supabase backend from `DATABASE_SCHEMA.md` now exists as real
infrastructure: project `learning-app` (`https://raamrmdjfmzbtaczvfbu.supabase.co`),
schema + RLS policies + triggers applied via the migrations in
`supabase/migrations/`. The Next.js admin panel and the Expo mobile app have
not been started yet.

## Backend (Supabase)

- **Project:** `learning-app`, ref `raamrmdjfmzbtaczvfbu`, region `eu-west-3`.
- **Migrations:** `supabase/migrations/*.sql`, applied in filename order.
  They implement `DATABASE_SCHEMA.md` §3-§7 (tables, indexes, RLS, the
  `submit_answer()`/`normalize_answer()`/`handle_new_user()` functions and
  triggers, storage buckets) plus a couple of hardening passes
  (`..._security_hardening.sql`, `..._rls_performance.sql`) driven by
  Supabase's own security/performance advisors — see those files' header
  comments for what each fixed and why.
- **Client config:** project URL and the `sb_publishable_...` key above are
  safe to use directly from client code (mobile app / admin panel) — they're
  publishable, not secret. The service role key is never checked into this
  repo (only `redeem-link-code`, below, uses it, and only from inside the
  Edge Function runtime where it's injected automatically).
- **Edge Functions:** `supabase/functions/`, deployed to the project above.
  - `redeem-link-code` (`verify_jwt: false` — the device has no session yet;
    the one-time code is the credential) trades a `device_link_codes` code
    for a real anonymous-auth session, per `DATABASE_SCHEMA.md` §3.5/§5.4.
  - `generate-lesson` (`verify_jwt: true`) is the `AI_CONTENT_GENERATION.md`
    integration: calls the Claude API (the only place `ANTHROPIC_API_KEY`
    lives) and writes the resulting lesson as a `draft` content row. It
    otherwise runs as the calling parent's own JWT, so ordinary RLS — not
    the function — decides what they can read/write.
  - **Required manual step:** `generate-lesson` needs the `ANTHROPIC_API_KEY`
    secret set on the project (`supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
    --project-ref raamrmdjfmzbtaczvfbu`, or via the dashboard) — this repo
    only ever holds that key as an env var locally
    (`experiments/generation-test`), never committed, and the same rule
    applies to the deployed secret.
- **Not yet implemented:** the Next.js admin panel and the Expo mobile app
  (no client code yet — see below), and the pre-launch French pedagogical
  validation from `AI_CONTENT_GENERATION.md` §9.3 (run `generate-lesson`
  against ~10 real requests and have it reviewed before Arthur sees any of
  it — the `experiments/generation-test` harness already validates the
  *prompt*; this validates the deployed function end-to-end).

## Documentation

| Document | What it covers |
|---|---|
| [`SPECIFICATIONS.md`](SPECIFICATIONS.md) | Vision, user personas, feature list, system architecture, security & privacy, accessibility & i18n, tech stack, roadmap, and every resolved architecture decision |
| [`DATABASE_SCHEMA.md`](DATABASE_SCHEMA.md) | Full PostgreSQL schema (Supabase), Row Level Security policies, triggers, storage buckets |
| [`AI_CONTENT_GENERATION.md`](AI_CONTENT_GENERATION.md) | How Claude generates lessons: prompt design, structured-output contract, model/A-B strategy, mandatory parent review workflow |
| [`PRIVACY_POLICY.md`](PRIVACY_POLICY.md) | Draft parent-facing privacy policy (French) — legal basis, sub-processors, retention. Not legal advice, pending professional review |
| [`TESTING.md`](TESTING.md) | Testing strategy for when application code exists: risk-ordered priority tiers (RLS/Edge Functions first), tools per platform, CI plan |
| [`prompts/lesson-generation/v1.md`](prompts/lesson-generation/v1.md) | The versioned pedagogical system prompt used to generate lessons |
| [`design/`](design/) | UI wireframes — 5 mobile screens (student) + 4 admin-panel screens (parent), as Claude Design artboards |

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
