// Test harness for AI lesson generation (Phase 0 validation).
// Generates a batch of French lessons with the v1 pedagogical prompt and
// writes them to output/ as JSON plus one human-readable review.md.
//
// Usage:
//   export ANTHROPIC_API_KEY=sk-ant-...
//   npm install
//   npm run generate                          # default model (claude-opus-5)
//   node generate.mjs --model claude-sonnet-5 # A/B: same batch, other model
//   node generate.mjs --only 3                # generate a single test case by number

import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------------------
// Output contract (mirrors AI_CONTENT_GENERATION.md §5 and the DB schema)

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
// System prompt — v1 (canonical source: prompts/lesson-generation/v1.md)

const PROMPT_VERSION = "v1";

function buildSystemPrompt({ languageName, learnerContext, difficulty }) {
  return `You are an expert special-education content creator, designing exercises for
a teenage learner with Down Syndrome. Follow these rules strictly:

LANGUAGE & TONE
- Write all learner-facing text in ${languageName}.
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
- Learner context: ${learnerContext}
- When natural, use the learner's interests in examples. Never force it.

DIFFICULTY ${difficulty}/3
- 1: single-step recall or recognition.
- 2: one simple operation or association.
- 3: two steps or less-familiar vocabulary. Stay within the topic.`;
}

function buildUserMessage({ topic, subject, questionCount, questionTypes, extraInstructions }) {
  return `Create a lesson: ${topic}
Subject: ${subject} | Questions: ${questionCount} | Types: ${questionTypes.join(", ")}
Extra instructions from the parent: ${extraInstructions || "none"}`;
}

// ---------------------------------------------------------------------------
// Test batch — varied subjects and difficulties, personalized for Arthur.
// EDIT the learner context and topics freely before running.

const LEARNER_CONTEXT =
  "Il s'appelle Arthur, 15 ans. Il adore le football et les animaux. " +
  "Il lit des phrases courtes. Il aime qu'on l'encourage.";

const TEST_CASES = [
  { topic: "Reconnaître les pièces en euros : 1€, 2€, 50 centimes", subject: "math", difficulty: 2, questionCount: 5, questionTypes: ["multiple_choice", "fill_in_blank"] },
  { topic: "Compter jusqu'à 20", subject: "math", difficulty: 1, questionCount: 6, questionTypes: ["multiple_choice", "fill_in_blank"] },
  { topic: "Les additions simples (résultat jusqu'à 10)", subject: "math", difficulty: 2, questionCount: 5, questionTypes: ["multiple_choice", "fill_in_blank"] },
  { topic: "Lire l'heure : heures pleines et demi-heures", subject: "math", difficulty: 3, questionCount: 5, questionTypes: ["multiple_choice"] },
  { topic: "Les jours de la semaine", subject: "literacy", difficulty: 1, questionCount: 5, questionTypes: ["multiple_choice", "fill_in_blank"] },
  { topic: "Les mots de la cuisine : ustensiles et aliments", subject: "literacy", difficulty: 2, questionCount: 5, questionTypes: ["multiple_choice", "fill_in_blank"] },
  { topic: "Écrire des phrases courtes avec sujet et verbe", subject: "literacy", difficulty: 3, questionCount: 4, questionTypes: ["fill_in_blank"] },
  { topic: "Traverser la rue en sécurité", subject: "life_skills", difficulty: 2, questionCount: 5, questionTypes: ["multiple_choice"] },
  { topic: "Faire des courses : demander poliment et dire merci", subject: "life_skills", difficulty: 2, questionCount: 5, questionTypes: ["multiple_choice", "fill_in_blank"] },
  { topic: "Les règles simples du football", subject: "general", difficulty: 2, questionCount: 5, questionTypes: ["multiple_choice", "fill_in_blank"], extraInstructions: "Arthur adore le foot, fais-toi plaisir sur les exemples." },
];

// ---------------------------------------------------------------------------
// Semantic validation (what the JSON schema can't express)

