# AI Lesson Generation — Test Harness

Validates the v1 pedagogical prompt (`prompts/lesson-generation/v1.md`)
with real generations **before any app code is written**. This is the
pre-launch action item from AI_CONTENT_GENERATION.md §9.3.

## What it does

Generates 10 French test lessons covering math, literacy, life skills and
one football-themed lesson (personalization test), across difficulties 1–3.
Output goes to `output/`:

- one JSON file per lesson (raw data + validation warnings + token usage)
- one `review.<model>.md` — everything in readable French for you to grade

## How to run (on your machine)

```bash
cd experiments/generation-test
npm install
export ANTHROPIC_API_KEY=sk-ant-...   # your key from console.anthropic.com
npm run generate
```

Options:

```bash
node generate.mjs --model claude-sonnet-5   # A/B: same batch, cheaper model
node generate.mjs --model claude-haiku-4-5  # A/B: fastest/cheapest
node generate.mjs --only 3                  # regenerate a single test case
```

Cost: roughly $0.50–1.50 for the full 10-lesson batch on the default model
(`claude-opus-5`), less on the others.

## How to review

Open `output/review.claude-opus-5.md` and grade each lesson 1–5 on:

1. **Niveau** — is it right for Arthur today?
2. **Clarté** — would he understand every sentence?
3. **Ton** — encouraging and teenage-appropriate, never childish?
4. **Indices** — do hints scaffold the method without giving the answer?

Note anything off (a negation, an ambiguous option, forced football
references…). Your notes drive the v2 prompt; run again until you'd happily
publish 8+/10 lessons with only light edits. Then we freeze the prompt for
MVP development.

`output/` is git-ignored — paste your annotated review (or the worst
offenders) back into the Claude session instead of committing generated data.

## Note on refusals

In rare cases the API may decline a request (`REFUSAL` in the console).
Just re-run that case with `--only N`. The production Edge Function will
handle this automatically with server-side fallbacks (AI_CONTENT_GENERATION.md §8).
