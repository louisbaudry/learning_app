# Database Schema Design
## Educational Learning App — PostgreSQL (Supabase)

**Status:** Draft for review  
**Last Updated:** 2026-08-21  
**Depends on:** SPECIFICATIONS.md (architecture decisions, Section 11)

---

## 1. Design Principles

1. **Family-based multi-tenancy.** Everything belongs to a `family`, not directly to a user. In MVP a family has exactly one member (you), but this is what makes co-parent access (Decision 8) a small Phase 2 feature instead of a redesign.
2. **Row Level Security (RLS) everywhere.** No table is accessible without a policy. Parents see only their family's data; a student device sees only its own student's data.
3. **Children are not auth users.** Arthur never has an email/password. His phone is *linked* to his student profile via a one-time setup code (Decision 7) and gets a device-scoped session.
4. **Content lifecycle.** Every piece of content has a status: `draft → published → archived`. AI-generated content always starts as `draft` (Decision 4).
5. **Multilingual by design.** Content rows carry a `language` code. UI translations live in the apps, not the database.
6. **Soft deletes** on user-facing data (`deleted_at`) for GDPR-friendly recovery windows; hard delete via scheduled cleanup.
7. **No billing concepts** (Decision 6) — but nothing in this schema would need to change to add a `plans` table keyed on `family_id` later.

---

## 2. Entity Overview

```
auth.users (Supabase-managed)
    │ 1:1
    ▼
profiles ──────────┐
                   │ membership (role: owner / co_parent / viewer)
                   ▼
              family_members ──► families
                                    │ 1:many
                    ┌───────────────┼────────────────┐
                    ▼               ▼                ▼
                students         contents        (future: plans, invites)
                    │               │ 1:many
                    │               ▼
                    │            questions ──► question_options
                    │               │
      ┌─────────────┤               │
      ▼             ▼               │
student_devices  assignments ◄──────┘ (via content_id)
device_link_codes   │ 1:many
                    ▼
                 responses ──► (references questions)
```

---

## 3. Tables

### 3.1 `profiles` — parent/guardian accounts
Extends Supabase `auth.users` (1:1). Created by trigger on signup.

```sql
create table profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  full_name     text not null default '',
  language      text not null default 'fr' check (language in ('en','fr','es','uk')),
  timezone      text not null default 'Europe/Paris',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
```

### 3.2 `families` — the tenancy unit

```sql
create table families (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,                -- e.g. "Famille Baudry"
  created_by    uuid not null references profiles(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz
);
```

### 3.3 `family_members` — who belongs to a family, with what role

```sql
create type family_role as enum ('owner', 'co_parent', 'viewer');

create table family_members (
  id            uuid primary key default gen_random_uuid(),
  family_id     uuid not null references families(id) on delete cascade,
  profile_id    uuid not null references profiles(id) on delete cascade,
  role          family_role not null default 'owner',
  created_at    timestamptz not null default now(),
  unique (family_id, profile_id)
);
```

**MVP:** one row — you, as `owner`. **Phase 2:** invite flow inserts `co_parent`/`viewer` rows.

Role capabilities (enforced by RLS):
| Capability | owner | co_parent | viewer |
|---|---|---|---|
| Manage family, invite members | ✅ | ❌ | ❌ |
| Create/edit content, assign | ✅ | ✅ | ❌ |
| View progress | ✅ | ✅ | ✅ |

### 3.4 `students` — the children/learners

```sql
create table students (
  id              uuid primary key default gen_random_uuid(),
  family_id       uuid not null references families(id) on delete cascade,
  first_name      text not null,
  birth_date      date,
  language        text not null default 'fr' check (language in ('en','fr','es','uk')),
  avatar_url      text,
  -- accessibility preferences, applied by the mobile app:
  settings        jsonb not null default '{
                    "font_scale": 1.25,
                    "high_contrast": false,
                    "text_to_speech": true,
                    "pin_enabled": false
                  }'::jsonb,
  pin_hash        text,                       -- bcrypt hash of optional 4-digit PIN
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz
);
```

Note: no `disability_type` column in MVP. It adds sensitive-data burden (GDPR special category) with no functional benefit — the app adapts via `settings`, not via a diagnosis label. Revisit only if a real feature needs it.

### 3.5 `device_link_codes` — one-time setup codes (Decision 7)

```sql
create table device_link_codes (
  id            uuid primary key default gen_random_uuid(),
  student_id    uuid not null references students(id) on delete cascade,
  code          text not null unique,          -- e.g. "TIGRE-7342", generated server-side
  expires_at    timestamptz not null,          -- default now() + 48h
  used_at       timestamptz,
  created_by    uuid not null references profiles(id),
  created_at    timestamptz not null default now()
);
```

Flow: parent generates code in admin panel → code displayed → entered on child's phone → Edge Function validates, creates `student_devices` row + issues a device token → code marked used.

### 3.6 `student_devices` — linked phones

