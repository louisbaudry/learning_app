-- ============================================================
-- PROFILES POLICIES
-- ============================================================
create policy profiles_own_read on profiles
  for select using (auth.uid() = id);

create policy profiles_own_write on profiles
  for update using (auth.uid() = id)
  with check (auth.uid() = id);

-- ============================================================
-- FAMILIES POLICIES
-- ============================================================
create policy families_member_read on families
  for select using (id in (select * from my_family_ids()));

create policy families_owner_write on families
  for update using (
    id in (
      select family_id from family_members
      where profile_id = auth.uid() and role = 'owner'
    )
  )
  with check (
    id in (
      select family_id from family_members
      where profile_id = auth.uid() and role = 'owner'
    )
  );

create policy families_owner_delete on families
  for delete using (
    id in (
      select family_id from family_members
      where profile_id = auth.uid() and role = 'owner'
    )
  );

-- ============================================================
-- FAMILY_MEMBERS POLICIES
-- ============================================================
create policy family_members_read on family_members
  for select using (family_id in (select * from my_family_ids()));

create policy family_members_owner_write on family_members
  for insert with check (
    family_id in (
      select family_id from family_members
      where profile_id = auth.uid() and role = 'owner'
    )
  );

create policy family_members_owner_update on family_members
  for update using (
    family_id in (
      select family_id from family_members
      where profile_id = auth.uid() and role = 'owner'
    )
  )
  with check (
    family_id in (
      select family_id from family_members
      where profile_id = auth.uid() and role = 'owner'
    )
  );

create policy family_members_owner_delete on family_members
  for delete using (
    family_id in (
      select family_id from family_members
      where profile_id = auth.uid() and role = 'owner'
    )
  );

-- ============================================================
-- STUDENTS POLICIES (Parent side)
-- ============================================================
create policy students_parent_read on students
  for select using (family_id in (select * from my_family_ids()));

create policy students_parent_write on students
  for insert with check (family_id in (select * from my_family_ids()));

create policy students_parent_update on students
  for update using (family_id in (select * from my_family_ids()))
  with check (family_id in (select * from my_family_ids()));

-- ============================================================
-- STUDENTS POLICIES (Student device side)
-- ============================================================
create policy students_device_own_read on students
  for select using (id = my_student_id());

-- ============================================================
-- STUDENT_DEVICES POLICIES (Parent side)
-- ============================================================
create policy student_devices_parent_read on student_devices
  for select using (
    student_id in (
      select id from students where family_id in (select * from my_family_ids())
    )
  );

create policy student_devices_parent_write on student_devices
  for update using (
    student_id in (
      select id from students where family_id in (select * from my_family_ids())
    )
  )
  with check (
    student_id in (
      select id from students where family_id in (select * from my_family_ids())
    )
  );

-- ============================================================
-- STUDENT_DEVICES POLICIES (Student device side)
-- ============================================================
create policy student_devices_own_read on student_devices
  for select using (auth_user_id = auth.uid());

-- ============================================================
-- DEVICE_LINK_CODES POLICIES
-- ============================================================
create policy device_link_codes_parent_read on device_link_codes
  for select using (
    student_id in (
      select id from students where family_id in (select * from my_family_ids())
    )
  );

create policy device_link_codes_parent_create on device_link_codes
  for insert with check (
    student_id in (
      select id from students where family_id in (select * from my_family_ids())
    )
  );

-- ============================================================
-- CONTENTS POLICIES (Parent side)
-- ============================================================
create policy contents_parent_read on contents
  for select using (family_id in (select * from my_family_ids()));

create policy contents_parent_write on contents
  for insert with check (family_id in (select * from my_family_ids()));

create policy contents_parent_update on contents
  for update using (family_id in (select * from my_family_ids()))
  with check (family_id in (select * from my_family_ids()));

-- ============================================================
-- CONTENTS POLICIES (Student device side - published only)
-- ============================================================
create policy contents_student_read on contents
  for select using (
    status = 'published'
    and id in (
      select content_id from assignments where student_id = my_student_id()
    )
  );

