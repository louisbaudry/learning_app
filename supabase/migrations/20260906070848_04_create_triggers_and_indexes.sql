-- ============================================================
-- TRIGGERS FOR UPDATED_AT MAINTENANCE
-- ============================================================
create trigger profiles_touch_updated_at before update on profiles
  for each row execute function touch_updated_at();

create trigger families_touch_updated_at before update on families
  for each row execute function touch_updated_at();

create trigger students_touch_updated_at before update on students
  for each row execute function touch_updated_at();

create trigger contents_touch_updated_at before update on contents
  for each row execute function touch_updated_at();

create trigger questions_touch_updated_at before update on questions
  for each row execute function touch_updated_at();

create trigger question_options_touch_updated_at before update on question_options
  for each row execute function touch_updated_at();

create trigger assignments_touch_updated_at before update on assignments
  for each row execute function touch_updated_at();

-- ============================================================
-- TRIGGER FOR NEW USER CREATION
-- ============================================================
create trigger handle_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ============================================================
-- INDEXES
-- ============================================================
create index idx_family_members_profile_id on family_members (profile_id);
create index idx_students_family_id on students (family_id);
create index idx_contents_family_id_status on contents (family_id, status);
create index idx_questions_content_id_position on questions (content_id, position);
create index idx_question_options_question_id on question_options (question_id);
create index idx_assignments_student_id_status on assignments (student_id, status);
create index idx_assignments_content_id on assignments (content_id);
create index idx_responses_assignment_id on responses (assignment_id);
create index idx_responses_question_id on responses (question_id);
create index idx_student_devices_auth_user_id on student_devices (auth_user_id) where revoked_at is null;
create index idx_device_link_codes_code on device_link_codes (code) where used_at is null;
