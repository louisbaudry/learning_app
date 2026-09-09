-- Performance-advisor fixes:
--   - RLS policies that called auth.uid() directly are rewritten to
--     (select auth.uid()), so Postgres evaluates it once per query instead
--     of once per row (auth_rls_initplan lint). Policies that already went
--     through my_family_ids()/my_student_id() were unaffected — those
--     stable security-definer functions already get this treatment.
--   - Missing covering indexes on foreign keys (unindexed_foreign_keys lint).
--
-- Not fixed here (accepted tradeoffs for a single-family MVP, revisit if
-- usage ever justifies it): multiple_permissive_policies (family vs. student
-- SELECT/UPDATE kept as separate policies for readability) and
-- auth_db_connections_absolute (Auth pool sizing, unrelated to this schema).

create index on ai_generations (content_id);
create index on ai_generations (family_id);
create index on ai_generations (requested_by);
create index on assignments (assigned_by);
create index on contents (created_by);
create index on device_link_codes (created_by);
create index on device_link_codes (student_id);
create index on families (created_by);
create index on responses (selected_option_id);
create index on student_devices (student_id);

drop policy profiles_select_own on profiles;
create policy profiles_select_own on profiles for select using (id = (select auth.uid()));

drop policy profiles_update_own on profiles;
create policy profiles_update_own on profiles for update using (id = (select auth.uid()));

drop policy families_update_owner on families;
create policy families_update_owner on families for update using (
  id in (select family_id from family_members where profile_id = (select auth.uid()) and role = 'owner')
);

drop policy family_members_insert_owner on family_members;
create policy family_members_insert_owner on family_members for insert with check (
  family_id in (select family_id from family_members where profile_id = (select auth.uid()) and role = 'owner')
);

drop policy family_members_update_owner on family_members;
create policy family_members_update_owner on family_members for update using (
  family_id in (select family_id from family_members where profile_id = (select auth.uid()) and role = 'owner')
);

drop policy family_members_delete_owner on family_members;
create policy family_members_delete_owner on family_members for delete using (
  family_id in (select family_id from family_members where profile_id = (select auth.uid()) and role = 'owner')
);

drop policy students_insert_family on students;
create policy students_insert_family on students for insert with check (
  family_id in (select family_id from family_members where profile_id = (select auth.uid()) and role in ('owner','co_parent'))
);

drop policy students_update_family on students;
create policy students_update_family on students for update using (
  family_id in (select family_id from family_members where profile_id = (select auth.uid()) and role in ('owner','co_parent'))
);

drop policy students_delete_family on students;
create policy students_delete_family on students for delete using (
  family_id in (select family_id from family_members where profile_id = (select auth.uid()) and role in ('owner','co_parent'))
);

drop policy device_link_codes_insert_family on device_link_codes;
create policy device_link_codes_insert_family on device_link_codes for insert with check (
  created_by = (select auth.uid())
  and student_id in (
    select id from students
    where family_id in (select family_id from family_members where profile_id = (select auth.uid()) and role in ('owner','co_parent'))
  )
);

drop policy student_devices_select on student_devices;
create policy student_devices_select on student_devices for select using (
  student_id in (select id from students where family_id in (select my_family_ids()))
  or auth_user_id = (select auth.uid())
);

drop policy student_devices_update_family on student_devices;
create policy student_devices_update_family on student_devices for update using (
  student_id in (
    select id from students
    where family_id in (select family_id from family_members where profile_id = (select auth.uid()) and role in ('owner','co_parent'))
  )
);

drop policy contents_insert_family on contents;
create policy contents_insert_family on contents for insert with check (
  family_id in (select family_id from family_members where profile_id = (select auth.uid()) and role in ('owner','co_parent'))
);

drop policy contents_update_family on contents;
create policy contents_update_family on contents for update using (
  family_id in (select family_id from family_members where profile_id = (select auth.uid()) and role in ('owner','co_parent'))
);

drop policy contents_delete_family on contents;
create policy contents_delete_family on contents for delete using (
  family_id in (select family_id from family_members where profile_id = (select auth.uid()) and role in ('owner','co_parent'))
);

drop policy questions_insert_family on questions;
create policy questions_insert_family on questions for insert with check (
  content_id in (
    select id from contents
    where family_id in (select family_id from family_members where profile_id = (select auth.uid()) and role in ('owner','co_parent'))
  )
);

drop policy questions_update_family on questions;
create policy questions_update_family on questions for update using (
  content_id in (
    select id from contents
    where family_id in (select family_id from family_members where profile_id = (select auth.uid()) and role in ('owner','co_parent'))
  )
);

drop policy questions_delete_family on questions;
create policy questions_delete_family on questions for delete using (
  content_id in (
    select id from contents
    where family_id in (select family_id from family_members where profile_id = (select auth.uid()) and role in ('owner','co_parent'))
  )
);

drop policy question_options_insert_family on question_options;
create policy question_options_insert_family on question_options for insert with check (
  question_id in (
    select id from questions
    where content_id in (
      select id from contents
      where family_id in (select family_id from family_members where profile_id = (select auth.uid()) and role in ('owner','co_parent'))
    )
  )
);

drop policy question_options_update_family on question_options;
create policy question_options_update_family on question_options for update using (
  question_id in (
    select id from questions
    where content_id in (
      select id from contents
      where family_id in (select family_id from family_members where profile_id = (select auth.uid()) and role in ('owner','co_parent'))
    )
  )
);

drop policy question_options_delete_family on question_options;
create policy question_options_delete_family on question_options for delete using (
  question_id in (
    select id from questions
    where content_id in (
      select id from contents
      where family_id in (select family_id from family_members where profile_id = (select auth.uid()) and role in ('owner','co_parent'))
    )
  )
);

drop policy assignments_insert_family on assignments;
create policy assignments_insert_family on assignments for insert with check (
  student_id in (
    select id from students
    where family_id in (select family_id from family_members where profile_id = (select auth.uid()) and role in ('owner','co_parent'))
  )
);

drop policy assignments_update_family on assignments;
create policy assignments_update_family on assignments for update using (
  student_id in (
    select id from students
    where family_id in (select family_id from family_members where profile_id = (select auth.uid()) and role in ('owner','co_parent'))
  )
);

drop policy ai_generations_insert_creator on ai_generations;
create policy ai_generations_insert_creator on ai_generations for insert with check (
  requested_by = (select auth.uid()) and family_id in (select my_family_ids())
);
