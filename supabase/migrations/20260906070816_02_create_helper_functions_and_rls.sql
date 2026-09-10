-- Step 0: Enable required extensions
create extension if not exists unaccent;

-- Step 1: Enable RLS on all tables
alter table profiles enable row level security;
alter table families enable row level security;
alter table family_members enable row level security;
alter table students enable row level security;
alter table student_devices enable row level security;
alter table device_link_codes enable row level security;
alter table contents enable row level security;
alter table questions enable row level security;
alter table question_options enable row level security;
alter table assignments enable row level security;
alter table responses enable row level security;
alter table ai_generations enable row level security;

-- Step 2: Create helper functions
create function my_family_ids() returns setof uuid
language sql stable security definer as $$
  select family_id from family_members where profile_id = auth.uid();
$$;

create function my_student_id() returns uuid
language sql stable security definer as $$
  select student_id from student_devices
  where auth_user_id = auth.uid() and revoked_at is null;
$$;

create function normalize_answer(answer text) returns text
language sql immutable as $$
  select trim(lower(unaccent(coalesce(answer, ''))));
$$;

-- Step 3: Create touch_updated_at trigger function
create function touch_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Step 4: Create handle_new_user function
create function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''));
  return new;
end;
$$ language plpgsql security definer;

-- Step 5: Create submit_answer function (security definer for server-side validation)
create function submit_answer(
  p_assignment_id uuid,
  p_question_id uuid,
  p_selected_option_id uuid default null,
  p_text_answer text default null
)
returns jsonb
language plpgsql security definer as $$
declare
  v_student_id uuid;
  v_is_correct boolean;
  v_attempt integer;
  v_total_questions integer;
  v_answered_questions integer;
  v_explanation text;
  v_score_correct integer;
  v_score_total integer;
begin
  -- Verify the device owns this assignment
  v_student_id := my_student_id();
  if v_student_id is null then
    raise exception 'Not authenticated as a student device';
  end if;

  if not exists (
    select 1 from assignments
    where id = p_assignment_id and student_id = v_student_id
  ) then
    raise exception 'Assignment not found or not owned by this device';
  end if;

  -- Get the current attempt number
  v_attempt := coalesce((
    select max(attempt) from responses
    where assignment_id = p_assignment_id and question_id = p_question_id
  ), 0) + 1;

  -- Determine correctness
  if p_selected_option_id is not null then
    -- Multiple choice or image identification
    select is_correct, explanation
    into v_is_correct, v_explanation
    from question_options
    where id = p_selected_option_id;
  else
    -- Fill in blank - check if text matches any correct option (case/accent insensitive)
    select exists(
      select 1 from question_options
      where question_id = p_question_id
        and is_correct = true
        and normalize_answer(label) = normalize_answer(p_text_answer)
    ),
    (select explanation from questions where id = p_question_id)
    into v_is_correct, v_explanation;
  end if;

  -- Insert the response
  insert into responses (
    assignment_id,
    question_id,
    selected_option_id,
    text_answer,
    is_correct,
    attempt
  ) values (
    p_assignment_id,
    p_question_id,
    p_selected_option_id,
    p_text_answer,
    v_is_correct,
    v_attempt
  );

  -- Update assignment status if not already started
  update assignments
  set status = 'in_progress', started_at = now()
  where id = p_assignment_id and status = 'assigned';

  -- Check if all questions answered
  select count(*) into v_total_questions
  from questions where content_id = (
    select content_id from assignments where id = p_assignment_id
  );

  select count(distinct question_id) into v_answered_questions
  from responses
  where assignment_id = p_assignment_id and attempt = 1;

  -- If last question, calculate and denormalize scores
  if v_answered_questions >= v_total_questions then
    select count(*) into v_score_correct
    from responses
    where assignment_id = p_assignment_id and attempt = 1 and is_correct = true;

    v_score_total := v_total_questions;

    update assignments
    set
      status = 'completed',
      completed_at = now(),
      score_correct = v_score_correct,
      score_total = v_score_total
    where id = p_assignment_id;
  end if;

  return jsonb_build_object(
    'correct', v_is_correct,
    'explanation', v_explanation,
    'attempt', v_attempt
  );
end;
$$;

-- Step 6: Create student_question_options view (excludes is_correct)
create view student_question_options as
select
  id,
  question_id,
  position,
  label,
  image_url,
  image_alt_text,
  created_at
from question_options;
