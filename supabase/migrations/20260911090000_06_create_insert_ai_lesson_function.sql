-- Supports the generate-lesson Edge Function (EDGE_FUNCTIONS.md,
-- AI_CONTENT_GENERATION.md §5): inserts a full AI-generated draft lesson
-- (contents + questions + question_options) as a single transaction, so a
-- mid-way failure can never leave an orphaned contents row with partial
-- questions. Mirrors submit_answer()'s security pattern: security definer,
-- but auth.uid() still resolves to the calling parent (the Edge Function
-- forwards their JWT, it never uses the service role key here), so RLS
-- intent is preserved even though the function itself bypasses RLS to do
-- the multi-table write atomically.
create function insert_ai_lesson(
  p_family_id uuid,
  p_title text,
  p_description text,
  p_subject text,
  p_difficulty smallint,
  p_curriculum_cycle curriculum_cycle,
  p_curriculum_domain text,
  p_language text,
  p_ai_prompt text,
  p_ai_model text,
  p_questions jsonb
)
returns uuid
language plpgsql security definer as $$
declare
  v_content_id uuid;
  v_question jsonb;
  v_question_id uuid;
  v_option jsonb;
  v_qpos integer := 0;
  v_opos integer;
begin
  -- Verify the caller is actually a member of the family they're writing to
  if p_family_id not in (select * from my_family_ids()) then
    raise exception 'Not a member of this family';
  end if;

  -- AI-generated content always lands as draft (SPECIFICATIONS.md §11
  -- Decision 4) -- never auto-published, enforced here, not just by the UI.
  insert into contents (
    family_id, title, description, subject, difficulty,
    curriculum_cycle, curriculum_domain, language,
    status, is_ai_generated, ai_prompt, ai_model, created_by
  ) values (
    p_family_id, p_title, p_description, p_subject, p_difficulty,
    p_curriculum_cycle, p_curriculum_domain, p_language,
    'draft', true, p_ai_prompt, p_ai_model, auth.uid()
  )
  returning id into v_content_id;

  for v_question in select * from jsonb_array_elements(p_questions)
  loop
    v_qpos := v_qpos + 1;
    insert into questions (content_id, type, position, prompt, hint, explanation)
    values (
      v_content_id,
      (v_question->>'type')::question_type,
      v_qpos,
      v_question->>'prompt',
      v_question->>'hint',
      v_question->>'explanation'
    )
    returning id into v_question_id;

    v_opos := 0;
    for v_option in select * from jsonb_array_elements(v_question->'options')
    loop
      v_opos := v_opos + 1;
      insert into question_options (question_id, position, label, is_correct)
      values (
        v_question_id,
        v_opos,
        v_option->>'label',
        (v_option->>'is_correct')::boolean
      );
    end loop;
  end loop;

  return v_content_id;
end;
$$;
