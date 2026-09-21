-- Fixes a gap in migration 07's fix: `revoke execute ... from anon,
-- authenticated` only removes those two roles' *own* grants. Postgres
-- grants EXECUTE to the PUBLIC pseudo-role on every function by default at
-- creation time, and every role (including anon/authenticated) implicitly
-- has whatever PUBLIC has -- so handle_new_user() was, and until this
-- migration still is, callable by anyone via /rest/v1/rpc/handle_new_user
-- despite 07's revoke, because that PUBLIC grant was never touched.
-- Confirmed live via `has_function_privilege('anon', 'handle_new_user()',
-- 'execute')` still returning true, and `pg_proc.proacl` showing an
-- untouched `=X/postgres` (PUBLIC) entry, on 2026-09-21.
revoke execute on function handle_new_user() from public;

-- Also revoke insert_ai_lesson()'s default PUBLIC grant and its (unused,
-- advisor-flagged) anon grant. It's meant to be called only by an
-- authenticated parent -- either directly, scoped by its own
-- `p_family_id not in (select * from my_family_ids())` check, or via the
-- generate-lesson Edge Function forwarding that parent's JWT (see that
-- function's header comment). It was never meant to be reachable by the
-- `anon` role (unauthenticated requests, not to be confused with an
-- anonymous-auth *signed-in* student device, which is `authenticated`).
revoke execute on function insert_ai_lesson(uuid, text, text, text, smallint, curriculum_cycle, text, text, text, text, jsonb) from public, anon;
