# Learning App

An educational platform for parents to create AI-assisted learning content
for their children, assign it as homework, and track progress remotely.

**Origin:** built for a teenage son with Down Syndrome, so his father can
keep teaching him between limited visits. Designed from the start to scale
to other families — including, eventually, families in Ukraine and beyond.

## Status: Phase 0 — Specifications & Design

No application code exists yet. This repository currently holds the
complete, decided design: architecture, database schema, AI content
generation design, UI wireframes, and a working prompt-validation harness.
Development begins once the AI-generated content quality is validated (see
below) and the specs are reviewed.

## Documentation

| Document | What it covers |
|---|---|
| [`SPECIFICATIONS.md`](SPECIFICATIONS.md) | Vision, user personas, feature list, system architecture, security & privacy, accessibility & i18n, tech stack, roadmap, and every resolved architecture decision |
| [`DATABASE_SCHEMA.md`](DATABASE_SCHEMA.md) | Full PostgreSQL schema (Supabase), Row Level Security policies, triggers, storage buckets |
| [`AI_CONTENT_GENERATION.md`](AI_CONTENT_GENERATION.md) | How Claude generates lessons: prompt design, structured-output contract, model/A-B strategy, mandatory parent review workflow |
| [`prompts/lesson-generation/v1.md`](prompts/lesson-generation/v1.md) | The versioned pedagogical system prompt used to generate lessons |
| [`design/`](design/) | UI wireframes — 5 mobile screens (student) + 4 admin-panel screens (parent), as Claude Design artboards |

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
