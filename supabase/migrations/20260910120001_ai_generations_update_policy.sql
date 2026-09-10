-- ai_generations was missing an UPDATE policy: the generate-lesson Edge
-- Function (supabase/functions/generate-lesson/) runs as the calling
-- parent's own JWT (not service role — see that function's header comment),
-- and needs to move its own row from 'pending' to 'succeeded'/'failed' and
-- attach content_id once the lesson is saved. Without this, every
-- generation would insert an ai_generations row stuck at 'pending' forever.
-- Scoped to the row's own creator, same shape as the insert policy.

create policy ai_generations_update_creator on ai_generations for update using (
  requested_by = (select auth.uid())
) with check (
  requested_by = (select auth.uid())
);
