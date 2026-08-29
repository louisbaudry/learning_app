# AI Content Generation Design
## Educational Learning App — Claude API Integration

**Status:** Draft for review  
**Last Updated:** 2026-08-21  
**Depends on:** SPECIFICATIONS.md (Decisions 3, 4), DATABASE_SCHEMA.md (contents/questions/question_options, ai_generations)

---

## 1. Goal

The parent types a simple request in the admin panel — *"Une leçon sur la monnaie : reconnaître les pièces en euros"* — plus a few parameters, and receives a complete draft lesson (questions, choices, hints, explanations) in French, structured exactly as our database expects. The parent reviews, edits, and publishes (mandatory review — Decision 4).

**What makes this hard (and what this design solves):**
1. The output must be **valid, parseable JSON** every time → solved with the API's *structured outputs* feature (schema-enforced, no parsing failures).
2. The content must fit **a teenage learner with Down Syndrome** → solved with a carefully designed pedagogical system prompt (Section 4).
3. We want **A/B testing across models** → solved by parameterizing the model and logging every generation (`ai_generations` table).

---

## 2. Architecture

```
Admin Panel (Next.js)                Supabase Edge Function              Claude API
─────────────────────                ──────────────────────              ──────────
 Parent fills form        ──POST──►   generate-lesson
 (topic, type mix,                    1. verify JWT + family role
  difficulty, # questions)            2. insert ai_generations (pending)
                                      3. build prompt                ──► messages.parse()
                                      4. validate response           ◄── structured JSON
                                      5. insert contents (draft)
                                         + questions + options
                                      6. update ai_generations
 Review/edit screen       ◄─return──  content_id of the draft
 Parent edits → publishes
```

- The **Claude API key lives only in the Edge Function** (Supabase secret). It never reaches the browser or the mobile app.
- Every generation writes an `ai_generations` row: prompt, model, raw response, outcome. This is our A/B testing dataset and debugging trail.
- Generation is synchronous from the parent's point of view (~10–30 s with a progress indicator). If it fails, the row records the error and the UI offers retry.
- **Privacy (added 2026-08-29 — `SPECIFICATIONS.md` §11 Decision 12):** the prompt sent to the Claude API can include `learner_notes`/`topic`/`extra_instructions` about a child, so Anthropic is a disclosed sub-processor (must appear in the privacy policy). Use the API's zero/no-training-retention option if/when available for this account, and never send `disability_type`-like data — there is none in the schema to send, and the admin panel's `learner_notes` field should carry inline copy telling the parent it's for interests/learning style, not diagnosis or medical information.

---

## 3. Request Parameters (the form the parent fills)

| Field | Type | Default | Notes |
|---|---|---|---|
| `topic` | free text | — | e.g. "reconnaître les pièces en euros" |
| `subject` | string | `general` | math, literacy, life_skills… (feeds `contents.subject`) |
| `language` | enum | student's language (`fr`) | content language |
| `difficulty` | 1–3 | 2 | maps to `contents.difficulty` |
| `curriculum_cycle` | enum, optional | — | French Éduscol cycle (`cycle_1`–`cycle_4`); maps to `contents.curriculum_cycle`. Gives the model a concrete national-reference complexity/vocabulary target — see `SPECIFICATIONS.md` §11 Decision 10 for why this stays parent-chosen rather than derived from the student's age |
| `curriculum_domain` | free text, optional | — | e.g. "Nombres et calculs"; maps to `contents.curriculum_domain` |
| `question_count` | 3–10 | 5 | short sessions beat long ones for attention span |
| `question_types` | multi-select | MC + fill-in-blank | image_identification only when the parent will attach images (MVP has no AI images — Decision 3) |
| `learner_context` | free text, optional | stored per student | e.g. "Il adore le football et les animaux. Il lit des phrases courtes." Injected into the prompt to personalize examples |
| `extra_instructions` | free text, optional | — | e.g. "utilise seulement les pièces de 1€ et 2€" |