```sql
create table student_devices (
  id              uuid primary key default gen_random_uuid(),
  student_id      uuid not null references students(id) on delete cascade,
  device_name     text not null default '',    -- e.g. "Samsung Galaxy A54"
  auth_user_id    uuid unique references auth.users(id), -- anonymous Supabase auth user for this device
  last_seen_at    timestamptz,
  created_at      timestamptz not null default now(),
  revoked_at      timestamptz                  -- parent can revoke a device
);
```

**How student auth works (technical):** when a link code is redeemed, the Edge Function creates a Supabase *anonymous auth user* for the device and records it here. RLS policies for student-facing tables check `auth.uid()` against `student_devices.auth_user_id`. The parent can revoke a device at any time (lost phone).

### 3.7 `contents` — lessons/exercise sets

```sql
create type content_status as enum ('draft', 'published', 'archived');

create table contents (
  id              uuid primary key default gen_random_uuid(),
  family_id       uuid not null references families(id) on delete cascade,
  title           text not null,
  description     text not null default '',
  subject         text not null default 'general',  -- 'math', 'literacy', 'life_skills', ...
  difficulty      smallint not null default 2 check (difficulty between 1 and 3), -- 1 easy, 2 medium, 3 hard
  language        text not null default 'fr' check (language in ('en','fr','es','uk')),
  status          content_status not null default 'draft',
  is_ai_generated boolean not null default false,
  ai_prompt       text,                        -- the prompt used, for reproducibility/A-B testing
  ai_model        text,                        -- e.g. 'claude-sonnet-5', for A/B comparison
  created_by      uuid not null references profiles(id),
  published_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz
);
```

`subject` stays a free string in MVP (with suggested values in the UI) rather than an enum — parents will invent categories we can't predict; we can normalize later from real data.

### 3.8 `questions`

```sql
create type question_type as enum ('multiple_choice', 'fill_in_blank', 'image_identification');

create table questions (
  id              uuid primary key default gen_random_uuid(),
  content_id      uuid not null references contents(id) on delete cascade,
  type            question_type not null,
  position        integer not null,            -- order within the content
  prompt          text not null,               -- the question text
  image_url       text,                        -- optional image shown WITH the question
  hint            text,                        -- optional hint (shown on demand / after wrong answer)
  explanation     text,                        -- shown after answering ("why")
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (content_id, position)
);
```

### 3.9 `question_options` — answers/choices

One table serves all three question types:

```sql
create table question_options (
  id              uuid primary key default gen_random_uuid(),
  question_id     uuid not null references questions(id) on delete cascade,
  position        integer not null,
  label           text not null default '',    -- choice text (MC), accepted answer (fill-in-blank)
  image_url       text,                        -- for image_identification choices
  is_correct      boolean not null default false,
  created_at      timestamptz not null default now(),
  unique (question_id, position)
);
```

Per type:
- **multiple_choice:** 2–4 options, exactly one `is_correct = true`. Text in `label`.
- **image_identification:** 2–4 options, images in `image_url`, one correct. (Question prompt like "Which one is the apple?")
- **fill_in_blank:** every row is an *accepted correct answer* (`is_correct = true`), e.g. "sept", "7". Matching is case/accent-insensitive with trimming (normalization function in DB/app).

### 3.10 `assignments` — content assigned to a student

```sql
create type assignment_status as enum ('assigned', 'in_progress', 'completed');

create table assignments (
  id              uuid primary key default gen_random_uuid(),
  student_id      uuid not null references students(id) on delete cascade,
  content_id      uuid not null references contents(id) on delete restrict,
  assigned_by     uuid not null references profiles(id),
  due_date        date,
  status          assignment_status not null default 'assigned',
  started_at      timestamptz,
  completed_at    timestamptz,
  score_correct   integer,                     -- denormalized on completion
  score_total     integer,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
```

- `on delete restrict` for `content_id`: published content that has assignments can be archived but not deleted (protects history).
- `score_*` denormalized by trigger when the last question is answered — makes the parent dashboard fast without recomputing from `responses` every time.
- Re-assigning the same content later = a new `assignments` row (retry/practice), so history is preserved.

### 3.11 `responses` — every answer the student gives

```sql
create table responses (
  id                uuid primary key default gen_random_uuid(),
  assignment_id     uuid not null references assignments(id) on delete cascade,
  question_id       uuid not null references questions(id) on delete cascade,
  selected_option_id uuid references question_options(id),  -- MC / image_identification
  text_answer       text,                                    -- fill_in_blank
  is_correct        boolean not null,
  attempt           integer not null default 1,              -- 1st try, 2nd try...
  time_spent_seconds integer,
  answered_at       timestamptz not null default now(),
  unique (assignment_id, question_id, attempt)
);
```

Captures everything Decision "track all of the above" needs: what he answered, correct or not, how long it took, how many attempts, when.

### 3.12 `ai_generations` — audit log of AI content generation

```sql
create table ai_generations (
  id              uuid primary key default gen_random_uuid(),
  family_id       uuid not null references families(id) on delete cascade,
  requested_by    uuid not null references profiles(id),
  prompt          text not null,
  model           text not null,
  raw_response    jsonb,                       -- what the AI returned, before edits
  content_id      uuid references contents(id) on delete set null, -- resulting draft
  status          text not null default 'pending' check (status in ('pending','succeeded','failed')),
  error           text,
  created_at      timestamptz not null default now()
);
```

