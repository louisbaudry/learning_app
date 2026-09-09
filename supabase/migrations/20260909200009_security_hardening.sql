-- Fixes for findings from Supabase's security advisor after the initial
-- schema migrations:
--   - functions without a pinned search_path (mutable search_path lint)
--   - unaccent installed in public rather than a dedicated extensions schema
--   - anon/authenticated could call security-definer functions never meant
--     to be invoked directly over RPC (handle_new_user is trigger-only;
--     my_family_ids/my_student_id are RLS-policy helpers, not public RPCs)
--
-- student_question_options intentionally still trips the "security definer
-- view" lint — that's the mechanism described in the RLS migration for
-- hiding question_options.is_correct from the student app, not a bug.

create schema if not exists extensions;
alter extension unaccent set schema extensions;

alter function my_family_ids() set search_path = public;
alter function my_student_id() set search_path = public;
alter function touch_updated_at() set search_path = public;
alter function guard_assignment_student_update() set search_path = public;
alter function normalize_answer(text) set search_path = public, extensions;

revoke execute on function handle_new_user() from public, anon, authenticated;
revoke execute on function my_family_ids() from public, anon;
revoke execute on function my_student_id() from public, anon;
revoke execute on function submit_answer(uuid, uuid, uuid, text) from anon;

grant execute on function my_family_ids() to authenticated;
grant execute on function my_student_id() to authenticated;