`learner_context` is the quiet superpower: a lesson about counting that uses **footballs and dogs** lands much better with Arthur than an abstract one. It's stored on the student profile (a new optional `learner_notes` text column on `students` — schema addendum below) so the parent writes it once, not per lesson.

**Schema addendum:** add `learner_notes text` to `students` (personalization context for AI generation, editable by parents). *No diagnosis data — this is interests and learning style, written freely by the parent.*

---

## 4. The System Prompt (pedagogical core)

This is the most important asset of the whole feature. Draft v1 (French generation; the prompt itself is in English for maintainability, output language is a parameter):

```
You are an expert special-education content creator, designing exercises for
a teenage learner with Down Syndrome. Follow these rules strictly:

LANGUAGE & TONE
- Write all learner-facing text in {language} ({language_name}).
- Short sentences. One idea per sentence. Concrete words, no idioms or irony.
- Warm, encouraging, respectful tone. The learner is a teenager, not a small
  child: never infantilize (no baby talk), but keep vocabulary simple.

QUESTION DESIGN
- One skill per question. No trick questions, no negations
  ("Which is NOT...") — they confuse rather than teach.
- Multiple choice: exactly 3 options, one clearly correct; wrong options
  plausible but unambiguously wrong; similar length (length must not give
  away the answer).
- Fill-in-the-blank: the blank is ONE word or ONE number; the sentence gives
  enough context; list every acceptable spelling as accepted answers
  (e.g. "sept" and "7").
- Order questions from easiest to hardest (early success builds confidence).

SUPPORT TEXT
- hint: a real scaffold toward the method, not the answer itself.
  ("Compte sur tes doigts" — not "C'est 7".)
- explanation: 1–2 short sentences, positive framing, shown after answering.
  Never start with "Non" — always affirm the correct fact.

PERSONALIZATION
- Learner context: {learner_context}
- When natural, use the learner's interests in examples. Never force it.

DIFFICULTY {difficulty}/3
- 1: single-step recall/recognition. 2: one simple operation or association.
- 3: two steps or less-familiar vocabulary. Stay within the topic.

CURRICULUM REFERENCE (optional, only included when the parent set one)
- French Éduscol cycle: {curriculum_cycle} — use this only as a loose
  vocabulary/complexity reference, not a hard constraint: the learner's
  actual level (see PERSONALIZATION) always takes priority over what is
  typical for that cycle.
```

The **user message** is then simply:

```
Create a lesson: {topic}
Subject: {subject} | Questions: {question_count} | Types: {question_types}
Curriculum: {curriculum_cycle} / {curriculum_domain}
Extra instructions from the parent: {extra_instructions}
```

**Iteration plan:** this prompt is versioned in the repo (`prompts/lesson-generation/v1.ts` when we build). Every `ai_generations` row records which prompt version produced it, so we can measure prompt improvements the same way we A/B test models.

---

## 5. Output Contract (structured outputs — no JSON parsing failures)

We use the API's structured outputs (`output_config.format`), which **guarantees** the response matches our schema — the API validates it server-side; no regex, no "please answer only in JSON" fragility.

Zod schema (TypeScript, used by the Edge Function):

```typescript
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";

const GeneratedOption = z.object({
  label: z.string(),                  // choice text OR accepted answer
  is_correct: z.boolean(),
});

const GeneratedQuestion = z.object({
  type: z.enum(["multiple_choice", "fill_in_blank"]), // image_identification: parent attaches images after generation
  prompt: z.string(),                 // the question, learner-facing
  options: z.array(GeneratedOption).min(2).max(4),
  hint: z.string(),
  explanation: z.string(),
});

const GeneratedLesson = z.object({
  title: z.string(),                  // short, learner-facing
  description: z.string(),            // one sentence for the parent
  questions: z.array(GeneratedQuestion).min(3).max(10),
});
```

Edge Function call (per current SDK):

