/**
 * Shared types for the Learning App
 * Used across admin panel and mobile app
 */

// ============================================================
// ENUMS (matching DATABASE_SCHEMA.md)
// ============================================================

export enum FamilyRole {
  Owner = 'owner',
  CoParent = 'co_parent',
  Viewer = 'viewer',
}

export enum ContentStatus {
  Draft = 'draft',
  Published = 'published',
  Archived = 'archived',
}

export enum CurriculumCycle {
  Cycle1 = 'cycle_1',
  Cycle2 = 'cycle_2',
  Cycle3 = 'cycle_3',
  Cycle4 = 'cycle_4',
}

export enum QuestionType {
  MultipleChoice = 'multiple_choice',
  FillInBlank = 'fill_in_blank',
  ImageIdentification = 'image_identification',
}

export enum AssignmentStatus {
  Assigned = 'assigned',
  InProgress = 'in_progress',
  Completed = 'completed',
}

export enum Language {
  English = 'en',
  French = 'fr',
  Spanish = 'es',
  Ukrainian = 'uk',
}

// ============================================================
// DATABASE MODELS
// ============================================================

export interface Profile {
  id: string
  full_name: string
  language: Language
  timezone: string
  terms_accepted_at?: string
  created_at: string
  updated_at: string
}

export interface Family {
  id: string
  name: string
  created_by: string
  created_at: string
  updated_at: string
  deleted_at?: string
}

export interface FamilyMember {
  id: string
  family_id: string
  profile_id: string
  role: FamilyRole
  created_at: string
}

export interface Student {
  id: string
  family_id: string
  first_name: string
  birth_date?: string
  language: Language
  avatar_url?: string
  settings: StudentSettings
  pin_hash?: string
  learner_notes?: string
  created_at: string
  updated_at: string
  deleted_at?: string
}

export interface StudentSettings {
  font_scale: number
  high_contrast: boolean
  text_to_speech: boolean
  pin_enabled: boolean
}

export interface StudentDevice {
  id: string
  student_id: string
  device_name: string
  auth_user_id?: string
  last_seen_at?: string
  created_at: string
  revoked_at?: string
}

export interface DeviceLinkCode {
  id: string
  student_id: string
  code: string
  expires_at: string
  used_at?: string
  created_by: string
  created_at: string
}

export interface Content {
  id: string
  family_id: string
  title: string
  description: string
  subject: string
  difficulty: 1 | 2 | 3
  curriculum_cycle?: CurriculumCycle
  curriculum_domain?: string
  language: Language
  status: ContentStatus
  is_ai_generated: boolean
  ai_prompt?: string
  ai_model?: string
  created_by: string
  published_at?: string
  created_at: string
  updated_at: string
  deleted_at?: string
}

export interface Question {
  id: string
  content_id: string
  type: QuestionType
  position: number
  prompt: string
  image_url?: string
  image_alt_text?: string
  hint?: string
  explanation?: string
  created_at: string
  updated_at: string
}

export interface QuestionOption {
  id: string
  question_id: string
  position: number
  label: string
  image_url?: string
  image_alt_text?: string
  is_correct: boolean
  created_at: string
}

export interface StudentQuestionOption
  extends Omit<QuestionOption, 'is_correct'> {}

export interface Assignment {
  id: string
  student_id: string
  content_id: string
  assigned_by: string
  due_date?: string
  status: AssignmentStatus
  started_at?: string
  completed_at?: string
  score_correct?: number
  score_total?: number
  created_at: string
  updated_at: string
}

export interface Response {
  id: string
  assignment_id: string
  question_id: string
  selected_option_id?: string
  text_answer?: string
  is_correct: boolean
  attempt: number
  time_spent_seconds?: number
  answered_at: string
}

export interface AIGeneration {
  id: string
  family_id: string
  requested_by: string
  prompt: string
  model: string
  raw_response?: unknown
  content_id?: string
  status: 'pending' | 'succeeded' | 'failed'
  error?: string
  created_at: string
}

// ============================================================
// API REQUEST/RESPONSE TYPES
// ============================================================

export interface SubmitAnswerRequest {
  assignment_id: string
  question_id: string
  selected_option_id?: string
  text_answer?: string
}

export interface SubmitAnswerResponse {
  correct: boolean
  explanation?: string
  attempt: number
}

export interface RedeemLinkCodeRequest {
  code: string
  device_name: string
}

export interface RedeemLinkCodeResponse {
  student_id: string
  auth_token: string
}
