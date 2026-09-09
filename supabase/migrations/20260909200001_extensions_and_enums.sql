-- Extensions and enum types for the learning app schema.
-- See DATABASE_SCHEMA.md for the design this migration implements.

create extension if not exists pgcrypto;   -- gen_random_uuid()
create extension if not exists unaccent;   -- accent-insensitive fill-in-blank matching (§5.5 normalize_answer)

create type family_role as enum ('owner', 'co_parent', 'viewer');
create type content_status as enum ('draft', 'published', 'archived');
create type curriculum_cycle as enum ('cycle_1', 'cycle_2', 'cycle_3', 'cycle_4'); -- French Éduscol cycles, https://eduscol.education.gouv.fr/
create type question_type as enum ('multiple_choice', 'fill_in_blank', 'image_identification');
create type assignment_status as enum ('assigned', 'in_progress', 'completed');
