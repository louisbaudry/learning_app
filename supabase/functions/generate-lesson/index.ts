// generate-lesson — AI_CONTENT_GENERATION.md §2-§8.
//
// The only place the Claude API key is allowed to live (Decision: no
// standalone backend, but AI calls can't run on the client). Everything
// else this function does with the database — reading the caller's family,
// inserting contents/questions/question_options/ai_generations — runs
// through a client scoped to the caller's own JWT, so ordinary RLS (not
// this function) is what actually enforces "only owner/co_parent can
// create content". verify_jwt is ON: only a signed-in parent may call this.
//
// System-prompt template mirrors prompts/lesson-generation/v1.md and the
// GeneratedLesson contract in experiments/generation-test/generate.mjs —
// keep those three in sync if the prompt changes (CLAUDE.md repo-layout
// note on prompts/lesson-generation/).

import { createClient } from "jsr:@supabase/supabase-js@2";
import Anthropic from "npm:@anthropic-ai/sdk@^0.122.0";
import { zodOutputFormat } from "npm:@anthropic-ai/sdk@^0.122.0/helpers/zod";
import { z } from "npm:zod@^4";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
const PROMPT_VERSION = "v1";
const DEFAULT_MODEL = "claude-opus-5";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

// ---------------------------------------------------------------------------
// Output contract — AI_CONTENT_GENERATION.md §5. image_identification is
// deliberately excluded: MVP has no AI-generated images (Decision 3), so
// those questions are always authored by hand with real uploaded photos.

const GeneratedOption = z.object({
  label: z.string(),
  is_correct: z.boolean(),
});

const GeneratedQuestion = z.object({
  type: z.enum(["multiple_choice", "fill_in_blank"]),
  prompt: z.string(),
  options: z.array(GeneratedOption).min(2).max(4),
  hint: z.string(),
  explanation: z.string(),
});

const GeneratedLesson = z.object({
  title: z.string(),
  description: z.string(),
  questions: z.array(GeneratedQuestion).min(3).max(10),
});

// ---------------------------------------------------------------------------
// Request contract — AI_CONTENT_GENERATION.md §3.

const LANGUAGE_NAMES: Record<string, string> = { en: "English", fr: "French", es: "Spanish", uk: "Ukrainian" };
const CURRICULUM_CYCLES = ["cycle_1", "cycle_2", "cycle_3", "cycle_4"] as const;

const RequestSchema = z.object({
  topic: z.string().min(1),
  subject: z.string().default("general"),
  language: z.enum(["en", "fr", "es", "uk"]).default("fr"),
  difficulty: z.number().int().min(1).max(3).default(2),
  curriculum_cycle: z.enum(CURRICULUM_CYCLES).nullish(),
  curriculum_domain: z.string().nullish(),
  question_count: z.number().int().min(3).max(10).default(5),
  question_types: z.array(z.enum(["multiple_choice", "fill_in_blank"])).min(1).default(["multiple_choice", "fill_in_blank"]),
  student_id: z.string().uuid().nullish(),
  learner_context: z.string().nullish(),
  extra_instructions: z.string().nullish(),
  model: z.string().default(DEFAULT_MODEL),
});

// ---------------------------------------------------------------------------
// Prompt building — prompts/lesson-generation/v1.md, plus the curriculum
// reference clause added by SPECIFICATIONS.md §11 Decision 10.

function buildSystemPrompt(params: {
  languageName: string;
  learnerContext: string;
  difficulty: number;
  curriculumCycle?: string | null;
}) {
  const curriculumBlock = params.curriculumCycle
    ? `\n\nCURRICULUM REFERENCE (optional, only included when the parent set one)\n` +
      `- French Éduscol cycle: ${params.curriculumCycle} — use this only as a loose\n` +
      `  vocabulary/complexity reference, not a hard constraint: the learner's\n` +
      `  actual level (see PERSONALIZATION) always takes priority over what is\n` +
      `  typical for that cycle.`
    : "";

  return `You are an expert special-education content creator, designing exercises for
a teenage learner with Down Syndrome. Follow these rules strictly:

LANGUAGE & TONE
- Write all learner-facing text in ${params.languageName}.
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
- explanation: 1-2 short sentences, positive framing, shown after answering.
  Never start with a negation — always affirm the correct fact.

PERSONALIZATION
- Learner context: ${params.learnerContext || "none provided"}
- When natural, use the learner's interests in examples. Never force it.

DIFFICULTY ${params.difficulty}/3
- 1: single-step recall or recognition.
- 2: one simple operation or association.
- 3: two steps or less-familiar vocabulary. Stay within the topic.${curriculumBlock}`;
}

