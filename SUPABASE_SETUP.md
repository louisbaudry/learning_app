# Supabase Database Setup

**Status:** ✅ Complete  
**Date:** 2026-09-06  
**Project URL:** `https://dyjntcuovsoyhbkxnmih.supabase.co`

## What Was Set Up

### 1. Database Schema (13 tables + 1 view)
- ✅ `profiles` — parent/guardian accounts (extends auth.users)
- ✅ `families` — tenancy unit
- ✅ `family_members` — family membership with roles (owner/co_parent/viewer)
- ✅ `students` — learner profiles
- ✅ `student_devices` — linked phones with anonymous auth
- ✅ `device_link_codes` — one-time setup codes
- ✅ `contents` — lessons/exercise sets (draft/published/archived)
- ✅ `questions` — assessment items
- ✅ `question_options` — answer choices
- ✅ `assignments` — content assignments to students
- ✅ `responses` — answer tracking with attempt numbers
- ✅ `ai_generations` — audit log of AI-generated content
- ✅ `student_question_options` (view) — excludes `is_correct` for students

### 2. Custom Types (Enums)
- `family_role` → 'owner' | 'co_parent' | 'viewer'
- `content_status` → 'draft' | 'published' | 'archived'
- `curriculum_cycle` → 'cycle_1' | 'cycle_2' | 'cycle_3' | 'cycle_4' (Éduscol)
- `question_type` → 'multiple_choice' | 'fill_in_blank' | 'image_identification'
- `assignment_status` → 'assigned' | 'in_progress' | 'completed'

### 3. Row Level Security (RLS)
✅ **All tables have RLS enabled** with family-scoped and device-scoped policies:
- **Parents** → see only their family's data; role-based write access
- **Student devices** → see only their own student's assigned, published content
- **Critical security:** `question_options.is_correct` hidden from students; answer validation happens server-side in `submit_answer()` function

### 4. Helper Functions
- `my_family_ids()` → returns families the current parent belongs to
- `my_student_id()` → returns the student linked to the current device
- `normalize_answer()` → case/accent-insensitive text matching for fill-in-blank questions
- `touch_updated_at()` → automatic `updated_at` maintenance
- `handle_new_user()` → auto-creates profile when parent signs up
- `submit_answer()` → **security-definer function** for server-side answer validation

### 5. Triggers
- ✅ 7× `touch_updated_at` triggers for automatic timestamp maintenance
- ✅ `handle_auth_user_created` → auto-creates profile on Supabase auth signup

### 6. Indexes
- ✅ 11 indexes optimized for common queries (family filtering, status, assignment tracking)

### 7. Extensions
- ✅ `unaccent` — for accent-insensitive text matching in French

---

## Connection Details

**Project URL:** `https://dyjntcuovsoyhbkxnmih.supabase.co`

**Public anon key:** (available in Supabase dashboard → Settings → API)  
**Service role secret:** (stored securely — do not commit)

---

## Next Steps

### Phase 1 (MVP) Implementation:

1. **Environment Setup**
   - [ ] Create `.env.local` with Supabase credentials
   - [ ] Set up monorepo structure (`apps/admin`, `apps/mobile`)

2. **Admin Panel (Next.js)**
   - [ ] Scaffold Next.js app with TypeScript
   - [ ] Supabase client integration
   - [ ] Auth flow (email/password signup for parents)
   - [ ] Family dashboard (view students, create content, assign lessons)
   - [ ] Content editor (create/edit questions)
   - [ ] Progress tracking (view student responses)

3. **Mobile App (React Native + Expo)**
   - [ ] Scaffold Expo project
   - [ ] Device linking flow (redeem one-time code)
   - [ ] Student dashboard (view assignments, complete lessons)
   - [ ] Question rendering (MC, fill-in-blank, image identification)
   - [ ] Answer submission (calls `submit_answer()` function)

4. **Edge Functions** (Supabase)
   - [ ] `redeem_link_code()` — validate device link code, create anonymous auth
   - [ ] Image upload handlers → signed URLs

5. **Testing** (per `TESTING.md`)
   - [ ] RLS policy tests
   - [ ] `submit_answer()` validation
   - [ ] UI tests (admin panel + mobile)

---

## Schema Compliance Checklist

- ✅ **Database Schema.md** — 100% implemented
- ✅ **AI_CONTENT_GENERATION.md** — ready for API integration
- ✅ **SPECIFICATIONS.md** § Architecture decisions — database shape enforces all of them
- ✅ **GDPR** — soft deletes, terms acceptance tracking, no sensitive diagnostic data
- ✅ **Curriculum alignment** — Éduscol cycles supported
- ✅ **Assessment model** — QTI 3.0–inspired structure
- ✅ **Accessibility** — `image_alt_text` tracked, `settings.text_to_speech` stored

---

**Created by:** Claude Code (session: 01NzxG9jat3w5FmiE45pLc84)
