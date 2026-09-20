import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '@/lib/supabase'
import type { RedeemLinkCodeResponse, SubmitAnswerResponse } from '@learning-app/shared-types'

/**
 * /play/<code> — student-facing lesson page, no login required.
 *
 * TEMPORARY TEST HARNESS (added 2026-09-15): CLAUDE.md's decided mobile
 * architecture is React Native + Expo, not a web page. This page exists
 * only to validate the core loop (assign a lesson, a student answers it,
 * a parent sees results) end-to-end before investing in the real mobile
 * app — see the "test with Arthur" conversation. It reuses the exact same
 * backend (schema, RLS, redeem-link-code, submit_answer) the mobile app
 * will use, so nothing here is throwaway except the front-end itself.
 *
 * Flow:
 * 1. Sign in anonymously (supabase.auth.signInAnonymously()) if not
 *    already — this requires "Anonymous sign-ins" enabled in the
 *    Supabase dashboard (Authentication > Sign In / Providers).
 * 2. Call the redeem-link-code Edge Function with the code from the URL
 *    to link this anonymous session to a student (idempotent — a page
 *    reload after linking just confirms the existing link).
 * 3. Fetch this student's oldest non-completed assignment + its questions
 *    (via the student_question_options view, which excludes is_correct).
 * 4. Answer one question at a time via the submit_answer() RPC — wrong
 *    answers show the hint and allow retry; correct answers show the
 *    explanation and advance (SPECIFICATIONS.md §11 — retry until correct,
 *    first attempt only counts for scoring).
 * 5. Once every question is answered, show the final score.
 */

type Question = {
  id: string
  type: 'multiple_choice' | 'fill_in_blank' | 'image_identification'
  position: number
  prompt: string
  hint: string | null
  explanation: string | null
}

type Option = {
  id: string
  question_id: string
  position: number
  label: string
}

type Assignment = {
  id: string
  content_id: string
  status: string
  score_correct: number | null
  score_total: number | null
}

type Content = {
  id: string
  title: string
  description: string
}

type Stage =
  | { name: 'linking' }
  | { name: 'error'; message: string }
  | { name: 'no-assignment' }
  | { name: 'playing' }
  | { name: 'done' }

