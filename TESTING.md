# Testing Strategy

**Status:** Phase 0 — forward-looking plan, not yet implemented. No test
files exist yet because no application code exists yet (`CLAUDE.md`). This
document is what a contributor (human or AI) follows once a feature lands:
it defines what gets tested, with what tool, and at what priority — so
testing isn't invented ad hoc per pull request.

**Depends on:** `SPECIFICATIONS.md` (§8 tech stack, §11 architecture
decisions, §12 success criteria), `DATABASE_SCHEMA.md` (RLS policies).

---

## 1. Philosophy: risk-based, not exhaustive

`SPECIFICATIONS.md` §10.2 is explicit about the constraint this strategy has
to live inside: **no developer team, solo build with AI assistance.**
Exhaustive coverage everywhere is not a realistic bar for that team size —
so this plan is ordered by *what a bug actually costs*, not by what's
easiest to test. A cross-family data leak is a completely different order
of severity than a slightly-off hint string, and the test plan below spends
effort accordingly.

The [ISO/IEC 25010](https://www.iso.org/standard/35733.html) product
quality model is the framework used to make that ordering explicit rather
than a matter of taste: each priority tier below is really a bet that its
characteristic (security, reliability, performance, etc.) is the one worth
protecting first for this app.

## 2. Priority tiers

### P0 — Row Level Security policies (`DATABASE_SCHEMA.md` §5)

**Why highest priority:** RLS is not *a* security layer here, it's *the*
security layer (`SPECIFICATIONS.md` §11 Decision 2 — "No standalone backend
server," access control enforced entirely in Postgres). A broken policy
doesn't degrade the app, it leaks one family's child's data to another
family. This is the one category of bug this app cannot ship with.

**Tool:** [pgTAP](https://supabase.com/docs/guides/local-development/testing/overview),
run via the Supabase CLI, test files as `.sql` under `supabase/tests/`. Each
test case sets an identity (`set local role`, `set local
request.jwt.claim.sub`) and asserts what that identity can and can't do —
see the [pgTAP testing guide](https://supabase.com/docs/guides/local-development/testing/pgtap-extended)
for the identity-switching pattern this schema's family/device-scoped
policies need.

**What must be covered before any RLS-touching migration merges:**
- A parent in Family A cannot read/write Family B's `students`, `contents`,
  `assignments`, or `responses` (the core multi-tenancy guarantee).
- A student device can read only its own student's assignments/content,
  never another student's — including another student in the *same*
  family (siblings, once Phase 2 supports more than one child).
- A `viewer` role (Decision 8) can read but never write.
- Draft content (`contents.status = 'draft'`) is never visible to a student
  device, only to the family that owns it (Decision 4 — nothing unreviewed
  reaches the child).
- `is_correct` on `question_options` is never readable by a student device
  before answering (this is *why* `submit_answer` is a security-definer
  Edge Function and not a direct table write — `DATABASE_SCHEMA.md` §4).

Treat an RLS regression caught in review as a production incident writeup,
not a normal bug — that's the bar this tier is held to.

### P0 — Edge Functions

**Why this tier:** these are the only places sensitive logic runs
server-side (Decision 2) — the Claude API key, answer-correctness
validation, and device-link-code redemption all live here. A bug is either
a security hole (leaked key, forged answer) or a broken onboarding flow
(a parent can't link their child's phone).

**Tool:** [Deno's built-in test runner](https://docs.deno.com/runtime/fundamentals/testing/)
(Supabase Edge Functions run on Deno), plus the local Supabase stack so
tests hit a real (ephemeral) Postgres instance rather than a mock.

**What to cover, per function (`DATABASE_SCHEMA.md` §4):**
- `submit_answer` — rejects a device submitting for a student it doesn't
  own; correctly normalizes fill-in-blank text (accents/case/whitespace)
  before comparing; records every attempt but scores only attempt 1
  (`SPECIFICATIONS.md` §11 — attempts-policy standards check).
- `generate-lesson` — never returns/logs the raw Anthropic API key; always
  writes the result as `draft`, never `published`, regardless of what the
  model returns; records `ai_generations` even on failure (retry needs the
  error).
- Device-link-code redemption — a code can only be redeemed once; an
  expired/revoked code is rejected; a redeemed code correctly creates the
  anonymous auth user *and* the `student_devices` row atomically (no
  half-linked state).

### P1 — Critical user flows, end-to-end

**Why this tier, not P0:** these test the *integration* of RLS +
Edge Functions + UI, which is where bugs Tier P0's unit-level tests miss
tend to surface (an RLS policy and an Edge Function can each pass their own
tests and still disagree at the boundary). Still high-value, but a UI E2E
failure is recoverable in a way a data leak isn't.

**Admin panel (Next.js):**
[Playwright](https://playwright.dev/) for the flows a parent actually
depends on: sign up → create family → generate AI lesson → review/edit →
publish → assign to student → see progress update after the student
answers. This is the parent's entire weekly workflow (`SPECIFICATIONS.md`
§12 "Can create content in <15 minutes") in one E2E path.

**Mobile app (Expo/React Native):** the 2026 default here is
[Maestro](https://maestro.dev/) over Detox — YAML-based, black-box (drives
the built app like a real user, no native build changes required), which
matches this project's "no developer team" constraint better than Detox's
heavier native-integration setup. Cover: link-code redemption → PIN entry
→ answer a question correctly → answer incorrectly → see hint → retry →
completion screen (`Bravo.dc.html`) — the full loop `SPECIFICATIONS.md`
§11 Decision 1 (React Native + Expo) exists to deliver.

### P2 — Unit tests for pure logic

Ordinary unit tests (Vitest for the Next.js/TypeScript code,
[Jest](https://jestjs.io/) + React Native Testing Library for
React Native components) for logic that's cheap to isolate and easy to get
subtly wrong: the fill-in-blank normalization function, score aggregation
(`assignments.score_*`), due-date "overdue" calculation, and the Zod
structured-output schema in `experiments/generation-test/generate.mjs`
staying in sync with `DATABASE_SCHEMA.md` (`CLAUDE.md` already flags this
drift risk).

### P2 — AI generation regression check

`experiments/generation-test/` (see `CLAUDE.md` → Commands) already
validates generated lessons against the same rules the future Edge
Function enforces. Formalize it as a **prompt-change regression gate**:
before `prompts/lesson-generation/v2.md` (or any later version) replaces
v1, run the harness against both and diff the `review.<model>.md` output —
a prompt change that silently drops hints, adds unsupported question
types, or produces content outside the declared difficulty band should be
caught here, not by a parent noticing in production.

## 3. CI

No CI is configured in this repository yet (no `.github/workflows/`) —
expected for Phase 0, since there's no code to run it against. Once
implementation starts:

- **Every PR:** lint, typecheck, and P2 unit tests (fast, cheap, no
  external services — should gate merge, not just warn).
- **Every PR touching `supabase/migrations/` or RLS policies:** the P0
  pgTAP suite, against a local Supabase instance spun up in CI. This is
  the one tier that should be a hard merge gate even at solo-project scale
  — see the rationale in §2.
- **Nightly or pre-release, not per-PR:** P1 E2E (Playwright + Maestro) —
  real devices/browsers are slow and somewhat flaky; gating every commit
  on them doesn't fit a solo-builder's iteration speed. Run them before
  anything reaches Arthur's phone, not before every commit.
- **Continuously, outside CI:** Supabase's own advisor tooling (lint for
  RLS gaps, missing indexes, etc.) — a standing check, not a one-time
  audit, since new tables/policies land over time.

## 4. Mapping to `SPECIFICATIONS.md` §12 Success Criteria

Each platform-level success criterion already stated in the spec maps to
an [ISO/IEC 25010](https://www.iso.org/standard/35733.html) characteristic
and a concrete check, so "success" isn't just a feeling at ship time:

| §12 criterion | ISO/IEC 25010 characteristic | How it's actually checked |
|---|---|---|
| "Zero data breaches or privacy violations" | Security | P0 pgTAP suite + Supabase advisors (continuous) |
| "99% uptime" | Reliability | Supabase's own platform SLA; not this repo's test suite to own |
| "Performance is fast (<2 second load times)" | Performance efficiency | Playwright trace/timing assertions on the admin panel's key pages; Expo's own performance monitoring for the mobile app |
| "Fully accessible for disabled users" | Usability | Already underway — `SPECIFICATIONS.md` §7.1 WCAG 2.2 AA wireframe review; extend to automated `axe-core` checks in the Playwright suite once real markup exists |

---

## Next steps

This document describes *what* to test and *why it's ordered this way* —
not working test files, fixtures, or CI YAML, since there's no application
code yet for them to test. The first PR that adds real Supabase migrations
should add `supabase/tests/` (P0) alongside them, not after.
