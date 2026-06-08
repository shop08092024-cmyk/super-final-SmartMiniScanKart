-- ================================================================
-- EMPLOYEE ACCESS FIX: Allow employees to read shop owner's data
-- Run this in Supabase SQL Editor
-- ================================================================
-- 
-- ROOT CAUSE: The existing RLS policies only allow users to access
-- rows where user_id = auth.uid(). Employees have a different uid
-- than the shop owner, so they get blocked even though the app
-- correctly passes shopOwnerId to the query.
--
-- FIX: Add a helper function + new policies that let active
-- employees read (and employees write orders/customers) for their
-- shop owner.
-- ================================================================

-- ── Helper function ──────────────────────────────────────────────
-- Returns the shop_owner_id for the currently authenticated user
-- if they are an active employee, otherwise returns NULL.
CREATE OR REPLACE FUNCTION get_employee_shop_owner_id()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT shop_owner_id
  FROM   employees
  WHERE  user_id    = auth.uid()
    AND  status     = 'active'
  LIMIT  1;
$$;

-- ── PRODUCTS ─────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Employees read shop products" ON products;
CREATE POLICY "Employees read shop products" ON products
  FOR SELECT
  USING (user_id = get_employee_shop_owner_id());

-- Employees can update stock (needed when billing decrements stock)
DROP POLICY IF EXISTS "Employees update shop products" ON products;
CREATE POLICY "Employees update shop products" ON products
  FOR UPDATE
  USING  (user_id = get_employee_shop_owner_id())
  WITH CHECK (user_id = get_employee_shop_owner_id());

-- ── CUSTOMERS ────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Employees read shop customers" ON customers;
CREATE POLICY "Employees read shop customers" ON customers
  FOR SELECT
  USING (user_id = get_employee_shop_owner_id());

DROP POLICY IF EXISTS "Employees insert shop customers" ON customers;
CREATE POLICY "Employees insert shop customers" ON customers
  FOR INSERT
  WITH CHECK (user_id = get_employee_shop_owner_id());

DROP POLICY IF EXISTS "Employees update shop customers" ON customers;
CREATE POLICY "Employees update shop customers" ON customers
  FOR UPDATE
  USING  (user_id = get_employee_shop_owner_id())
  WITH CHECK (user_id = get_employee_shop_owner_id());

-- ── ORDERS ───────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Employees read shop orders" ON orders;
CREATE POLICY "Employees read shop orders" ON orders
  FOR SELECT
  USING (user_id = get_employee_shop_owner_id());

DROP POLICY IF EXISTS "Employees insert shop orders" ON orders;
CREATE POLICY "Employees insert shop orders" ON orders
  FOR INSERT
  WITH CHECK (user_id = get_employee_shop_owner_id());

-- ── ORDER ITEMS ──────────────────────────────────────────────────
DROP POLICY IF EXISTS "Employees insert order items for shop" ON order_items;
CREATE POLICY "Employees insert order items for shop" ON order_items
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders o
      WHERE  o.id      = order_id
        AND  o.user_id = get_employee_shop_owner_id()
    )
  );

DROP POLICY IF EXISTS "Employees read order items for shop" ON order_items;
CREATE POLICY "Employees read order items for shop" ON order_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders o
      WHERE  o.id      = order_id
        AND  o.user_id = get_employee_shop_owner_id()
    )
  );

-- ── SHOP PROFILES (read-only for employees) ──────────────────────
DROP POLICY IF EXISTS "Employees read shop profile" ON shop_profiles;
CREATE POLICY "Employees read shop profile" ON shop_profiles
  FOR SELECT
  USING (user_id = get_employee_shop_owner_id());