export default function Play() {
  const router = useRouter()
  const code = typeof router.query.code === 'string' ? router.query.code : undefined

  const [stage, setStage] = useState<Stage>({ name: 'linking' })
  const [assignment, setAssignment] = useState<Assignment | null>(null)
  const [content, setContent] = useState<Content | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [optionsByQuestion, setOptionsByQuestion] = useState<Record<string, Option[]>>({})
  const [questionIndex, setQuestionIndex] = useState(0)
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null)
  const [textAnswer, setTextAnswer] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<{ correct: boolean; explanation: string | null } | null>(null)
  const [finalScore, setFinalScore] = useState<{ correct: number; total: number } | null>(null)

  const loadAssignment = useCallback(async () => {
    // Oldest non-completed assignment first; if none, the most recent
    // completed one (so re-opening the link after finishing still shows something).
    const { data: assignments, error: assignmentsError } = await supabase
      .from('assignments')
      .select('id, content_id, status, score_correct, score_total')
      .order('status', { ascending: true }) // 'assigned'/'in_progress' sort before 'completed'
      .order('created_at', { ascending: true })
      .limit(1)

    if (assignmentsError) {
      setStage({ name: 'error', message: `Impossible de charger la leçon : ${assignmentsError.message}` })
      return
    }
    const a = assignments?.[0]
    if (!a) {
      setStage({ name: 'no-assignment' })
      return
    }
    setAssignment(a)

    const { data: contentData, error: contentError } = await supabase
      .from('contents')
      .select('id, title, description')
      .eq('id', a.content_id)
      .single()
    if (contentError || !contentData) {
      setStage({ name: 'error', message: 'Impossible de charger la leçon.' })
      return
    }
    setContent(contentData)

    const { data: questionsData, error: questionsError } = await supabase
      .from('questions')
      .select('id, type, position, prompt, hint, explanation')
      .eq('content_id', a.content_id)
      .order('position', { ascending: true })
    if (questionsError || !questionsData) {
      setStage({ name: 'error', message: 'Impossible de charger les questions.' })
      return
    }
    setQuestions(questionsData)

    const { data: optionsData, error: optionsError } = await supabase
      .from('student_question_options')
      .select('id, question_id, position, label')
      .in(
        'question_id',
        questionsData.map((q) => q.id)
      )
      .order('position', { ascending: true })
    if (optionsError) {
      setStage({ name: 'error', message: 'Impossible de charger les réponses possibles.' })
      return
    }
    const grouped: Record<string, Option[]> = {}
    for (const o of optionsData ?? []) {
      grouped[o.question_id] = grouped[o.question_id] ?? []
      grouped[o.question_id].push(o)
    }
    setOptionsByQuestion(grouped)

    if (a.status === 'completed') {
      setFinalScore({ correct: a.score_correct ?? 0, total: a.score_total ?? questionsData.length })
      setStage({ name: 'done' })
    } else {
      setStage({ name: 'playing' })
    }
  }, [])

  useEffect(() => {
    if (!code) return

    let cancelled = false

    const linkAndLoad = async () => {
      // Step 1: ensure we have an anonymous session
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) {
        const { error: signInError } = await supabase.auth.signInAnonymously()
        if (signInError) {
          if (cancelled) return
          setStage({
            name: 'error',
            message:
              `Connexion impossible : ${signInError.message}. ` +
              `Vérifie que "Anonymous sign-ins" est activé dans le tableau de bord Supabase ` +
              `(Authentication > Sign In / Providers).`,
          })
          return
        }
      }

      // Step 2: link this session to the student via the code
      const { data, error } = await supabase.functions.invoke<RedeemLinkCodeResponse>('redeem-link-code', {
        body: { code, device_name: 'Web (test)' },
      })

      if (cancelled) return

      if (error || !data?.success) {
        setStage({ name: 'error', message: data?.error ?? error?.message ?? 'Code invalide.' })
        return
      }

      // Step 3: load the assignment
      await loadAssignment()
    }

    linkAndLoad()

    return () => {
      cancelled = true
    }
  }, [code, loadAssignment])

  const currentQuestion = questions[questionIndex]
  const currentOptions = currentQuestion ? optionsByQuestion[currentQuestion.id] ?? [] : []

  const handleSubmit = async () => {
    if (!assignment || !currentQuestion) return
    if (currentQuestion.type === 'fill_in_blank' && !textAnswer.trim()) return
    if (currentQuestion.type !== 'fill_in_blank' && !selectedOptionId) return

    setSubmitting(true)
    const { data, error } = await supabase.rpc('submit_answer', {
      p_assignment_id: assignment.id,
      p_question_id: currentQuestion.id,
      p_selected_option_id: currentQuestion.type === 'fill_in_blank' ? null : selectedOptionId,
      p_text_answer: currentQuestion.type === 'fill_in_blank' ? textAnswer.trim() : null,
    })
    setSubmitting(false)

    if (error) {
      setStage({ name: 'error', message: `Erreur : ${error.message}` })
      return
    }

    const result = data as SubmitAnswerResponse
    setFeedback({ correct: result.correct, explanation: result.explanation ?? null })
  }

  const handleNext = () => {
    setFeedback(null)
    setSelectedOptionId(null)
    setTextAnswer('')

    if (questionIndex + 1 < questions.length) {
      setQuestionIndex(questionIndex + 1)
    } else {
      // Last question done — re-fetch the assignment for the final denormalized score
      supabase
        .from('assignments')
        .select('score_correct, score_total')
        .eq('id', assignment!.id)
        .single()
        .then(({ data }) => {
          setFinalScore({ correct: data?.score_correct ?? 0, total: data?.score_total ?? questions.length })
          setStage({ name: 'done' })
        })
    }
  }

  const styles = {
    page: { maxWidth: '480px', margin: '0 auto', padding: '2rem 1rem', fontFamily: 'sans-serif', fontSize: '1.25rem' },
    title: { fontSize: '1.75rem', marginBottom: '0.5rem' },
    button: {
      display: 'block',
      width: '100%',
      padding: '1rem',
      margin: '0.5rem 0',
      fontSize: '1.25rem',
      borderRadius: '0.5rem',
      border: '2px solid #ccc',
      background: '#fff',
      cursor: 'pointer',
      textAlign: 'left' as const,
    },
    buttonSelected: { border: '2px solid #2563eb', background: '#eff6ff' },
    primaryButton: {
      display: 'block',
      width: '100%',
      padding: '1rem',
      marginTop: '1rem',
      fontSize: '1.25rem',
      borderRadius: '0.5rem',
      border: 'none',
      background: '#2563eb',
      color: '#fff',
      cursor: 'pointer',
    },
    feedback: (correct: boolean) => ({
      marginTop: '1rem',
      padding: '1rem',
      borderRadius: '0.5rem',
      background: correct ? '#dcfce7' : '#fef9c3',
    }),
  }

  if (!code) return null

  if (stage.name === 'linking') {
    return (
      <div style={styles.page}>
        <p>Connexion…</p>
      </div>
    )
  }

  if (stage.name === 'error') {
    return (
      <div style={styles.page}>
        <h1 style={styles.title}>Oups</h1>
        <p>{stage.message}</p>
      </div>
    )
  }

  if (stage.name === 'no-assignment') {
    return (
      <div style={styles.page}>
        <h1 style={styles.title}>Rien pour l&apos;instant</h1>
        <p>Aucune leçon n&apos;est assignée pour le moment.</p>
      </div>
    )
  }

  if (stage.name === 'done' && finalScore) {
    return (
      <div style={styles.page}>
        <h1 style={styles.title}>Bravo{content ? ` — ${content.title}` : ''} !</h1>
        <p>
          Score : {finalScore.correct} / {finalScore.total}
        </p>
      </div>
    )
  }

  if (!currentQuestion) return null

  return (
    <div style={styles.page}>
      {content && (
        <>
          <h1 style={styles.title}>{content.title}</h1>
          <p style={{ color: '#666' }}>
            Question {questionIndex + 1} / {questions.length}
          </p>
        </>
      )}

      <p style={{ fontSize: '1.5rem', margin: '1.5rem 0' }}>{currentQuestion.prompt}</p>

      {currentQuestion.type === 'fill_in_blank' ? (
        <input
          type="text"
          value={textAnswer}
          onChange={(e) => setTextAnswer(e.target.value)}
          disabled={!!feedback}
          style={{ width: '100%', padding: '1rem', fontSize: '1.25rem', borderRadius: '0.5rem', border: '2px solid #ccc' }}
        />
      ) : (
        currentOptions.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => setSelectedOptionId(opt.id)}
            disabled={!!feedback}
            style={{ ...styles.button, ...(selectedOptionId === opt.id ? styles.buttonSelected : {}) }}
          >
            {opt.label}
          </button>
        ))
      )}

      {feedback && (
        <div style={styles.feedback(feedback.correct)}>
          <p>{feedback.correct ? '✅ Bravo !' : '🤔 Pas tout à fait — essaie encore.'}</p>
          {feedback.correct && feedback.explanation && <p>{feedback.explanation}</p>}
          {!feedback.correct && currentQuestion.hint && <p>💡 {currentQuestion.hint}</p>}
        </div>
      )}

      {feedback?.correct ? (
        <button type="button" style={styles.primaryButton} onClick={handleNext}>
          {questionIndex + 1 < questions.length ? 'Suivant' : 'Terminer'}
        </button>
      ) : feedback && !feedback.correct ? (
        // Clear feedback and the wrong selection so the student can pick a
        // different answer — this must NOT resubmit the same answer.
        <button
          type="button"
          style={styles.primaryButton}
          onClick={() => {
            setFeedback(null)
            setSelectedOptionId(null)
            setTextAnswer('')
          }}
        >
          Réessayer
        </button>
      ) : (
        <button
          type="button"
          style={styles.primaryButton}
          onClick={handleSubmit}
          disabled={submitting || (currentQuestion.type === 'fill_in_blank' ? !textAnswer.trim() : !selectedOptionId)}
        >
          {submitting ? '…' : 'Valider'}
        </button>
      )}
    </div>
  )
}