function buildUserMessage(req: z.infer<typeof RequestSchema>) {
  return `Create a lesson: ${req.topic}
Subject: ${req.subject} | Questions: ${req.question_count} | Types: ${req.question_types.join(", ")}
Curriculum: ${req.curriculum_cycle ?? "none"} / ${req.curriculum_domain ?? "none"}
Extra instructions from the parent: ${req.extra_instructions || "none"}`;
}

// ---------------------------------------------------------------------------
// Semantic validation — AI_CONTENT_GENERATION.md §5, ported from
// experiments/generation-test/generate.mjs's validateLesson().

function validateLesson(lesson: z.infer<typeof GeneratedLesson>, requestedCount: number) {
  const problems: string[] = [];
  for (const [i, q] of lesson.questions.entries()) {
    const correct = q.options.filter((o) => o.is_correct).length;
    if (q.type === "multiple_choice" && correct !== 1) {
      problems.push(`Q${i + 1}: multiple_choice must have exactly 1 correct option (has ${correct})`);
    }
    if (q.type === "fill_in_blank" && correct !== q.options.length) {
      problems.push(`Q${i + 1}: fill_in_blank options must all be accepted answers`);
    }
    const labels = q.options.map((o) => o.label.trim().toLowerCase());
    if (new Set(labels).size !== labels.length) problems.push(`Q${i + 1}: duplicate options`);
    if (q.options.some((o) => !o.label.trim())) problems.push(`Q${i + 1}: empty option label`);
  }
  if (Math.abs(lesson.questions.length - requestedCount) > 1) {
    problems.push(`question count ${lesson.questions.length} too far from requested ${requestedCount}`);
  }
  return problems;
}

