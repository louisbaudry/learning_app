# Runbook — deploy `generate-lesson` and verify it

**Card:** `BACKLOG.md` #11 · Epic 1 · everything in Epic 3 is blocked
behind this.

`supabase/functions/generate-lesson/` is written, committed, and has
never run in production. `ai_generations` has zero rows, which is the
cleanest possible evidence that no generation has ever been attempted
against the real project.

**This cannot be done from a cloud Claude Code session** — that proxy
cannot reach `/functions/v1/*` at all, so the request hangs with no
response bytes and the hang says nothing about the function. Run it from
your own machine.

---

## 1. Set the API key as a secret

The function holds the only copy of the Anthropic key; it must never
reach the client.

```bash
supabase link --project-ref dyjntcuovsoyhbkxnmih   # if not already linked
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
supabase secrets list                               # confirm it is there
```

## 2. Deploy **with** JWT verification

```bash
supabase functions deploy generate-lesson
```

No `--no-verify-jwt` here, and this is not a detail. The function derives
which family is asking from the caller's JWT and does all its database
work under that caller's own RLS — it deliberately does not use the
service role key. Deploy it unverified and any anonymous caller can spend
your Anthropic budget and write into a family that isn't theirs.

(`redeem-link-code` is the opposite case and *does* want
`--no-verify-jwt`: it is called by a session that has only just been
created anonymously. Don't copy the flag between them.)

## 3. Get a parent JWT

```bash
export SUPABASE_URL=https://dyjntcuovsoyhbkxnmih.supabase.co
export ANON_KEY=<NEXT_PUBLIC_SUPABASE_ANON_KEY from apps/admin/.env.local>

export JWT=$(curl -s -X POST "$SUPABASE_URL/auth/v1/token?grant_type=password" \
  -H "apikey: $ANON_KEY" -H "Content-Type: application/json" \
  -d '{"email":"<parent email>","password":"<password>"}' | jq -r .access_token)

echo "${JWT:0:24}..."   # sanity check it isn't "null"
```

`null` here means the login failed, not that the function is broken.

## 4. Generate one lesson

```bash
curl -sS -X POST "$SUPABASE_URL/functions/v1/generate-lesson" \
  -H "Authorization: Bearer $JWT" \
  -H "apikey: $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
        "topic": "Les tables de multiplication par 2",
        "language": "fr",
        "difficulty": 1,
        "question_count": 3,
        "question_types": ["multiple_choice"]
      }' | jq
```

Expect `success: true` with a `content_id`, an `ai_generation_id`, a
title and a question count. Allow 20–60s — it is a real model call, and
the function retries once on a refusal or a validation failure
(`MAX_GENERATION_ATTEMPTS = 2`).

---

## 5. Verify — the three things the card actually asks for

### a. The draft landed, whole, in one transaction

```sql
select c.id, c.title, c.status, c.language, c.is_ai_generated, c.ai_model,
       (select count(*) from questions q where q.content_id = c.id) as questions,
       (select count(*) from question_options o
          join questions q2 on q2.id = o.question_id
         where q2.content_id = c.id) as options
from contents c
where c.is_ai_generated = true
order by c.created_at desc
limit 5;
```

`status` must be **`draft`**. AI content is never auto-published
(`SPECIFICATIONS.md` §11 Decision 4) — a parent reviews and publishes it
deliberately. If a generated row ever appears as `published`, stop and
treat that as a defect in `insert_ai_lesson()`, not a UI preference.

A content row with zero questions means the single-transaction guarantee
failed — that is the whole reason generation goes through
`insert_ai_lesson()` rather than three separate inserts.

### b. A **failed** generation still logs

This is the check most likely to be skipped, and the log is the only way
you will ever see cost or failure rate. Force a failure — an empty topic,
an absurd `question_count`, or a deliberately wrong model id:

```bash
curl -sS -X POST "$SUPABASE_URL/functions/v1/generate-lesson" \
  -H "Authorization: Bearer $JWT" -H "apikey: $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"topic":"","language":"fr","model":"claude-does-not-exist"}' | jq
```

```sql
select id, status, model, prompt_version, error_message,
       input_tokens, output_tokens, created_at
from ai_generations
order by created_at desc
limit 10;
```

Both the success and the failure must appear. A failure that writes
nothing is a silent hole in the cost record.

### c. Family A cannot generate into Family B

The request takes an optional `student_id`. Pass another family's student
while authenticated as this family's parent — RLS and `insert_ai_lesson()`
should refuse it:

```bash
curl -sS -X POST "$SUPABASE_URL/functions/v1/generate-lesson" \
  -H "Authorization: Bearer $JWT" -H "apikey: $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"topic":"Test d'\''isolation","student_id":"<OTHER FAMILY student id>"}' | jq
```

It must fail, and no `contents` row may appear for the other family.

> **This test cannot run as things stand.** The project currently has
> exactly one family and one student, so there is no Family B to try
> against. You need a second parent signup with its own student first —
> otherwise this check silently passes by having nothing to violate,
> which is the worst outcome of the three. The cross-family case is also
> what `BACKLOG.md` #21's pgTAP suite is meant to cover permanently;
> this curl is the one-off version.

---

## If it hangs

From your own machine a hang is real and worth investigating — check
`supabase functions logs generate-lesson`. From a cloud Claude Code
session a hang means nothing at all; see `CLAUDE.md`.

## When it passes

Rewrite `BACKLOG.md` #11 as record with the date, what one generation
actually cost in tokens, and whether the output was usable without
editing. That last point is the input to whether the v1 prompt needs a
v2 — and prompt version files are never edited in place.
