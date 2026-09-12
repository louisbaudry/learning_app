-- Fixes a bug in submit_answer() (introduced in
-- 02_create_helper_functions_and_rls): for multiple_choice/
-- image_identification answers it selected `explanation` from
-- question_options, but that table has no such column (only `questions`
-- does — see DATABASE_SCHEMA.md §3.8-3.9, explanation is per-question, not
-- per-option). This raised `column "explanation" does not exist` the first
-- time a student answered a non-fill-in-blank question. Now both branches
-- read explanation from `questions`.
create or replace function submit_answer(
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

  -- Explanation always comes from the question, regardless of type
  select explanation into v_explanation from questions where id = p_question_id;

  -- Determine correctness
  if p_selected_option_id is not null then
    -- Multiple choice or image identification
    select is_correct
    into v_is_correct
    from question_options
    where id = p_selected_option_id;
  else
    -- Fill in blank - check if text matches any correct option (case/accent insensitive)
    select exists(
      select 1 from question_options
      where question_id = p_question_id
        and is_correct = true
        and normalize_answer(label) = normalize_answer(p_text_answer)
    )
    into v_is_correct;
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