// ---------------------------------------------------------------------------

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);
  if (!ANTHROPIC_API_KEY) {
    return json({ error: "ANTHROPIC_API_KEY is not configured for this project" }, 500);
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "missing Authorization header" }, 401);

  // Scoped to the caller's own JWT: ordinary RLS decides what they can read
  // and write, exactly as if they'd called the DB straight from the admin
  // panel. This function's only privileged capability is the Claude API key.
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) return json({ error: "not authenticated" }, 401);

  let parsedRequest: z.infer<typeof RequestSchema>;
  try {
    parsedRequest = RequestSchema.parse(await req.json());
  } catch (err) {
    return json({ error: "invalid request", details: `${err}` }, 400);
  }

  const { data: familyIds, error: familyError } = await supabase.rpc("my_family_ids");
  if (familyError || !familyIds || familyIds.length === 0) {
    return json({ error: "no family membership found for this user" }, 403);
  }
  const familyId = familyIds[0] as string; // MVP: one family per parent (DATABASE_SCHEMA.md §3.3)

  let learnerContext = parsedRequest.learner_context ?? "";
  if (!learnerContext && parsedRequest.student_id) {
    const { data: student } = await supabase
      .from("students")
      .select("learner_notes")
      .eq("id", parsedRequest.student_id)
      .maybeSingle();
    learnerContext = student?.learner_notes ?? "";
  }

  const systemPrompt = buildSystemPrompt({
    languageName: LANGUAGE_NAMES[parsedRequest.language] ?? parsedRequest.language,
    learnerContext,
    difficulty: parsedRequest.difficulty,
    curriculumCycle: parsedRequest.curriculum_cycle,
  });
  const userMessage = buildUserMessage(parsedRequest);

  const { data: generationRow, error: generationInsertError } = await supabase
    .from("ai_generations")
    .insert({
      family_id: familyId,
      requested_by: userData.user.id,
      prompt: `${systemPrompt}\n\n---\n\n${userMessage}`,
      model: parsedRequest.model,
      status: "pending",
    })
    .select("id")
    .single();

  if (generationInsertError || !generationRow) {
    console.error("ai_generations insert failed", generationInsertError);
    return json({ error: "could not record generation request" }, 500);
  }

  const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

  async function attemptGeneration() {
    const response = await anthropic.messages.parse({
      model: parsedRequest.model,
      max_tokens: 16000,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
      output_config: { format: zodOutputFormat(GeneratedLesson, "lesson") },
    });
    return response;
  }

  // AI_CONTENT_GENERATION.md §8: one automatic retry on a null parsed_output
  // or failed semantic validation; refusals are left to the SDK's
  // server-side fallback setting rather than retried here.
  let lesson: z.infer<typeof GeneratedLesson> | null = null;
  let problems: string[] = [];
  let lastError: string | null = null;
  let lastResponse: unknown = null;

  for (let attempt = 0; attempt < 2 && !lesson; attempt++) {
    try {
      const response = await attemptGeneration();
      lastResponse = response;

      if (response.stop_reason === "refusal") {
        lastError = "model refused to generate this lesson";
        continue;
      }
      if (!response.parsed_output) {
        lastError = "schema mismatch: parsed_output was null";
        continue;
      }

      const candidateProblems = validateLesson(response.parsed_output, parsedRequest.question_count);
      if (candidateProblems.length > 0) {
        problems = candidateProblems;
        lastError = `semantic validation failed: ${candidateProblems.join("; ")}`;
        continue;
      }

      lesson = response.parsed_output;
      problems = [];
      lastError = null;
    } catch (err) {
      lastError = `${err}`;
    }
  }

  if (!lesson) {
    await supabase
      .from("ai_generations")
      .update({ status: "failed", error: lastError, raw_response: lastResponse as never })
      .eq("id", generationRow.id);
    return json({ error: lastError ?? "generation failed", problems }, 502);
  }

  const { data: content, error: contentError } = await supabase
    .from("contents")
    .insert({
      family_id: familyId,
      title: lesson.title,
      description: lesson.description,
      subject: parsedRequest.subject,
      difficulty: parsedRequest.difficulty,
      curriculum_cycle: parsedRequest.curriculum_cycle ?? null,
      curriculum_domain: parsedRequest.curriculum_domain ?? null,
      language: parsedRequest.language,
      status: "draft", // never auto-published — SPECIFICATIONS.md Decision 4
      is_ai_generated: true,
      ai_prompt: systemPrompt,
      ai_model: parsedRequest.model,
      created_by: userData.user.id,
    })
    .select("id")
    .single();

  if (contentError || !content) {
    console.error("contents insert failed", contentError);
    await supabase
      .from("ai_generations")
      .update({ status: "failed", error: `contents insert failed: ${contentError?.message}` })
      .eq("id", generationRow.id);
    return json({ error: "could not save the generated lesson" }, 500);
  }

  for (const [position, q] of lesson.questions.entries()) {
    const { data: question, error: questionError } = await supabase
      .from("questions")
      .insert({
        content_id: content.id,
        type: q.type,
        position,
        prompt: q.prompt,
        hint: q.hint,
        explanation: q.explanation,
      })
      .select("id")
      .single();

    if (questionError || !question) {
      console.error("questions insert failed", questionError);
      await supabase.from("ai_generations").update({
        status: "failed",
        error: `questions insert failed: ${questionError?.message}`,
        content_id: content.id,
      }).eq("id", generationRow.id);
      return json({ error: "could not save all questions", content_id: content.id }, 500);
    }

    const optionRows = q.options.map((o, optionPosition) => ({
      question_id: question.id,
      position: optionPosition,
      label: o.label,
      is_correct: o.is_correct,
    }));
    const { error: optionsError } = await supabase.from("question_options").insert(optionRows);
    if (optionsError) {
      console.error("question_options insert failed", optionsError);
      await supabase.from("ai_generations").update({
        status: "failed",
        error: `question_options insert failed: ${optionsError.message}`,
        content_id: content.id,
      }).eq("id", generationRow.id);
      return json({ error: "could not save all answer options", content_id: content.id }, 500);
    }
  }

  await supabase
    .from("ai_generations")
    .update({
      status: "succeeded",
      content_id: content.id,
      raw_response: { lesson, prompt_version: PROMPT_VERSION } as never,
    })
    .eq("id", generationRow.id);

  return json({ content_id: content.id });
});
