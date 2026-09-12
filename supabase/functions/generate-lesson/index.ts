import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import Anthropic from 'https://esm.sh/@anthropic-ai/sdk@0.122.0'
import { zodOutputFormat } from 'https://esm.sh/@anthropic-ai/sdk@0.122.0/helpers/zod'
import { z } from 'https://esm.sh/zod@4'

/**
 * Edge Function: Generate Lesson (AI Content Generation)
 *
 * Purpose:
 * - Take a parent's lesson request from the admin panel
 * - Call the Claude API with the versioned pedagogical prompt (v1)
 * - Insert the result as a draft `contents` row (+ questions + options)
 * - Log every attempt in `ai_generations` for A/B testing and debugging
 *
 * Security notes:
 * - Holds the only copy of ANTHROPIC_API_KEY (never reaches the client).
 * - Everything it does with the database runs scoped to the calling
 *   parent's own JWT (forwarded, anon key) — NOT the service role key —
 *   so ordinary RLS decides access. The one exception is the multi-table
 *   contents/questions/question_options write, which needs to be one
 *   transaction; that goes through the `insert_ai_lesson()` DB function
 *   (security definer, but still keyed off the caller's own auth.uid()).
 * - AI-generated content always lands as `contents.status = 'draft'`
 *   (SPECIFICATIONS.md §11 Decision 4) — enforced by insert_ai_lesson(),
 *   not just this function's own behavior.
 *
 * Reference: AI_CONTENT_GENERATION.md (full design), prompts/lesson-generation/v1.md
 * (canonical prompt source — this function builds the prompt from the same
 * template as experiments/generation-test/generate.mjs), DATABASE_SCHEMA.md
 * §3.7–3.9 (contents/questions/question_options), EDGE_FUNCTIONS.md.
 *
 * Known doc drift (flagged 2026-09-11, not yet resolved): AI_CONTENT_GENERATION.md
 * §4's example user message includes a "Curriculum: {curriculum_cycle} /
 * {curriculum_domain}" line, but prompts/lesson-generation/v1.md (the
 * declared canonical, validated prompt — matching the actual test harness)
 * has no such line, and no CURRICULUM REFERENCE section in its system
 * prompt either. This function follows v1.md exactly, since that's the
 * prompt actually validated against real generations. curriculum_cycle/
 * curriculum_domain are still stored on the resulting `contents` row as
 * descriptive metadata (DATABASE_SCHEMA.md §3.7), just not yet injected
 * into the prompt text. Adding that requires a new prompts/lesson-generation/v2.md
 * (version files are never edited in place) plus a matching update here.
 */

const PROMPT_VERSION = 'v1'
const DEFAULT_MODEL = 'claude-opus-5'
const MAX_GENERATION_ATTEMPTS = 2 // one retry on refusal / parse failure / validation failure

const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  fr: 'French',
  es: 'Spanish',
  uk: 'Ukrainian',
}

const CURRICULUM_CYCLES = ['cycle_1', 'cycle_2', 'cycle_3', 'cycle_4'] as const
const QUESTION_TYPES = ['multiple_choice', 'fill_in_blank'] as const // image_identification: parent attaches images after generation (Decision 3)

interface GenerateLessonRequest {
  topic: string
  student_id?: string // when set, pulls learner_notes/language as defaults
  subject?: string
  language?: 'en' | 'fr' | 'es' | 'uk'
  difficulty?: 1 | 2 | 3
  curriculum_cycle?: (typeof CURRICULUM_CYCLES)[number]
  curriculum_domain?: string
  question_count?: number
  question_types?: (typeof QUESTION_TYPES)[number][]
  learner_context?: string
  extra_instructions?: string
  model?: string
}

interface GenerateLessonResponse {
  success: boolean
  error?: string
  content_id?: string
  ai_generation_id?: string
  title?: string
  question_count?: number
  // Only present when generation succeeded but semantic validation still
  // failed after the retry — the raw draft for the parent to salvage
  // manually (AI_CONTENT_GENERATION.md §8), never persisted to `contents`.
  lesson?: unknown
}

// ---------------------------------------------------------------------------
// Output contract — mirrors AI_CONTENT_GENERATION.md §5 and
// experiments/generation-test/generate.mjs exactly.

const GeneratedOption = z.object({
  label: z.string(),
  is_correct: z.boolean(),
})

const GeneratedQuestion = z.object({
  type: z.enum(QUESTION_TYPES),
  prompt: z.string(),
  options: z.array(GeneratedOption).min(2).max(4),
  hint: z.string(),
  explanation: z.string(),
})

const GeneratedLesson = z.object({
  title: z.string(),
  description: z.string(),
  questions: z.array(GeneratedQuestion).min(3).max(10),
})

type Lesson = z.infer<typeof GeneratedLesson>

// ---------------------------------------------------------------------------
// Prompt building — verbatim from prompts/lesson-generation/v1.md

