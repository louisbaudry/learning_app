-- Helper functions, triggers, and the security-definer answer-submission
-- function. DATABASE_SCHEMA.md §4-5.

-- Families the current (parent) user belongs to.
create function my_family_ids() returns setof uuid
language sql stable security definer as $$
  select family_id from family_members where profile_id = auth.uid();
$$;

-- The student linked to the current (device) user, if any.
create function my_student_id() returns uuid
language sql stable security definer as $$
  select student_id from student_devices
  where auth_user_id = auth.uid() and revoked_at is null;
$$;

-- Standard updated_at maintenance.
create function touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger touch_updated_at before update on profiles for each row execute function touch_updated_at();
create trigger touch_updated_at before update on families for each row execute function touch_updated_at();
create trigger touch_updated_at before update on students for each row execute function touch_updated_at();
create trigger touch_updated_at before update on contents for each row execute function touch_updated_at();
create trigger touch_updated_at before update on questions for each row execute function touch_updated_at();
create trigger touch_updated_at before update on assignments for each row execute function touch_updated_at();

-- Lowercase, trim, strip accents — fill_in_blank matching ("Sept " matches "sept").
create function normalize_answer(input text)
returns text
language sql
immutable
as $$
  select trim(lower(unaccent(coalesce(input, ''))));
$$;

-- On auth.users insert: create the profiles row, plus a default family +
-- owner membership, for a real parent signup. Anonymous auth users (student
-- devices, created by the device-link-code redemption flow — Decision 7) are
-- explicitly skipped: they must never get a profiles/families row.
create function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_family_id uuid;
begin
  if coalesce(new.is_anonymous, false) then
    return new;
  end if;

  insert into profiles (id) values (new.id);

  insert into families (name, created_by)
  values ('Ma famille', new.id)
  returning id into v_family_id;

  insert into family_members (family_id, profile_id, role)
  values (v_family_id, new.id, 'owner');

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- A student device may only move an assignment through its status lifecycle
-- (policy matrix, DATABASE_SCHEMA.md §4: "student: own: update status
-- fields"). submit_answer() itself needs to set score_correct/score_total/
-- completed_at on completion, so it flags the transaction-local GUC below to
-- bypass this guard for its own trusted update.
create function guard_assignment_student_update()
returns trigger
language plpgsql
as $$
begin
  if coalesce(current_setting('app.bypass_assignment_guard', true), 'false') = 'true' then
    return new;
  end if;

  if my_student_id() is not null then
    if new.content_id is distinct from old.content_id
       or new.due_date is distinct from old.due_date
       or new.score_correct is distinct from old.score_correct
       or new.score_total is distinct from old.score_total
       or new.student_id is distinct from old.student_id
       or new.assigned_by is distinct from old.assigned_by
    then
      raise exception 'student devices may only update assignment status fields';
    end if;
  end if;

  return new;
end;
$$;

create trigger assignments_guard_student_update
  before update on assignments
  for each row execute function guard_assignment_student_update();

-- Security-definer answer submission: the student app never reads
-- question_options.is_correct directly (see student_question_options view in
-- the RLS migration) — it calls this instead. Validates the device owns the
-- assignment, checks correctness server-side, writes the responses row, and
-- denormalizes assignments.score_*/completed_at once every question in the
-- content has an eventually-correct response (retry-until-correct design,
-- Resolved Review Point 1: scoring counts attempt 1 only).
create function submit_answer(
  p_assignment_id uuid,
  p_question_id uuid,
  p_option_id uuid default null,
  p_text_answer text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_student_id uuid;
  v_content_id uuid;
  v_question_type question_type;
  v_hint text;
  v_explanation text;
  v_is_correct boolean;
  v_attempt integer;
  v_total_questions integer;
  v_answered_questions integer;
  v_score_correct integer;
begin
  select student_id, content_id into v_student_id, v_content_id
  from assignments where id = p_assignment_id;

  if v_student_id is null or v_student_id <> my_student_id() then
    raise exception 'not authorized for this assignment';
  end if;

  select type, hint, explanation into v_question_type, v_hint, v_explanation
  from questions where id = p_question_id and content_id = v_content_id;

  if v_question_type is null then
    raise exception 'question does not belong to this assignment''s content';
  end if;

  if v_question_type = 'fill_in_blank' then
    select exists (
      select 1 from question_options
      where question_id = p_question_id
        and is_correct
        and normalize_answer(label) = normalize_answer(p_text_answer)
    ) into v_is_correct;
  else
    select coalesce(is_correct, false) into v_is_correct
    from question_options
    where id = p_option_id and question_id = p_question_id;
  end if;
  v_is_correct := coalesce(v_is_correct, false);

  select coalesce(max(attempt), 0) + 1 into v_attempt
  from responses where assignment_id = p_assignment_id and question_id = p_question_id;

  insert into responses (assignment_id, question_id, selected_option_id, text_answer, is_correct, attempt)
  values (p_assignment_id, p_question_id, p_option_id, p_text_answer, v_is_correct, v_attempt);

  perform set_config('app.bypass_assignment_guard', 'true', true);

  update assignments
  set status = case when status = 'assigned' then 'in_progress' else status end,
      started_at = coalesce(started_at, now())
  where id = p_assignment_id;

  select count(*) into v_total_questions from questions where content_id = v_content_id;
  select count(distinct question_id) into v_answered_questions
  from responses where assignment_id = p_assignment_id and is_correct;

  if v_answered_questions >= v_total_questions then
    select count(*) into v_score_correct
    from responses where assignment_id = p_assignment_id and attempt = 1 and is_correct;

    update assignments
    set status = 'completed',
        completed_at = coalesce(completed_at, now()),
        score_correct = v_score_correct,
        score_total = v_total_questions
    where id = p_assignment_id;
  end if;

  return jsonb_build_object(
    'correct', v_is_correct,
    'hint', case when not v_is_correct then v_hint else null end,
    'explanation', case when v_is_correct then v_explanation else null end
  );
end;
$$;

revoke all on function submit_answer(uuid, uuid, uuid, text) from public;
grant execute on function submit_answer(uuid, uuid, uuid, text) to authenticated;

-- redeem_link_code() is deliberately NOT a DB function: creating the
-- anonymous Supabase Auth user requires the Auth Admin API, which only an
-- Edge Function (service role) can call. See DATABASE_SCHEMA.md §3.5/§5.4 —
-- that Edge Function validates device_link_codes, calls the Auth Admin API,
-- inserts the student_devices row, and marks the code used, all with the
-- service role (which bypasses RLS).
