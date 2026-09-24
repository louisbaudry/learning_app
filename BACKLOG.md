# Phase 1 / 1.5 Backlog

Derived from `SPECIFICATIONS.md` §3 (features), §9.2–9.3 (roadmap) and
`TESTING.md` §2 (priority tiers). Ordered so that the things a bug in them
would be unrecoverable — RLS, the answer path, anything reaching Arthur's
phone — are proven before the surface area that depends on them grows.

Sizes: **S** ≈ half a day, **M** ≈ 1–2 days, **L** ≈ 3–5 days.

**Every open entry below is a GitHub issue**, linked from its own heading
and labelled by epic and size. *Status, ordering and what is in flight
live there, not here* — don't record progress in this file, move the card.
(The two numberings are independent and will never line up: `#12` is a
backlog ID, `issue #20` is where its state lives. GitHub's issue counter is
shared with pull requests and was already at 8 when these were filed.)

Two heading forms, and only two. An open entry is
`**#N · Title · SIZE** · [issue #X]`. A completed one is
`**#N · ~~Title~~ · DONE — where it lives**`, with no issue link — its
state is settled, so the entry is now record and nothing tracks it. The PR
that lands an item rewrites the first form into the second, in the same
change that adds the write-up. Don't leave it half-way, carrying both a
"what it taught" section and a live issue link: that reads as open on the
board and done in the file.

What stays here is the **record**: why a decision was made, what a real
device or a real signup turned out to do, which invariant a test earned.
That is why completed entries are kept in full rather than deleted —
several of them are the only written trace of a bug that cost hours (#7's
dead-end device linking, #9's silent signup failure, #10's cross-family
data leak). A closed issue is a state change; the paragraph explaining what
it taught is not.

A note on scope: this backlog stops where `SPECIFICATIONS.md` §9.3 stops —
Phase 1.5, "private beta with Arthur, polished and audited." Phase 2 items
(iOS, co-parent invites, gamification, `es`/`uk` localisation, community
content library) are deliberately **not** filed as issues. They are real,
they are in the spec, and putting them on the board now would mean 10+
cards aging untouched for a year. They get filed when Phase 2 starts.

---

## Epic 0 — Foundations