function buildSystemPrompt(params: {
  languageName: string
  learnerContext: string
  difficulty: number
}): string {
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
- explanation: 1–2 short sentences, positive framing, shown after answering.
  Never start with a negation — always affirm the correct fact.

PERSONALIZATION
- Learner context: ${params.learnerContext}
- When natural, use the learner's interests in examples. Never force it.

DIFFICULTY ${params.difficulty}/3
- 1: single-step recall or recognition.
- 2: one simple operation or association.
- 3: two steps or less-familiar vocabulary. Stay within the topic.`
}

function buildUserMessage(params: {
  topic: string
  subject: string
  questionCount: number
  questionTypes: string[]
  extraInstructions?: string
}): string {
  return `Create a lesson: ${params.topic}
Subject: ${params.subject} | Questions: ${params.questionCount} | Types: ${params.questionTypes.join(', ')}
Extra instructions from the parent: ${params.extraInstructions || 'none'}`
}

// ---------------------------------------------------------------------------
// Semantic validation (what the JSON schema can't express) — mirrors
// experiments/generation-test/generate.mjs's validateLesson exactly.

function validateLesson(lesson: Lesson, requestedCount: number): string[] {
  const problems: string[] = []
  for (const [i, q] of lesson.questions.entries()) {
    const correct = q.options.filter((o) => o.is_correct).length
    if (q.type === 'multiple_choice' && correct !== 1) {
      problems.push(`Q${i + 1}: multiple_choice must have exactly 1 correct option (has ${correct})`)
    }
    if (q.type === 'fill_in_blank' && correct !== q.options.length) {
      problems.push(`Q${i + 1}: fill_in_blank options must all be accepted answers`)
    }
    const labels = q.options.map((o) => o.label.trim().toLowerCase())
    if (new Set(labels).size !== labels.length) problems.push(`Q${i + 1}: duplicate options`)
    if (q.options.some((o) => !o.label.trim())) problems.push(`Q${i + 1}: empty option label`)
  }
  const delta = Math.abs(lesson.questions.length - requestedCount)
  if (delta > 1) {
    problems.push(`question count ${lesson.questions.length} too far from requested ${requestedCount}`)
  }
  return problems
}

// ---------------------------------------------------------------------------

function jsonResponse(body: GenerateLessonResponse, status: number): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

export default async (req: Request): Promise<Response> => {
  try {
    if (req.method !== 'POST') {
      return jsonResponse({ success: false, error: 'Method not allowed' }, 405)
    }

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return jsonResponse({ success: false, error: 'Missing Authorization header' }, 401)
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
    const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY')

    if (!supabaseUrl || !supabaseAnonKey || !anthropicApiKey) {
      return jsonResponse({ success: false, error: 'Missing environment variables' }, 500)
    }

    // Scoped to the calling parent's own JWT — RLS decides access, not the
    // service role key (EDGE_FUNCTIONS.md — this function's design note).
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false },
      global: { headers: { Authorization: authHeader } },
    })

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return jsonResponse({ success: false, error: 'Not authenticated' }, 401)
    }

    const body = (await req.json()) as GenerateLessonRequest

    if (!body.topic || !body.topic.trim()) {
      return jsonResponse({ success: false, error: 'Missing topic' }, 400)
    }

    const questionCount = body.question_count ?? 5
    if (questionCount < 3 || questionCount > 10) {
      return jsonResponse({ success: false, error: 'question_count must be between 3 and 10' }, 400)
    }

    const difficulty = body.difficulty ?? 2
    if (![1, 2, 3].includes(difficulty)) {
      return jsonResponse({ success: false, error: 'difficulty must be 1, 2, or 3' }, 400)
    }

    const questionTypes = body.question_types ?? ['multiple_choice', 'fill_in_blank']
    if (questionTypes.length === 0 || questionTypes.some((t) => !QUESTION_TYPES.includes(t))) {
      return jsonResponse(
        {
          success: false,
          error:
            'question_types must be a non-empty subset of multiple_choice/fill_in_blank ' +
            '(image_identification requires the parent to attach images after generation)',
        },
        400
      )
    }

    if (body.curriculum_cycle && !CURRICULUM_CYCLES.includes(body.curriculum_cycle)) {
      return jsonResponse({ success: false, error: 'Invalid curriculum_cycle' }, 400)
    }

    const subject = body.subject ?? 'general'

    // Step 1: resolve the calling parent's family (RLS-scoped read)
    const { data: familyMember, error: familyError } = await supabase
      .from('family_members')
      .select('family_id')
      .eq('profile_id', user.id)
      .limit(1)
      .maybeSingle()

    if (familyError || !familyMember) {
      return jsonResponse({ success: false, error: 'No family found for this user' }, 400)
    }
    const familyId = familyMember.family_id

    // Step 2: optional student context (learner_notes/language defaults)
    let learnerContext = body.learner_context ?? ''
    let language = body.language

    if (body.student_id) {
      const { data: student, error: studentError } = await supabase
        .from('students')
        .select('family_id, learner_notes, language')
        .eq('id', body.student_id)
        .maybeSingle()

      if (studentError || !student || student.family_id !== familyId) {
        return jsonResponse({ success: false, error: 'Student not found in this family' }, 400)
      }
      if (!body.learner_context && student.learner_notes) {
        learnerContext = student.learner_notes
      }
      if (!language) {
        language = student.language as GenerateLessonRequest['language']
      }
    }

    language = language ?? 'fr'
    if (!(language in LANGUAGE_NAMES)) {
      return jsonResponse({ success: false, error: 'Invalid language' }, 400)
    }

    const model = body.model ?? DEFAULT_MODEL
    const userMessage = buildUserMessage({
      topic: body.topic,
      subject,
      questionCount,
      questionTypes,
      extraInstructions: body.extra_instructions,
    })
    const systemPrompt = buildSystemPrompt({
      languageName: LANGUAGE_NAMES[language],
      learnerContext,
      difficulty,
    })

    // Step 3: log the attempt before calling the API (AI_CONTENT_GENERATION.md
    // §2 architecture — insert ai_generations as 'pending' first)
    const { data: generation, error: generationInsertError } = await supabase
      .from('ai_generations')
      .insert({
        family_id: familyId,
        requested_by: user.id,
        prompt: userMessage,
        model,
        status: 'pending',
      })
      .select('id')
      .single()

    if (generationInsertError || !generation) {
      console.error('ai_generations insert error:', generationInsertError)
      return jsonResponse({ success: false, error: 'Failed to record generation request' }, 500)
    }
    const generationId: string = generation.id

    // Step 4: call the Claude API, with one retry on refusal / parse failure
    // / semantic validation failure (AI_CONTENT_GENERATION.md §8)
    const anthropic = new Anthropic({ apiKey: anthropicApiKey })
    let lesson: Lesson | null = null
    let problems: string[] = []
    let lastError: string | undefined
    let usage: unknown

    for (let attempt = 1; attempt <= MAX_GENERATION_ATTEMPTS; attempt++) {
      let response
      try {
        response = await anthropic.messages.parse({
          model,
          max_tokens: 16000,
          system: systemPrompt,
          messages: [{ role: 'user', content: userMessage }],
          output_config: { format: zodOutputFormat(GeneratedLesson) },
        })
      } catch (err) {
        lastError = err instanceof Error ? err.message : String(err)
        continue
      }

      usage = response.usage

      if (response.stop_reason === 'refusal') {
        lastError = 'Model declined the request (refusal)'
        continue
      }
      if (!response.parsed_output) {
        lastError = 'Model response did not match the expected schema'
        continue
      }

      const candidate = response.parsed_output
      const candidateProblems = validateLesson(candidate, questionCount)
      if (candidateProblems.length > 0) {
        lesson = candidate // keep the best draft so far, for manual salvage
        problems = candidateProblems
        lastError = `Semantic validation failed: ${candidateProblems.join('; ')}`
        continue
      }

      lesson = candidate
      problems = []
      lastError = undefined
      break
    }

    if (!lesson || problems.length > 0) {
      await supabase
        .from('ai_generations')
        .update({
          status: 'failed',
          error: lastError ?? 'Unknown generation failure',
          raw_response: lesson ? { lesson, problems, usage, prompt_version: PROMPT_VERSION } : null,
        })
        .eq('id', generationId)

      return jsonResponse(
        {
          success: false,
          error: lastError ?? 'Generation failed',
          ai_generation_id: generationId,
          // Raw draft for manual salvage when we at least got a (flawed) lesson
          lesson: lesson ?? undefined,
        },
        502
      )
    }

    // Step 5: insert contents/questions/question_options as one transaction
    const { data: contentId, error: insertError } = await supabase.rpc('insert_ai_lesson', {
      p_family_id: familyId,
      p_title: lesson.title,
      p_description: lesson.description,
      p_subject: subject,
      p_difficulty: difficulty,
      p_curriculum_cycle: body.curriculum_cycle ?? null,
      p_curriculum_domain: body.curriculum_domain ?? null,
      p_language: language,
      p_ai_prompt: userMessage,
      p_ai_model: model,
      p_questions: lesson.questions,
    })

    if (insertError || !contentId) {
      console.error('insert_ai_lesson error:', insertError)
      await supabase
        .from('ai_generations')
        .update({
          status: 'failed',
          error: `Generated successfully but failed to save: ${insertError?.message ?? 'unknown error'}`,
          raw_response: { lesson, usage, prompt_version: PROMPT_VERSION },
        })
        .eq('id', generationId)

      return jsonResponse(
        {
          success: false,
          error: 'Lesson generated but could not be saved',
          ai_generation_id: generationId,
          lesson,
        },
        500
      )
    }

    // Step 6: mark the generation succeeded
    await supabase
      .from('ai_generations')
      .update({
        status: 'succeeded',
        content_id: contentId,
        raw_response: { lesson, usage, prompt_version: PROMPT_VERSION },
      })
      .eq('id', generationId)

    return jsonResponse(
      {
        success: true,
        content_id: contentId,
        ai_generation_id: generationId,
        title: lesson.title,
        question_count: lesson.questions.length,
      },
      200
    )
  } catch (error) {
    console.error('Unexpected error:', error)
    return jsonResponse({ success: false, error: 'Internal server error' }, 500)
  }
}