Purpose: A/B testing data (compare models), debugging bad generations, and future usage quotas without schema change.

---

## 4. Row Level Security (RLS) Policies

All tables have RLS **enabled**; no default access. Helper functions:

```sql
-- Families the current (parent) user belongs to
create function my_family_ids() returns setof uuid
language sql stable security definer as $$
  select family_id from family_members where profile_id = auth.uid();
$$;

-- The student linked to the current (device) user, if any
create function my_student_id() returns uuid
language sql stable security definer as $$
  select student_id from student_devices
  where auth_user_id = auth.uid() and revoked_at is null;
$$;
```

### Policy matrix (summary)

| Table | Parent (family member) | Student device |
|---|---|---|
| `profiles` | own row: read/write | — |
| `families` | member: read; owner: write | — |
| `family_members` | member: read; owner: write | — |
| `students` | family: read/write per role | own student row: read only |
| `student_devices` | family: read/write (revoke) | own row: read |
| `device_link_codes` | family: create/read | — (redeemed via Edge Function) |
| `contents` | family: read/write per role | read only, only `published` AND assigned to them |
| `questions`, `question_options` | via content's family | via assigned published content |
| `assignments` | family: read/write | own: read + update status fields |
| `responses` | family: read | own: insert + read |
| `ai_generations` | family: read; creator: insert | — |

Example policy (contents, student side):

```sql
create policy student_read_assigned_content on contents
for select using (
  status = 'published'
  and id in (
    select content_id from assignments where student_id = my_student_id()
  )
);
```

**Critical detail — answers must not leak:** the student app must not be able to read `is_correct` on `question_options` before answering, or a curious helper could cheat. Solution: student-facing reads go through a **view** (`student_question_options`) that excludes `is_correct`; answer checking happens in a small Edge Function (or `security definer` DB function) `submit_answer(assignment_id, question_id, option_id | text)` which returns `{ correct, explanation }` and writes the `responses` row server-side. This also guarantees `is_correct` in `responses` is trustworthy.

---

## 5. Triggers & Functions

1. **`handle_new_user()`** — on `auth.users` insert: create `profiles` row; create a default family + `owner` membership on first login (or via onboarding flow).
2. **`touch_updated_at()`** — standard `updated_at` maintenance on all mutable tables.
3. **`submit_answer(...)`** — security-definer function: validates the device owns the assignment, checks correctness server-side (with text normalization for fill-in-blank), inserts `responses`, updates `assignments.status/started_at`, and when the last question is answered sets `completed_at` + denormalized scores.
4. **`redeem_link_code(code, device_name)`** — Edge Function: validates code, creates anonymous auth user + `student_devices` row, marks code used.
5. **`normalize_answer(text)`** — lowercase, trim, strip accents (for fill-in-blank matching: "Sept " matches "sept").

---

## 6. Storage Buckets (Supabase Storage)

| Bucket | Contents | Access |
|---|---|---|
| `question-images` | images for questions/options | family members: write; linked devices: read (via signed URLs or RLS-checked paths `family_id/...`) |
| `avatars` | student avatars | same pattern |

Path convention: `{family_id}/{uuid}.webp` — RLS on storage.objects checks the `family_id` prefix against `my_family_ids()`. Images resized client-side before upload (max ~1600px) to keep storage and bandwidth small.

---

## 7. Indexes (beyond primary/unique keys)

```sql
create index on family_members (profile_id);
create index on students (family_id);
create index on contents (family_id, status);
create index on questions (content_id, position);
create index on question_options (question_id);
create index on assignments (student_id, status);
create index on assignments (content_id);
create index on responses (assignment_id);
create index on responses (question_id);
create index on student_devices (auth_user_id) where revoked_at is null;
create index on device_link_codes (code) where used_at is null;
```

---

## 8. What This Schema Deliberately Postpones

| Future feature | How it lands without restructuring |
|---|---|
| Co-parent invites (Phase 2) | new rows in `family_members` + an `invites` table |
| Plans/quotas/billing | new `plans` table keyed on `family_id`; `ai_generations` already counts usage |
| New question types (2027+) | extend `question_type` enum; `question_options` is generic |
| Content sharing between families | add `visibility` to `contents` + a `content_imports` table |
| Educator/classroom mode | a family *is* the tenancy unit — a "class" becomes a family with many students and a `teacher` role |
| Ukrainian etc. | add `'uk'` content; language checks are already in place |

---

## 9. Open Points for Review

1. **Attempts policy:** should Arthur get multiple attempts per question (current schema supports it — `attempt` column), and does the score count first attempt only? *Proposed: allow retry after wrong answer with hint, score = first attempt.*
2. **Due dates:** soft (informational) or hard (assignment locks after due date)? *Proposed: soft — nothing ever "locks" for the child.*
3. **Timezone for streaks/stats:** compute daily stats in the student's timezone (Europe/Paris initially). *Proposed: store family timezone, done.*
```