**#1 · ~~Specifications, schema design and wireframes~~ · DONE**
Phase 0, complete 2026-08-31. `SPECIFICATIONS.md` (vision, personas,
features, architecture, §11's twelve resolved decisions),
`DATABASE_SCHEMA.md`, `AI_CONTENT_GENERATION.md`, `PRIVACY_POLICY.md`,
`TESTING.md`, and `design/` (5 mobile + 4 admin wireframes, reviewed
against [WCAG 2.2 AA](https://www.w3.org/TR/WCAG22/)). The accessibility
review was not a rubber stamp — it found three real contrast failures and
one missing-text-alternative gap that changed the *schema*, adding
`image_alt_text` to `questions` and `question_options` (§7.1). Design
review that reaches back into the data model is the argument for doing it
before implementation, not after.

**#2 · ~~Supabase schema deployed with RLS~~ · DONE**
13 tables + 1 view, RLS policies, triggers, indexes, on the canonical
project `dyjntcuovsoyhbkxnmih`. Tenancy unit is `families`, not `users`
(§11 Decision 8), so co-parent invites in Phase 2 don't need a schema
redesign.
*What it taught:* two sessions built the backend in parallel without
either knowing about the other, and a second Supabase project got created
and had to be torn down. The canonical ref is now stated in `CLAUDE.md`,
`README.md` and `SUPABASE_SETUP.md` — three places, because one wasn't
enough to stop it happening.

**#3 · ~~Monorepo scaffold~~ · DONE**
npm workspaces: `apps/admin` (Next.js + TypeScript), `apps/mobile`
(placeholder), `packages/shared-types`, `packages/supabase-client`
(reserved). Root `type-check` and `lint` fan out across workspaces with
`--if-present`. See `MONOREPO_SETUP.md`.

**#4 · ~~Backfill applied migrations into the repo~~ · DONE**
2026-09-10. The four migrations actually applied on 2026-09-06 were pulled
verbatim out of `supabase_migrations.schema_migrations` rather than
reconstructed from `DATABASE_SCHEMA.md`.
*What it taught:* the docs and the database had already drifted, and
reconstructing from docs would have baked the drift in permanently. The
rule that came out of it — a numbered `supabase/migrations/*.sql` file in
the *same change* as the `DATABASE_SCHEMA.md` update, never edited in
place once applied — is now in `CLAUDE.md`.

**#5 · ~~CI: lint and typecheck on every PR~~ · DONE — `.github/workflows/ci.yml`**
`npm ci`, `npm run type-check`, `npm run lint` on Node 22, on every branch
push and every PR into `main`. Linux only — no packaged artifact here and
no native build to matrix over. Unit tests are deliberately **not** in it:
no test framework exists in the repo yet, and a green check that runs no
tests reads as covered when it isn't. The suite and its step arrive with
#22; the pgTAP gate with #21, which needs a database rather than this
runner.

*What it taught:* the lint script was already broken and nothing had
noticed. `apps/admin` ran `next lint`, but Next 16 removed that subcommand
— so `next` parsed `lint` as a *directory argument* and failed with
`Invalid project directory provided, no such directory: apps/admin/lint`.
An error that names a path nobody wrote, for a command that no longer
exists. Worse, there was no eslint config anywhere in the repo, so even
before the Next 16 upgrade the script had nothing to enforce: it was
decorative from the day it was written. The fix commits
`apps/admin/eslint.config.mjs` (flat config —
`eslint-config-next/core-web-vitals`, which is a superset of the base
config and already carries `next/typescript`) and points the script at the
ESLint CLI directly. It passes clean on the current tree.

The general lesson is why this card came before the feature cards it
gates: a check that was never run is indistinguishable from a check that
passes, and this one had been sitting in `package.json` looking like
coverage. CI's first job is to make the difference visible.

**#6 · ~~Repo hygiene for a board-driven workflow~~ · DONE — `.github/`**
A backlog-item issue form carrying epic, size and the spec section it
implements; a PR template whose body starts with `Closes #` and whose
checklist is the rhythm's rule 2 (rewrite this file's entry as record in
the same change); and `.github/labels.md` as the source of truth for the
label set. Blank issues stay enabled — a bug found while building is not a
backlog card, and forcing it into that shape means people file nothing.

Two things the form can't do, found while building it. GitHub issue forms
apply a **static** label list per form, so the epic and size dropdowns
record those values in the issue *body* but cannot set the matching labels
— that stays a manual step, and the form ends with a checkbox saying so
rather than pretending otherwise. And label colours aren't repo content at
all: they live in GitHub's own settings, so `labels.md` carries the hex
values and applying them is a hand step in **Settings → Labels**. Both are
the same lesson — a board convention that only exists in a template is
enforced by nothing, which is why the set is written down in the repo where
a diff can catch it drifting.

## Epic 1 — Backend completion

**#7 · ~~Device linking via `redeem-link-code`~~ · DONE — `supabase/functions/redeem-link-code/`**
Rewritten 2026-09-15, see `EDGE_FUNCTIONS.md` §1.
*What it taught:* the original version was a dead end that never returned
usable session credentials — it created the anonymous user server-side and
had no way to hand the caller a session for it, so **every** device link
attempt was blocked, and the shape of the bug meant no amount of
client-side retrying could have worked. The fix inverted it: the client
calls `signInAnonymously()` normally, and this function only *links* that
existing session to a student. Server-side "create the user for them" is
the anti-pattern; Supabase Auth wants to own session issuance.

**#8 · ~~`generate-lesson` Edge Function~~ · DONE — `supabase/functions/generate-lesson/`**
Calls Claude with the versioned `prompts/lesson-generation/v1.md` prompt,
validates the structured output, inserts the draft through the
`insert_ai_lesson()` DB function so content + questions + options land in
one transaction, and logs every attempt to `ai_generations`. See
`EDGE_FUNCTIONS.md` §4 and `AI_CONTENT_GENERATION.md`. Built and committed;
**deploying it is #11**, wiring a UI to it is #14.

**#9 · ~~Fix `search_path` on all seven `public` functions~~ · DONE — migration `07`**
2026-09-15.
*What it taught:* the highest-severity bug found so far, and it was
invisible for weeks. None of the seven functions declared an explicit
`search_path`. Most call paths (PostgREST, direct RPC) supply one that
includes `public`, so nothing complained — but the `auth.users` insert
trigger that fires `handle_new_user()` does not, so its unqualified
`insert into profiles (...)` failed with `relation "profiles" does not
exist` and aborted the transaction. Net effect: **every parent signup was
broken**, and it took the first real signup attempt to surface it.
Supabase's own security advisor had been flagging all seven as "Function
Search Path Mutable" the whole time. Lesson: run the advisors, and treat a
function that only ever runs as a trigger as a different call context than
one you test by hand. The same migration also revoked `handle_new_user()`'s
unintended direct callability by `anon`/`authenticated`.

**#10 · ~~Fix `SECURITY DEFINER` on the `student_question_options` view~~ · DONE — migration `08`**
2026-09-15. A real cross-family data leak.
*What it taught:* `create view` before an explicit `security_invoker = true`
defaults to security-definer in Postgres. This view exists to hide
`is_correct` from students and has no `WHERE` clause of its own — it relies
*entirely* on the caller's RLS on `question_options`. Running as definer
bypassed exactly that, so any authenticated user querying it got every
family's question option labels, not just their own. The RLS policies were
correct and always had been; the view quietly opted out of them. Anything
in this schema that leans on caller RLS must be `security_invoker`, and
this is the case #21's pgTAP suite exists to catch automatically.

**#11 · Deploy `generate-lesson` to production and verify end-to-end · S** · [issue #12](https://github.com/louisbaudry/learning_app/issues/12)
`supabase secrets set ANTHROPIC_API_KEY`, then deploy *with* JWT
verification (it must know which family is asking). Verify one real
generation lands as `contents.status = 'draft'` with its questions and
options, and that a failed generation still writes its `ai_generations`
row.
**This cannot be verified from a cloud Claude Code session** — see the
`CLAUDE.md` note: this environment's proxy cannot reach
`/functions/v1/*` at all (HTTP/2-only backend, unsupported through the
proxy). A hang here is not a bug in the function. Run it locally.

**#12 · `upload-image` Edge Function · M** · [issue #13](https://github.com/louisbaudry/learning_app/issues/13)
Signed upload + read URLs for Supabase Storage, per `EDGE_FUNCTIONS.md`.
Needed by the `image_identification` question type. Must enforce
family-scoped paths server-side (a signed URL is a capability — the
bucket path is the access control), size/MIME limits, and must not issue
an upload URL without the `image_alt_text` that §7.1 made a schema
requirement.

**#13 · Decide the fate of the `submit-answer` Edge Function · S** · [issue #14](https://github.com/louisbaudry/learning_app/issues/14)
`CLAUDE.md` lists `supabase/functions/submit-answer/` as planned, but the
`submit_answer()` DB function it would wrap already works and is already
security-definer, so RPC-ing it directly may make the wrapper redundant.
Resolve it either way and write the answer into `EDGE_FUNCTIONS.md`: build
the wrapper, or delete the planned entry and say why RPC is sufficient. A
"planned" function that turns out to be unnecessary is worse than either —
it reads as missing work forever.

## Epic 2 — Admin panel: family & students

**#14 · Student management · M** · [issue #15](https://github.com/louisbaudry/learning_app/issues/15)
Create, edit and archive students within the signed-in family: name, birth
date, language, disability notes (the `disability_type` field carries a
[GDPR Art. 9](https://gdpr-info.eu/art-9-gdpr/) caveat noted in
`DATABASE_SCHEMA.md` — surface it in the UI, don't make it a silent text
field), accessibility preferences. MVP is one student; the UI shouldn't
assume it.

**#15 · Device link code generation and PIN UI · S** · [issue #16](https://github.com/louisbaudry/learning_app/issues/16)
The parent-facing half of #7: generate a one-time `device_link_codes`
entry, show it large enough to read across a room, show its expiry, allow
revoking a linked device, and set/reset the optional
`students.pin_hash`. See `Bibliotheque.dc.html` and the admin wireframes.

## Epic 3 — Admin panel: content

**#16 · AI generation form wired to `generate-lesson` · M** · [issue #17](https://github.com/louisbaudry/learning_app/issues/17)
The parent's entry point: topic prompt, subject, difficulty, question
count/mix, language, optional Éduscol
[`curriculum_cycle`/`curriculum_domain`](https://eduscol.education.gouv.fr/)
tags. Calls #11's deployed function, shows generation state honestly
(these take seconds, not milliseconds), and lands on #17's review screen.
`SPECIFICATIONS.md` §12's "can create content in <15 minutes" is mostly
this issue plus #17.

**#17 · Draft review, edit and publish · L** · [issue #18](https://github.com/louisbaudry/learning_app/issues/18)
The gate that §11 Decision 4 exists for: **AI content is never
auto-published.** Edit question text, options, `is_correct`, hints and
explanations; then an explicit publish that flips `contents.status` from
`draft`. Enforced by RLS/status checks, not just by this UI — the UI is
the ergonomics, not the guarantee. Include the parent's own reasons to
reject: wrong difficulty, wrong register for a teenage learner, a hint
that gives the answer away.

**#18 · Content library, manual authoring and image upload · M** · [issue #19](https://github.com/louisbaudry/learning_app/issues/19)
List/filter/search/archive published and draft content
(`Bibliotheque.dc.html`), plus hand-authoring a lesson without AI (§3.1.1
is explicit that manual entry is a first-class path, not a fallback), plus
the upload UI over #12 with its **required** alt text. The "Archivée" row
styling is already WCAG-checked in §7.1 — keep the redundant text badge,
it's what makes the dimmed contrast compliant.

## Epic 4 — Admin panel: assignments & progress

**#19 · Assign content to a student, with due dates · M** · [issue #20](https://github.com/louisbaudry/learning_app/issues/20)
Assign, unassign, reorder, set an optional due date. Due dates are
**soft** (§11) — they order the student's feed and drive the parent's
"overdue" view, and they never lock an assignment. Status is
not-started / in-progress / completed, derived from `responses`, not
hand-maintained.

**#20 · Progress dashboard · L** · [issue #21](https://github.com/louisbaudry/learning_app/issues/21)
Completion rate, average score, trend over time, per-assignment
breakdown, and weak-area identification (which questions Arthur retries
most). Scoring here must use **attempt 1 only** (§11) — `responses`
records every retry, but analytics that counted eventual success would
report a level Arthur hasn't reached, which defeats the point of the
dashboard. `SPECIFICATIONS.md` §12's "feels connected to Arthur's
learning" is this issue.

**#21 · Export progress as CSV/PDF · S** · [issue #22](https://github.com/louisbaudry/learning_app/issues/22)
§3.1.1 reporting, and doubles as the
[GDPR Art. 15/20](https://gdpr-info.eu/art-15-gdpr/) data-export path
`PRIVACY_POLICY.md` promises — so scope it as "everything we hold about
this child," not just the charts on screen.

## Epic 5 — Mobile app

**#22 · Expo scaffold · M** · [issue #23](https://github.com/louisbaudry/learning_app/issues/23)
`apps/mobile` is still a bare `package.json`; dependencies were bumped
2026-09-20 (Expo 49→57, RN 0.72→0.87) with no app code underneath them to
build against, so nothing has actually compiled on those versions yet.
Scaffold the app, wire `packages/shared-types`, get a build onto a real
Android device, and confirm the bump is sound.

**#23 · Device linking and PIN entry · M** · [issue #24](https://github.com/louisbaudry/learning_app/issues/24)
The student-facing half of #7 and #15: enter the link code, call
`signInAnonymously()`, redeem, persist the session, then optional PIN on
subsequent launches. Auto-login after first session (§3.1.2) — Arthur
should not face an auth screen twice.

**#24 · Assignment feed · M** · [issue #25](https://github.com/louisbaudry/learning_app/issues/25)
`Main.dc.html`. Pending and completed assignments, ordered by due date,
large touch targets, visual progress. The inactive bottom-nav label
contrast fix from §7.1 is already in the wireframe — carry it into the
real components rather than re-deriving the palette.

**#25 · Question player: three types, hint, retry, results · L** · [issue #26](https://github.com/louisbaudry/learning_app/issues/26)
The core loop, and the riskiest UI in the app.
`QuestionChoix.dc.html` / `QuestionImage.dc.html` / `Bravo.dc.html`:
multiple choice, fill-in-the-blank, image identification; submit through
`submit_answer` (never a direct table write — `is_correct` must not be
readable client-side before answering); on a wrong answer show the hint
and allow retry until correct; completion screen. Scoring records every
attempt and scores attempt 1 (§11).

**#26 · Student accessibility settings · M** · [issue #27](https://github.com/louisbaudry/learning_app/issues/27)
§3.1.2 and §7.1: configurable font size (16px floor, 24px+ reachable),
high-contrast mode, text-to-speech for questions — which is what
`image_alt_text` was added to the schema *for*, so the TTS path must
actually read it for image questions. No animations, keyboard/switch
navigation, and never colour as the sole indicator.

**#27 · Retire the `/play` test harness · S** · [issue #28](https://github.com/louisbaudry/learning_app/issues/28)
`apps/admin/src/pages/play/[code].tsx` is a temporary no-login web page
added 2026-09-15 to prove the assign → answer → results loop against the
real backend before investing in Expo. Once #25 ships the same loop
natively, delete it — and delete it rather than leaving it as "a handy web
fallback," which is how a test harness becomes a second client nobody
decided to maintain. Its one live obligation before then: confirm the loop
end-to-end on a real device, which needs a local run (see #11's proxy
note).

## Epic 6 — Testing

`TESTING.md` is the full argument for this ordering; these issues are just
its tiers made actionable. The first one is the only tier this app
genuinely cannot ship without.

**#28 · P0: pgTAP suite for every RLS policy · L** · [issue #29](https://github.com/louisbaudry/learning_app/issues/29)
`supabase/tests/*.sql` via the Supabase CLI. Family A cannot reach Family
B; a device reaches only its own student, including against a sibling;
`viewer` can read but never write; `draft` content never reaches a
student; `is_correct` is never readable before answering. #10 was exactly
this class of bug and was found by an advisor rather than a test — that's
the gap this closes. Add the path-filtered CI job (any PR touching
`supabase/migrations/`) in the same change, as a hard merge gate.

**#29 · P0: Edge Function tests · M** · [issue #30](https://github.com/louisbaudry/learning_app/issues/30)
Deno's test runner against a local Supabase stack, not mocks. Per
`TESTING.md` §2: `submit_answer` rejects a device submitting for a student
it doesn't own and normalizes accents/case/whitespace before comparing;
`redeem-link-code` rejects expired, already-used and forged codes;
`generate-lesson` never publishes, and logs a failed generation.

**#30 · P1: Playwright E2E for the parent's weekly workflow · M** · [issue #31](https://github.com/louisbaudry/learning_app/issues/31)
One path, end to end: sign up → create family → generate a lesson →
review/edit → publish → assign → see progress move after an answer lands.
Add `axe-core` assertions here rather than as a separate accessibility
suite — §7.1's deferred items (semantic structure, focus order) are only
checkable against real markup.

**#31 · P1: Maestro E2E for the student loop · M** · [issue #32](https://github.com/louisbaudry/learning_app/issues/32)
YAML, black-box, chosen over Detox for the no-native-build-changes
reason in `TESTING.md` §2. Link code → PIN → answer correctly → answer
incorrectly → hint → retry → completion. Nightly/pre-release, not
per-commit.

**#32 · P2: unit tests and the AI prompt regression gate · S** · [issue #33](https://github.com/louisbaudry/learning_app/issues/33)
Vitest over the cheap-to-isolate, easy-to-get-wrong logic: fill-in-blank
normalization, `assignments.score_*` aggregation, overdue calculation, and
the `experiments/generation-test/` Zod schema staying in sync with
`DATABASE_SCHEMA.md`. Plus the gate proper: before any
`prompts/lesson-generation/v2.md` replaces v1, run the harness against
both and diff the review output — a prompt change that drops hints or
drifts out of the declared difficulty band gets caught here, not by a
parent noticing in production.

## Epic 7 — Accessibility, i18n and launch

**#33 · WCAG 2.2 AA audit against real components · M** · [issue #34](https://github.com/louisbaudry/learning_app/issues/34)
§7.1 fixed what static wireframes could fix and explicitly deferred the
rest to implementation: semantic structure (the wireframes are div soup by
construction), keyboard focus order, and real
[2.5.8 target-size](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)
measurement on rendered components. Also tighten the placeholder-text
contrast §7.1 flagged but left. Audit both apps; fix what it finds.

**#34 · i18n: `fr`/`en` strings and a language switcher · M** · [issue #35](https://github.com/louisbaudry/learning_app/issues/35)
§7.2. Every string in translation files, none hardcoded; date/time
localisation; user preference from `profiles`. French is the default —
it's Arthur's language, and per `CLAUDE.md` all *content* is authored
French-first even though all code and comments stay English. Build the
plumbing so `es`/`uk` are a file each in Phase 2; the `language` columns
already accept all four.

**#35 · Privacy: policy review, retention and deletion · M** · [issue #36](https://github.com/louisbaudry/learning_app/issues/36)
`PRIVACY_POLICY.md` is a draft, explicitly pending professional review.
Get it reviewed, then implement what it promises: retention windows,
account and child-data deletion, the sub-processor list kept true (Claude
API is one), and the `terms_accepted_at` consent record actually written.
[CNIL](https://www.cnil.fr/) guidance on minors and the age-15 threshold
in §11 Decision 12 are the reference. #21 covers the export half.

**#36 · 🏁 Private beta with Arthur — Phase 1 is done when this ships · L** · [issue #37](https://github.com/louisbaudry/learning_app/issues/37)
Not a coding task and deliberately on the board anyway, as the marker that
says what all of the above was for. `SPECIFICATIONS.md` §9.2: the app on
Arthur's phone, the parent creating real lessons weekly, for the eight
weeks §12 measures engagement over. The success criteria are already
written and are not all technical — "shows understanding of feedback" and
"feels connected to Arthur's learning despite limited time" are the two
that decide whether this worked. Close this issue with what actually
happened, including what Arthur found confusing; that write-up is the most
valuable entry this file will ever hold.
