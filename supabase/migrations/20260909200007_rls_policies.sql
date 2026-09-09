-- Row Level Security. DATABASE_SCHEMA.md §4. Every table gets RLS enabled;
-- no default access.

alter table profiles enable row level security;
alter table families enable row level security;
alter table family_members enable row level security;
alter table students enable row level security;
alter table device_link_codes enable row level security;
alter table student_devices enable row level security;
alter table contents enable row level security;
alter table questions enable row level security;
alter table question_options enable row level security;
alter table assignments enable row level security;
alter table responses enable row level security;
alter table ai_generations enable row level security;

-- profiles: own row only.
create policy profiles_select_own on profiles for select using (id = auth.uid());
create policy profiles_update_own on profiles for update using (id = auth.uid());

-- families: member read; owner write. (Row insert happens via handle_new_user(), security definer.)
create policy families_select_member on families for select using (id in (select my_family_ids()));
create policy families_update_owner on families for update using (
  id in (select family_id from family_members where profile_id = auth.uid() and role = 'owner')
);

-- family_members: member read; owner manages membership.
create policy family_members_select_member on family_members for select using (family_id in (select my_family_ids()));
create policy family_members_insert_owner on family_members for insert with check (
  family_id in (select family_id from family_members where profile_id = auth.uid() and role = 'owner')
);
create policy family_members_update_owner on family_members for update using (
  family_id in (select family_id from family_members where profile_id = auth.uid() and role = 'owner')
);
create policy family_members_delete_owner on family_members for delete using (
  family_id in (select family_id from family_members where profile_id = auth.uid() and role = 'owner')
);

-- students: family read/write per role (owner/co_parent write, viewer read-only); student device: own row, read only.
create policy students_select_family on students for select using (
  family_id in (select my_family_ids()) or id = my_student_id()
);
create policy students_insert_family on students for insert with check (
  family_id in (select family_id from family_members where profile_id = auth.uid() and role in ('owner','co_parent'))
);
create policy students_update_family on students for update using (
  family_id in (select family_id from family_members where profile_id = auth.uid() and role in ('owner','co_parent'))
);
create policy students_delete_family on students for delete using (
  family_id in (select family_id from family_members where profile_id = auth.uid() and role in ('owner','co_parent'))
);

-- device_link_codes: family create/read only; redemption goes through the Edge Function (service role).
create policy device_link_codes_select_family on device_link_codes for select using (
  student_id in (select id from students where family_id in (select my_family_ids()))
);
create policy device_link_codes_insert_family on device_link_codes for insert with check (
  created_by = auth.uid()
  and student_id in (
    select id from students
    where family_id in (select family_id from family_members where profile_id = auth.uid() and role in ('owner','co_parent'))
  )
);

-- student_devices: family read/write (revoke); device reads its own row.
create policy student_devices_select on student_devices for select using (
  student_id in (select id from students where family_id in (select my_family_ids()))
  or auth_user_id = auth.uid()
);
create policy student_devices_update_family on student_devices for update using (
  student_id in (
    select id from students
    where family_id in (select family_id from family_members where profile_id = auth.uid() and role in ('owner','co_parent'))
  )
);

-- contents: family read/write per role; student device reads only published content assigned to them.
create policy contents_select_family on contents for select using (family_id in (select my_family_ids()));
create policy contents_select_student on contents for select using (
  status = 'published'
  and id in (select content_id from assignments where student_id = my_student_id())
);
create policy contents_insert_family on contents for insert with check (
  family_id in (select family_id from family_members where profile_id = auth.uid() and role in ('owner','co_parent'))
);
create policy contents_update_family on contents for update using (
  family_id in (select family_id from family_members where profile_id = auth.uid() and role in ('owner','co_parent'))
);
create policy contents_delete_family on contents for delete using (
  family_id in (select family_id from family_members where profile_id = auth.uid() and role in ('owner','co_parent'))
);

