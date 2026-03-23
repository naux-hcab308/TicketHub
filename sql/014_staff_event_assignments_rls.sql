-- ============================================================
-- Fix event_staff_assignments grants so sellers can manage
-- assignments from the app layer (anon/authenticated key)
-- ============================================================

-- Allow sellers to insert and delete their own assignments
GRANT INSERT, DELETE ON public.event_staff_assignments TO anon, authenticated;

-- Ensure the WITH CHECK clause covers INSERT for the existing ALL policy.
-- Drop and recreate to be explicit about both USING and WITH CHECK.
DROP POLICY IF EXISTS "Sellers can manage assignments" ON event_staff_assignments;

CREATE POLICY "Sellers can manage assignments"
  ON event_staff_assignments FOR ALL
  USING (
    assigned_by_seller_id IN (
      SELECT seller_id FROM seller_profiles WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    assigned_by_seller_id IN (
      SELECT seller_id FROM seller_profiles WHERE user_id = auth.uid()
    )
  );

-- Staff (with no Supabase session) also need to SELECT assignments
-- This is already covered by the open SELECT policy from 005_staff_checkin_system.sql
-- but we restate it for clarity
DROP POLICY IF EXISTS "Assignments are readable" ON event_staff_assignments;
CREATE POLICY "Assignments are readable" ON event_staff_assignments
  FOR SELECT USING (true);