function validateLesson(lesson, testCase) {
  const problems = [];
  for (const [i, q] of lesson.questions.entries()) {
    const correct = q.options.filter((o) => o.is_correct).length;
    if (q.type === "multiple_choice" && correct !== 1)
      problems.push(`Q${i + 1}: multiple_choice must have exactly 1 correct option (has ${correct})`);
    if (q.type === "fill_in_blank" && correct !== q.options.length)
      problems.push(`Q${i + 1}: fill_in_blank options must all be accepted answers`);
    const labels = q.options.map((o) => o.label.trim().toLowerCase());
    if (new Set(labels).size !== labels.length) problems.push(`Q${i + 1}: duplicate options`);
    if (q.options.some((o) => !o.label.trim())) problems.push(`Q${i + 1}: empty option label`);
  }
  const delta = Math.abs(lesson.questions.length - testCase.questionCount);
  if (delta > 1)
    problems.push(`question count ${lesson.questions.length} too far from requested ${testCase.questionCount}`);
  return problems;
}

// ---------------------------------------------------------------------------
// Runner

const args = process.argv.slice(2);
function argValue(name) {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
}
const MODEL = argValue("--model") ?? "claude-opus-5";
const ONLY = argValue("--only") ? Number(argValue("--only")) : undefined;

const client = new Anthropic();
const outDir = join(__dirname, "output");
mkdirSync(outDir, { recursive: true });

const reviewLines = [
  `# Relecture des leçons générées`,
  ``,
  `Modèle : \`${MODEL}\` · Prompt : ${PROMPT_VERSION} · Généré le ${new Date().toISOString().slice(0, 10)}`,
  ``,
  `Pour chaque leçon, note de 1 à 5 : niveau adapté / clarté / ton / qualité des indices.`,
  ``,
];

const cases = ONLY ? [TEST_CASES[ONLY - 1]] : TEST_CASES;
let failures = 0;

for (const [index, tc] of cases.entries()) {
  const n = ONLY ?? index + 1;
  process.stdout.write(`[${n}/${TEST_CASES.length}] ${tc.topic} … `);

  try {
    const response = await client.messages.parse({
      model: MODEL,
      max_tokens: 16000,
      system: buildSystemPrompt({
        languageName: "French",
        learnerContext: LEARNER_CONTEXT,
        difficulty: tc.difficulty,
      }),
      messages: [{ role: "user", content: buildUserMessage(tc) }],
      output_config: { format: zodOutputFormat(GeneratedLesson) },
    });

    if (response.stop_reason === "refusal") {
      console.log("REFUSAL — réessaie, ou note-le pour la revue");
      failures++;
      continue;
    }

    const lesson = response.parsed_output;
    if (!lesson) {
      console.log("PARSE FAILED (parsed_output null)");
      failures++;
      continue;
    }

    const problems = validateLesson(lesson, tc);
    const slug = tc.topic.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40);
    writeFileSync(
      join(outDir, `${String(n).padStart(2, "0")}-${slug}.${MODEL}.json`),
      JSON.stringify({ model: MODEL, prompt_version: PROMPT_VERSION, test_case: tc, problems, lesson, usage: response.usage }, null, 2)
    );

    reviewLines.push(`---`, ``, `## ${n}. ${lesson.title}`, ``);
    reviewLines.push(`*Demandé : ${tc.topic} (difficulté ${tc.difficulty}/3, ${tc.questionCount} questions)*`, ``);
    if (problems.length) reviewLines.push(`⚠️ **Validation :** ${problems.join(" · ")}`, ``);
    reviewLines.push(`${lesson.description}`, ``);
    for (const [qi, q] of lesson.questions.entries()) {
      reviewLines.push(`**Q${qi + 1} (${q.type === "multiple_choice" ? "choix" : "texte à trou"})** — ${q.prompt}`);
      if (q.type === "multiple_choice") {
        for (const o of q.options) reviewLines.push(`- ${o.is_correct ? "✅" : "▫️"} ${o.label}`);
      } else {
        reviewLines.push(`- Réponses acceptées : ${q.options.map((o) => o.label).join(", ")}`);
      }
      reviewLines.push(`- Indice : ${q.hint}`);
      reviewLines.push(`- Explication : ${q.explanation}`, ``);
    }
    console.log(problems.length ? `OK avec avertissements (${problems.length})` : "OK");
  } catch (err) {
    console.log(`ERREUR — ${err?.message ?? err}`);
    failures++;
  }
}

const reviewPath = join(outDir, `review.${MODEL}.md`);
writeFileSync(reviewPath, reviewLines.join("\n"));
console.log(`\nTerminé. ${cases.length - failures}/${cases.length} leçons générées.`);
console.log(`À relire : ${reviewPath}`);