-- questions: same shape as contents. No is_correct column here, so a direct student policy is safe.
create policy questions_select_family on questions for select using (
  content_id in (select id from contents where family_id in (select my_family_ids()))
);
create policy questions_select_student on questions for select using (
  content_id in (
    select id from contents
    where status = 'published'
      and id in (select content_id from assignments where student_id = my_student_id())
  )
);
create policy questions_insert_family on questions for insert with check (
  content_id in (
    select id from contents
    where family_id in (select family_id from family_members where profile_id = auth.uid() and role in ('owner','co_parent'))
  )
);
create policy questions_update_family on questions for update using (
  content_id in (
    select id from contents
    where family_id in (select family_id from family_members where profile_id = auth.uid() and role in ('owner','co_parent'))
  )
);
create policy questions_delete_family on questions for delete using (
  content_id in (
    select id from contents
    where family_id in (select family_id from family_members where profile_id = auth.uid() and role in ('owner','co_parent'))
  )
);

-- question_options: FAMILY ONLY at the table level — deliberately no student
-- select policy. is_correct must never be readable by the student app before
-- answering (DATABASE_SCHEMA.md §4 "Critical detail"), so student reads go
-- through the student_question_options view below instead, which is owned by
-- a bypassrls role and filters/redacts independently of this table's RLS.
create policy question_options_select_family on question_options for select using (
  question_id in (
    select id from questions
    where content_id in (select id from contents where family_id in (select my_family_ids()))
  )
);
create policy question_options_insert_family on question_options for insert with check (
  question_id in (
    select id from questions
    where content_id in (
      select id from contents
      where family_id in (select family_id from family_members where profile_id = auth.uid() and role in ('owner','co_parent'))
    )
  )
);
create policy question_options_update_family on question_options for update using (
  question_id in (
    select id from questions
    where content_id in (
      select id from contents
      where family_id in (select family_id from family_members where profile_id = auth.uid() and role in ('owner','co_parent'))
    )
  )
);
create policy question_options_delete_family on question_options for delete using (
  question_id in (
    select id from questions
    where content_id in (
      select id from contents
      where family_id in (select family_id from family_members where profile_id = auth.uid() and role in ('owner','co_parent'))
    )
  )
);

-- The answer-safe view: owned by postgres (bypassrls), so it enforces its own
-- WHERE clause and column list rather than question_options' RLS. This is
-- how a linked device can read choices/images for an assigned, published
-- question without ever seeing is_correct.
create view student_question_options
with (security_barrier = true)
as
select qo.id, qo.question_id, qo.position, qo.label, qo.image_url, qo.image_alt_text, qo.created_at
from question_options qo
join questions q on q.id = qo.question_id
join contents c on c.id = q.content_id
join assignments a on a.content_id = c.id
where c.status = 'published'
  and a.student_id = my_student_id();

grant select on student_question_options to authenticated;

-- assignments: family read/write; student device reads its own and may only
-- move status/started_at/completed_at (enforced by the guard trigger, not RLS).
create policy assignments_select_family on assignments for select using (
  student_id in (select id from students where family_id in (select my_family_ids()))
);
create policy assignments_select_student on assignments for select using (student_id = my_student_id());
create policy assignments_insert_family on assignments for insert with check (
  student_id in (
    select id from students
    where family_id in (select family_id from family_members where profile_id = auth.uid() and role in ('owner','co_parent'))
  )
);
create policy assignments_update_family on assignments for update using (
  student_id in (
    select id from students
    where family_id in (select family_id from family_members where profile_id = auth.uid() and role in ('owner','co_parent'))
  )
);
create policy assignments_update_student on assignments for update using (student_id = my_student_id())
  with check (student_id = my_student_id());

-- responses: family read; student reads own. Deliberately NO insert policy
-- for anyone — rows are written exclusively by submit_answer() (security
-- definer), which is what guarantees is_correct is trustworthy.
create policy responses_select_family on responses for select using (
  assignment_id in (
    select id from assignments where student_id in (select id from students where family_id in (select my_family_ids()))
  )
);
create policy responses_select_student on responses for select using (
  assignment_id in (select id from assignments where student_id = my_student_id())
);

-- ai_generations: family read; creator insert. Append-only audit log — no update/delete policies.
create policy ai_generations_select_family on ai_generations for select using (family_id in (select my_family_ids()));
create policy ai_generations_insert_creator on ai_generations for insert with check (
  requested_by = auth.uid() and family_id in (select my_family_ids())
);
