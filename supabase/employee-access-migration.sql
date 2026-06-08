-- ============================================================
-- EMPLOYEE ACCESS MIGRATION
-- Run this in Supabase SQL Editor to allow employees to 
-- access shop owner's data (products, orders, customers).
-- Safe to run multiple times (idempotent).
-- ============================================================

-- Helper function: returns shop_owner_id for employees, own uid for admins
CREATE OR REPLACE FUNCTION get_shop_owner_id()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT COALESCE(
    (
      SELECT shop_owner_id FROM employees
      WHERE user_id = auth.uid()
        AND status IN ('active', 'invited')
      LIMIT 1
    ),
    auth.uid()
  );
$$;

-- Products: employees can read/update (for stock changes) shop owner's products
DROP POLICY IF EXISTS "Employees access shop owner products" ON products;
CREATE POLICY "Employees access shop owner products" ON products
  FOR ALL USING (user_id = get_shop_owner_id())
  WITH CHECK (user_id = get_shop_owner_id());

-- Orders: employees can create and read shop owner's orders
DROP POLICY IF EXISTS "Employees access shop owner orders" ON orders;
CREATE POLICY "Employees access shop owner orders" ON orders
  FOR ALL USING (user_id = get_shop_owner_id())
  WITH CHECK (user_id = get_shop_owner_id());

-- Order Items: linked through orders
DROP POLICY IF EXISTS "Employees access shop owner order items" ON order_items;
CREATE POLICY "Employees access shop owner order items" ON order_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
        AND orders.user_id = get_shop_owner_id()
    )
  );

-- Customers: employees can read/add shop owner's customers  
DROP POLICY IF EXISTS "Employees access shop owner customers" ON customers;
CREATE POLICY "Employees access shop owner customers" ON customers
  FOR ALL USING (user_id = get_shop_owner_id())
  WITH CHECK (user_id = get_shop_owner_id());

-- Employees: allow employees to update their own balance record (collected_amount, orders_today)
DROP POLICY IF EXISTS "Employees can update their own record" ON employees;
CREATE POLICY "Employees can update their own record" ON employees
  FOR UPDATE USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
