-- Add is_deleted column for soft delete (hide event)
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS is_deleted boolean DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_events_is_deleted ON events(is_deleted);

-- Update RLS: customers only see non-deleted published events
DROP POLICY IF EXISTS "Published events are viewable by everyone" ON events;
CREATE POLICY "Published events are viewable by everyone" ON events FOR SELECT USING (
  (status IN ('published', 'approved', 'completed') AND (is_deleted IS NOT TRUE))
  OR seller_id IN (SELECT seller_id FROM seller_profiles WHERE user_id = auth.uid())
);
