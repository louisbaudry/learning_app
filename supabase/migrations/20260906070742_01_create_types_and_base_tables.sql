-- Step 1: Create custom types (enums)
create type family_role as enum ('owner', 'co_parent', 'viewer');
create type content_status as enum ('draft', 'published', 'archived');
create type curriculum_cycle as enum ('cycle_1', 'cycle_2', 'cycle_3', 'cycle_4');
create type question_type as enum ('multiple_choice', 'fill_in_blank', 'image_identification');
create type assignment_status as enum ('assigned', 'in_progress', 'completed');

-- Step 2: Create profiles table (extends auth.users)
create table profiles (
  id                  uuid primary key references auth.users(id) on delete cascade,
  full_name           text not null default '',
  language            text not null default 'fr' check (language in ('en','fr','es','uk')),
  timezone            text not null default 'Europe/Paris',
  terms_accepted_at   timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- Step 3: Create families table
create table families (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  created_by    uuid not null references profiles(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz
);

-- Step 4: Create family_members table
create table family_members (
  id            uuid primary key default gen_random_uuid(),
  family_id     uuid not null references families(id) on delete cascade,
  profile_id    uuid not null references profiles(id) on delete cascade,
  role          family_role not null default 'owner',
  created_at    timestamptz not null default now(),
  unique (family_id, profile_id)
);

-- Step 5: Create students table
create table students (
  id              uuid primary key default gen_random_uuid(),
  family_id       uuid not null references families(id) on delete cascade,
  first_name      text not null,
  birth_date      date,
  language        text not null default 'fr' check (language in ('en','fr','es','uk')),
  avatar_url      text,
  settings        jsonb not null default '{
                    "font_scale": 1.25,
                    "high_contrast": false,
                    "text_to_speech": true,
                    "pin_enabled": false
                  }'::jsonb,
  pin_hash        text,
  learner_notes   text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz
);

-- Step 6: Create device_link_codes table
create table device_link_codes (
  id            uuid primary key default gen_random_uuid(),
  student_id    uuid not null references students(id) on delete cascade,
  code          text not null unique,
  expires_at    timestamptz not null,
  used_at       timestamptz,
  created_by    uuid not null references profiles(id),
  created_at    timestamptz not null default now()
);

-- Step 7: Create student_devices table
create table student_devices (
  id              uuid primary key default gen_random_uuid(),
  student_id      uuid not null references students(id) on delete cascade,
  device_name     text not null default '',
  auth_user_id    uuid unique references auth.users(id),
  last_seen_at    timestamptz,
  created_at      timestamptz not null default now(),
  revoked_at      timestamptz
);

-- Step 8: Create contents table
create table contents (
  id              uuid primary key default gen_random_uuid(),
  family_id       uuid not null references families(id) on delete cascade,
  title           text not null,
  description     text not null default '',
  subject         text not null default 'general',
  difficulty      smallint not null default 2 check (difficulty between 1 and 3),
  curriculum_cycle curriculum_cycle,
  curriculum_domain text,
  language        text not null default 'fr' check (language in ('en','fr','es','uk')),
  status          content_status not null default 'draft',
  is_ai_generated boolean not null default false,
  ai_prompt       text,
  ai_model        text,
  created_by      uuid not null references profiles(id),
  published_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz
);

-- Step 9: Create questions table
create table questions (
  id              uuid primary key default gen_random_uuid(),
  content_id      uuid not null references contents(id) on delete cascade,
  type            question_type not null,
  position        integer not null,
  prompt          text not null,
  image_url       text,
  image_alt_text  text,
  hint            text,
  explanation     text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (content_id, position)
);

-- Step 10: Create question_options table
create table question_options (
  id              uuid primary key default gen_random_uuid(),
  question_id     uuid not null references questions(id) on delete cascade,
  position        integer not null,
  label           text not null default '',
  image_url       text,
  image_alt_text  text,
  is_correct      boolean not null default false,
  created_at      timestamptz not null default now(),
  unique (question_id, position)
);

-- Step 11: Create assignments table
create table assignments (
  id              uuid primary key default gen_random_uuid(),
  student_id      uuid not null references students(id) on delete cascade,
  content_id      uuid not null references contents(id) on delete restrict,
  assigned_by     uuid not null references profiles(id),
  due_date        date,
  status          assignment_status not null default 'assigned',
  started_at      timestamptz,
  completed_at    timestamptz,
  score_correct   integer,
  score_total     integer,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Step 12: Create responses table
create table responses (
  id                uuid primary key default gen_random_uuid(),
  assignment_id     uuid not null references assignments(id) on delete cascade,
  question_id       uuid not null references questions(id) on delete cascade,
  selected_option_id uuid references question_options(id),
  text_answer       text,
  is_correct        boolean not null,
  attempt           integer not null default 1,
  time_spent_seconds integer,
  answered_at       timestamptz not null default now(),
  unique (assignment_id, question_id, attempt)
);

-- Step 13: Create ai_generations table
create table ai_generations (
  id              uuid primary key default gen_random_uuid(),
  family_id       uuid not null references families(id) on delete cascade,
  requested_by    uuid not null references profiles(id),
  prompt          text not null,
  model           text not null,
  raw_response    jsonb,
  content_id      uuid references contents(id) on delete set null,
  status          text not null default 'pending' check (status in ('pending','succeeded','failed')),
  error           text,
  created_at      timestamptz not null default now()
);