-- ============================================================
-- QUESTIONS POLICIES (Parent side)
-- ============================================================
create policy questions_parent_read on questions
  for select using (
    content_id in (
      select id from contents where family_id in (select * from my_family_ids())
    )
  );

create policy questions_parent_write on questions
  for insert with check (
    content_id in (
      select id from contents where family_id in (select * from my_family_ids())
    )
  );

create policy questions_parent_update on questions
  for update using (
    content_id in (
      select id from contents where family_id in (select * from my_family_ids())
    )
  )
  with check (
    content_id in (
      select id from contents where family_id in (select * from my_family_ids())
    )
  );

-- ============================================================
-- QUESTIONS POLICIES (Student device side)
-- ============================================================
create policy questions_student_read on questions
  for select using (
    content_id in (
      select content_id from assignments where student_id = my_student_id()
    )
  );

-- ============================================================
-- QUESTION_OPTIONS POLICIES (Parent side)
-- ============================================================
create policy question_options_parent_read on question_options
  for select using (
    question_id in (
      select id from questions
      where content_id in (
        select id from contents where family_id in (select * from my_family_ids())
      )
    )
  );

create policy question_options_parent_write on question_options
  for insert with check (
    question_id in (
      select id from questions
      where content_id in (
        select id from contents where family_id in (select * from my_family_ids())
      )
    )
  );

create policy question_options_parent_update on question_options
  for update using (
    question_id in (
      select id from questions
      where content_id in (
        select id from contents where family_id in (select * from my_family_ids())
      )
    )
  )
  with check (
    question_id in (
      select id from questions
      where content_id in (
        select id from contents where family_id in (select * from my_family_ids())
      )
    )
  );

-- ============================================================
-- QUESTION_OPTIONS POLICIES (Student device side - secure)
-- ============================================================
create policy question_options_student_read on question_options
  for select using (
    question_id in (
      select id from questions
      where content_id in (
        select content_id from assignments where student_id = my_student_id()
      )
    )
  );

-- ============================================================
-- ASSIGNMENTS POLICIES (Parent side)
-- ============================================================
create policy assignments_parent_read on assignments
  for select using (
    student_id in (
      select id from students where family_id in (select * from my_family_ids())
    )
  );

create policy assignments_parent_write on assignments
  for insert with check (
    student_id in (
      select id from students where family_id in (select * from my_family_ids())
    )
  );

create policy assignments_parent_update on assignments
  for update using (
    student_id in (
      select id from students where family_id in (select * from my_family_ids())
    )
  )
  with check (
    student_id in (
      select id from students where family_id in (select * from my_family_ids())
    )
  );

-- ============================================================
-- ASSIGNMENTS POLICIES (Student device side)
-- ============================================================
create policy assignments_student_read on assignments
  for select using (student_id = my_student_id());

create policy assignments_student_update_status on assignments
  for update using (student_id = my_student_id())
  with check (student_id = my_student_id());

-- ============================================================
-- RESPONSES POLICIES (Parent side - read only)
-- ============================================================
create policy responses_parent_read on responses
  for select using (
    assignment_id in (
      select id from assignments
      where student_id in (
        select id from students where family_id in (select * from my_family_ids())
      )
    )
  );

-- ============================================================
-- RESPONSES POLICIES (Student device side)
-- ============================================================
create policy responses_student_insert on responses
  for insert with check (
    assignment_id in (
      select id from assignments where student_id = my_student_id()
    )
  );

create policy responses_student_read on responses
  for select using (
    assignment_id in (
      select id from assignments where student_id = my_student_id()
    )
  );

-- ============================================================
-- AI_GENERATIONS POLICIES
-- ============================================================
create policy ai_generations_family_read on ai_generations
  for select using (family_id in (select * from my_family_ids()));

create policy ai_generations_family_create on ai_generations
  for insert with check (family_id in (select * from my_family_ids()));
