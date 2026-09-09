-- DATABASE_SCHEMA.md §7, beyond primary/unique keys.

create index on family_members (profile_id);
create index on students (family_id);
create index on contents (family_id, status);
create index on questions (content_id, position);
create index on question_options (question_id);
create index on assignments (student_id, status);
create index on assignments (content_id);
create index on responses (assignment_id);
create index on responses (question_id);
create index on student_devices (auth_user_id) where revoked_at is null;
create index on device_link_codes (code) where used_at is null;
