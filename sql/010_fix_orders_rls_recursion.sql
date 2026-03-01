-- ============================================================
-- FIX: Infinite recursion between orders and order_items RLS
-- orders (Sellers) -> SELECT order_items -> order_items (Users) -> SELECT orders -> loop
-- Fix: use SECURITY DEFINER function so order_items policy does not read orders with RLS
-- ============================================================

-- Function trả về danh sách order_id của user hiện tại.
-- Chạy với quyền owner (postgres) nên đọc bảng orders không kích hoạt RLS → không đệ quy.
CREATE OR REPLACE FUNCTION public.get_order_ids_for_current_user()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT order_id FROM public.orders WHERE user_id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.get_order_ids_for_current_user() TO authenticated;

-- order_items: dùng function thay vì subquery trực tiếp từ orders
DROP POLICY IF EXISTS "Users can manage own order items" ON order_items;
CREATE POLICY "Users can manage own order items" ON order_items
  FOR ALL
  USING (order_id IN (SELECT public.get_order_ids_for_current_user()))
  WITH CHECK (order_id IN (SELECT public.get_order_ids_for_current_user()));

-- payments: cùng cách để tránh đệ quy nếu policy đang dùng subquery orders
DROP POLICY IF EXISTS "Users can manage payments" ON payments;
DROP POLICY IF EXISTS "Users can view own payments" ON payments;
CREATE POLICY "Users can manage payments" ON payments
  FOR ALL
  USING (order_id IN (SELECT public.get_order_ids_for_current_user()))
  WITH CHECK (order_id IN (SELECT public.get_order_ids_for_current_user()));
