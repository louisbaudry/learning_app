-- Content and assessment-item tables. DATABASE_SCHEMA.md §3.7-3.9.
-- questions/question_options are shaped after IMS/1EdTech QTI 3.0's assessmentItem
-- (https://www.1edtech.org/standards/qti/index) without adopting QTI XML — Decision 11.

create table contents (
  id                uuid primary key default gen_random_uuid(),
  family_id         uuid not null references families(id) on delete cascade,
  title             text not null,
  description       text not null default '',
  subject           text not null default 'general',
  difficulty        smallint not null default 2 check (difficulty between 1 and 3),
  curriculum_cycle  curriculum_cycle,          -- optional Éduscol reference cycle, parent-chosen, purely descriptive
  curriculum_domain text,
  language          text not null default 'fr' check (language in ('en','fr','es','uk')),
  status            content_status not null default 'draft',
  is_ai_generated   boolean not null default false,
  ai_prompt         text,
  ai_model          text,
  created_by        uuid not null references profiles(id),
  published_at      timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  deleted_at        timestamptz
);

create table questions (
  id              uuid primary key default gen_random_uuid(),
  content_id      uuid not null references contents(id) on delete cascade,
  type            question_type not null,
  position        integer not null,
  prompt          text not null,
  image_url       text,
  image_alt_text  text,                        -- required by admin UI whenever image_url is set (WCAG 1.1.1)
  hint            text,
  explanation     text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (content_id, position)
);

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