```typescript
const response = await client.messages.parse({
  model: requestedModel,              // default "claude-opus-5"; A/B testable
  max_tokens: 16000,
  system: buildSystemPrompt(params),  // Section 4, versioned
  messages: [{ role: "user", content: buildUserMessage(params) }],
  output_config: { format: zodOutputFormat(GeneratedLesson) },
});
const lesson = response.parsed_output; // typed, validated — or null on failure
```

After parsing, the Edge Function performs **semantic validation** the schema can't express, and repairs or rejects:
- exactly one `is_correct: true` per multiple-choice question (fill-in-blank: all true);
- no duplicate options; no empty strings;
- question count matches the request (tolerate ±1, else regenerate).

Then it inserts `contents` (status `draft`, `is_ai_generated = true`, `ai_prompt`, `ai_model` recorded) + `questions` + `question_options` in one transaction, and returns the `content_id`.

---

## 6. Model Strategy & A/B Testing

| Role | Model | Why |
|---|---|---|
| **Default (MVP)** | `claude-opus-5` | Best pedagogical judgment and French quality; a lesson is generated a few times per week — quality matters far more than the ~cent-level cost difference |
| **A/B candidates** | `claude-sonnet-5`, `claude-haiku-4-5` | Compare quality/cost during the testing phase |

**Cost reality check (default model):** a lesson generation is roughly ~1.2K input tokens and ~1.5–2.5K output tokens → well under **$0.15 per lesson** at Opus 5 rates ($5/M input, $25/M output). Even generating daily, this is a few dollars a month. Cost is not a deciding factor at family scale; quality is.

**A/B method (testing phase, you + Arthur):**
1. Same request generated with 2–3 models (the UI offers "generate variants").
2. You blind-review drafts side by side in the admin panel and pick/edit the best.
3. `ai_generations` records model + which draft was published → after a few weeks the data says which model earns the default slot.

This same mechanism later covers your ChatGPT comparison for **image generation** (Phase 2): `ai_generations.model` is a free string, not an enum, precisely so other providers can be logged.

**Fallbacks:** Opus 5 requests will include the server-side fallback setting (`fallbacks: "default"`) so a rare safety-classifier refusal automatically retries on a fallback model instead of failing the parent's request.

---

## 7. Review Workflow (Decision 4, concretely)

1. Generation returns a **draft** — it appears in the content library with an "AI draft" badge.
2. The review screen shows every question in editable form: fix wording, swap an option, adjust a hint, delete a weak question, reorder.
3. For `image_identification` lessons the parent attaches images at this stage (upload or stock search).
4. **Publish** button → status `published`, now assignable. A draft can never be assigned; this is enforced by the database (RLS + status check), not just the UI.
5. Published AI content keeps its provenance (`is_ai_generated`, `ai_prompt`, `ai_model`) forever — useful for the A/B data and for "regenerate a similar lesson".

---

## 8. Failure Handling

| Failure | Behavior |
|---|---|
| API error / timeout | `ai_generations.status = 'failed'` + error stored; UI shows a friendly retry. SDK retries transient errors (429/5xx) automatically. |
| `parsed_output` null (schema mismatch) | One automatic regeneration attempt; then fail gracefully. Expected to be rare with structured outputs. |
| Semantic validation fails | Same: one auto-retry, then fail with the raw draft available to the parent ("salvage manually"). |
| Refusal (`stop_reason: "refusal"`) | Handled by server-side fallbacks (Section 6); if the fallback also refuses, fail with a clear message. |

Nothing ever auto-publishes, so a bad generation can never reach Arthur — the worst case is a wasted 30 seconds for the parent.

---

## 9. Resolved Review Points (2026-08-21)

1. **Learner context — DECIDED:** `learner_notes text` column added to `students` (see DATABASE_SCHEMA.md §3.4). Interests and learning style only, written freely by the parent; no diagnosis or medical data.
2. **Variant generation — DECIDED:** single generation in MVP. The `ai_generations` logging is in place from day one; a "generate variants" button is added when the A/B testing phase starts.
3. **French pedagogical validation (action item, pre-launch):** before Arthur ever sees AI content, validate the system prompt with ~10 real generations reviewed by the parent (and ideally someone who knows his current school level).
