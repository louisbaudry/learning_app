-- Fixes a real, confirmed production bug: none of the 7 functions below had
-- an explicit search_path, so in a context where the caller's search_path
-- doesn't include `public` (notably: the auth.users trigger that fires
-- handle_new_user() on every signup), unqualified table names like
-- `profiles` fail to resolve. Postgres logs showed exactly this:
--   relation "profiles" does not exist
-- meaning every parent signup has been failing since the schema was first
-- deployed (2026-09-06) -- caught 2026-09-15 while trying to create the
-- first real account. Also flagged by Supabase's own security advisor as
-- "Function Search Path Mutable" (WARN) for all 7.
--
-- Fix: pin search_path explicitly on each function, matching Supabase's
-- recommended remediation (https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable).
alter function my_family_ids() set search_path = public, pg_temp;
alter function my_student_id() set search_path = public, pg_temp;
alter function normalize_answer(text) set search_path = public, pg_temp;
alter function touch_updated_at() set search_path = public, pg_temp;
alter function handle_new_user() set search_path = public, pg_temp;
alter function submit_answer(uuid, uuid, uuid, text) set search_path = public, pg_temp;
alter function insert_ai_lesson(uuid, text, text, text, smallint, curriculum_cycle, text, text, text, text, jsonb) set search_path = public, pg_temp;

-- Also flagged: handle_new_user() was callable directly via
-- /rest/v1/rpc/handle_new_user by anon/authenticated -- it's meant to run
-- only as the auth.users insert trigger (security definer, no auth.uid()
-- check of its own, so a direct anon call could create/overwrite an
-- arbitrary profiles row for any id). It needs no public API surface.
revoke execute on function handle_new_user() from anon, authenticated;
