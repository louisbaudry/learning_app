-- Assignments, responses, and the AI-generation audit log. DATABASE_SCHEMA.md §3.10-3.12.

create table assignments (
  id              uuid primary key default gen_random_uuid(),
  student_id      uuid not null references students(id) on delete cascade,
  content_id      uuid not null references contents(id) on delete restrict, -- protects history: published+assigned content can be archived, not deleted
  assigned_by     uuid not null references profiles(id),
  due_date        date,                        -- soft: orders the feed / drives "overdue", never locks (Resolved Review Point 2)
  status          assignment_status not null default 'assigned',
  started_at      timestamptz,
  completed_at    timestamptz,
  score_correct   integer,                     -- denormalized; set by submit_answer() on completion, first attempt only
  score_total     integer,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table responses (
  id                  uuid primary key default gen_random_uuid(),
  assignment_id       uuid not null references assignments(id) on delete cascade,
  question_id         uuid not null references questions(id) on delete cascade,
  selected_option_id  uuid references question_options(id),
  text_answer         text,
  is_correct          boolean not null,
  attempt             integer not null default 1,
  time_spent_seconds  integer,
  answered_at         timestamptz not null default now(),
  unique (assignment_id, question_id, attempt)
);

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
