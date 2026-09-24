# Runbook — verify the core loop on a real device

**Card:** `BACKLOG.md` #27 · Epic 5 · the one live obligation before the
`/play` harness can be deleted.

`apps/admin/src/pages/play/[code].tsx` was built to prove one thing:
that assign → answer → results works end-to-end against the real backend
(real schema, real RLS, real `redeem-link-code`, real `submit_answer()`)
*before* the React Native app is written. Until it is actually run on a
phone, that proof does not exist and the Expo work in Epic 5 is being
planned on an assumption.

**This cannot be done from a cloud Claude Code session.** That
environment's proxy cannot reach `/functions/v1/*` at all (Edge Functions
run on an HTTP/2-only backend it doesn't support) — the request sends and
zero response bytes ever arrive. A hang there is not evidence of a bug in
the function; about an hour was already lost to chasing `verify_jwt` and
CORS over exactly that. Run this from your own machine.

---

## Before you start

Two settings decide whether this works at all, and both fail in ways that
look like application bugs:

1. **Anonymous sign-ins must be enabled** — Supabase dashboard →
   Authentication → Sign In / Providers. The harness calls
   `signInAnonymously()` as step one. If it's off, you get an auth error
   before any of this project's own code runs.
2. **`redeem-link-code` must be deployed** with `--no-verify-jwt` (it is
   called by a session that has only just been created anonymously):
   ```bash
   supabase functions deploy redeem-link-code --no-verify-jwt
   ```

Then get a **valid, unused** link code. Don't reuse one from an old note —
they expire, and an expired code fails with a message that reads like a
linking bug:

```sql
select d.code, d.expires_at, d.used_at, s.first_name
from device_link_codes d
join students s on s.id = d.student_id
where d.used_at is null and d.expires_at > now()
order by d.expires_at desc;
```

> Don't paste a live code into this file or into a commit. It is a
> credential: anyone holding it can link a device to that student and see
> their assignments.

Check there is something to answer, or the harness will correctly show
"no assignment" and you'll have proved nothing:

```sql
select a.id, a.status, c.title, c.status as content_status,
       (select count(*) from questions q where q.content_id = c.id) as questions
from assignments a
join contents c on c.id = a.content_id
where a.status <> 'completed';
```

The content must be `published` — a draft is deliberately not assignable
(`SPECIFICATIONS.md` §11 Decision 4).

---

## Run it

```bash
npm install
npm run dev -w @learning-app/admin
```

The phone needs to reach your laptop, so `localhost` is not enough — use
the LAN address (`http://192.168.x.x:3000/play/<CODE>`) with both devices
on the same network, or a tunnel (`ngrok http 3000`, `cloudflared tunnel
--url http://localhost:3000`). A tunnel is the honest test: it goes over
real HTTPS the way the real app will.

Open `/play/<CODE>` **on the phone**, not in a desktop browser pretending
to be one. Half the point is the touch targets and the reading size for a
child, which a desktop viewport will flatter.

---

## What to check, in order

Each step has a way of failing quietly, which is what to watch for.

| # | Step | Passes when | Quiet failure to watch for |
|---|---|---|---|
| 1 | Page loads, links the device | Lesson title appears | Stuck on "linking" = `redeem-link-code` unreachable or not deployed |
| 2 | Reload the page | Same lesson, no error | A second `student_devices` row — linking must be idempotent |
| 3 | Answer one question **wrong** | Hint appears, retry allowed | Advancing anyway, or revealing the answer |
| 4 | Retry the same question correctly | Explanation appears, advances | `responses.attempt` not incrementing |
| 5 | Finish every question | Final score shows | Score counts the *retry* — it must count attempt 1 only |
| 6 | Parent view | Score matches what the child saw | — |

Step 5 is the one that matters most and the easiest to get wrong:
scoring counts **the first attempt only** (`SPECIFICATIONS.md` §11), so a
question answered wrong then right is wrong for scoring purposes, even
though the child was allowed to continue. If the final score flatters the
child, that is the bug this whole exercise exists to catch — progress data
that reports eventual success rather than real level is worse than no
progress data, because a parent will act on it.

Verify against the database rather than trusting the screen:

```sql
select r.question_id, r.attempt, r.is_correct, r.answered_at
from responses r
join assignments a on a.id = r.assignment_id
where a.id = '<ASSIGNMENT_ID>'
order by r.question_id, r.attempt;

select status, score_correct, score_total, started_at, completed_at
from assignments where id = '<ASSIGNMENT_ID>';
```

`score_correct` must equal the number of questions whose **`attempt = 1`**
row has `is_correct = true`.

---

## Also worth noticing

The harness is a proxy for the mobile app, so the things that annoy you
here will annoy Arthur there. Write them down as cards rather than fixing
them in this file — it's scheduled for deletion:

- Is the text large enough to read at arm's length?
- Are the option buttons big enough to hit without aiming?
- Does a wrong answer feel like help, or like failure?
- How long does the page take on a real phone, on real wifi?

---

## When it passes

Record it in `BACKLOG.md` #27 — the date, the device, and anything
surprising. That write-up is the whole reason the entry stays in the file
after the card closes.

Then the harness has discharged its purpose and #27's other half applies:
**delete it** once #25 ships the same loop natively. Delete, not keep as
"a handy web fallback" — that is exactly how a test harness becomes a
second client nobody decided to maintain, with its own auth path and its
own bugs, drifting from the app it was built to de-risk.
