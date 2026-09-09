-- Core tenancy tables: parents, families, membership, students, device linking.
-- DATABASE_SCHEMA.md §3.1-3.6

create table profiles (
  id                  uuid primary key references auth.users(id) on delete cascade,
  full_name           text not null default '',
  language            text not null default 'fr' check (language in ('en','fr','es','uk')),
  timezone            text not null default 'Europe/Paris',
  terms_accepted_at   timestamptz,          -- GDPR Art. 5(2) accountability (https://gdpr-info.eu/art-5-gdpr/)
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create table families (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  created_by    uuid not null references profiles(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz
);

create table family_members (
  id            uuid primary key default gen_random_uuid(),
  family_id     uuid not null references families(id) on delete cascade,
  profile_id    uuid not null references profiles(id) on delete cascade,
  role          family_role not null default 'owner',
  created_at    timestamptz not null default now(),
  unique (family_id, profile_id)
);

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
  learner_notes   text,                     -- free text by parent; never diagnosis/medical data (no disability_type column, GDPR Art. 9)
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz
);

create table device_link_codes (
  id            uuid primary key default gen_random_uuid(),
  student_id    uuid not null references students(id) on delete cascade,
  code          text not null unique,
  expires_at    timestamptz not null,
  used_at       timestamptz,
  created_by    uuid not null references profiles(id),
  created_at    timestamptz not null default now()
);

create table student_devices (
  id              uuid primary key default gen_random_uuid(),
  student_id      uuid not null references students(id) on delete cascade,
  device_name     text not null default '',
  auth_user_id    uuid unique references auth.users(id), -- anonymous Supabase auth user for this device
  last_seen_at    timestamptz,
  created_at      timestamptz not null default now(),
  revoked_at      timestamptz
);
