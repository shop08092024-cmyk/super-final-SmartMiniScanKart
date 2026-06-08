-- ================================================================
-- SmartMiniScanKart - Complete Database Setup
-- Run this entire file in Supabase SQL Editor
-- ================================================================

-- ============================================================
-- CRITICAL: Add missing columns to products table
-- ============================================================
ALTER TABLE products ADD COLUMN IF NOT EXISTS mrp numeric(10,2) NOT NULL DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS sold_quantity INTEGER NOT NULL DEFAULT 0;

-- ============================================================
-- CRITICAL: Add missing columns to orders table
-- ============================================================
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_number TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'paid';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS razorpay_order_id TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS razorpay_payment_id TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS notes TEXT;

-- ============================================================
-- Performance indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS orders_number_idx ON orders(order_number);
CREATE INDEX IF NOT EXISTS orders_payment_idx ON orders(payment_status);
CREATE INDEX IF NOT EXISTS orders_created_idx ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS products_barcode_idx ON products(barcode);
CREATE INDEX IF NOT EXISTS customers_phone_idx ON customers(phone);

-- ============================================================
-- Backfill missing order_numbers for existing orders
-- ============================================================
WITH numbered_orders AS (
  SELECT
    id,
    ROW_NUMBER() OVER (ORDER BY created_at, id) as order_seq
  FROM orders
  WHERE order_number IS NULL
)
UPDATE orders o
SET order_number = 'ORD-' || EXTRACT(YEAR FROM o.created_at)::TEXT || '-' || LPAD(no.order_seq::text, 4, '0')
FROM numbered_orders no
WHERE o.id = no.id;

-- ============================================================
-- Backfill mrp = price for existing products (where mrp = 0)
-- ============================================================
UPDATE products SET mrp = price WHERE mrp = 0 OR mrp IS NULL;


-- ================================================================
-- EMPLOYEE ACCESS FIX (included from employee_rls_fix.sql)
-- ================================================================

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

DROP POLICY IF EXISTS "Employees read shop products" ON products;
CREATE POLICY "Employees read shop products" ON products
  FOR SELECT USING (user_id = get_employee_shop_owner_id());

DROP POLICY IF EXISTS "Employees update shop products" ON products;
CREATE POLICY "Employees update shop products" ON products
  FOR UPDATE
  USING  (user_id = get_employee_shop_owner_id())
  WITH CHECK (user_id = get_employee_shop_owner_id());

DROP POLICY IF EXISTS "Employees read shop customers" ON customers;
CREATE POLICY "Employees read shop customers" ON customers
  FOR SELECT USING (user_id = get_employee_shop_owner_id());

DROP POLICY IF EXISTS "Employees insert shop customers" ON customers;
CREATE POLICY "Employees insert shop customers" ON customers
  FOR INSERT WITH CHECK (user_id = get_employee_shop_owner_id());

DROP POLICY IF EXISTS "Employees update shop customers" ON customers;
CREATE POLICY "Employees update shop customers" ON customers
  FOR UPDATE
  USING  (user_id = get_employee_shop_owner_id())
  WITH CHECK (user_id = get_employee_shop_owner_id());

DROP POLICY IF EXISTS "Employees read shop orders" ON orders;
CREATE POLICY "Employees read shop orders" ON orders
  FOR SELECT USING (user_id = get_employee_shop_owner_id());

DROP POLICY IF EXISTS "Employees insert shop orders" ON orders;
CREATE POLICY "Employees insert shop orders" ON orders
  FOR INSERT WITH CHECK (user_id = get_employee_shop_owner_id());

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

DROP POLICY IF EXISTS "Employees read shop profile" ON shop_profiles;
CREATE POLICY "Employees read shop profile" ON shop_profiles
  FOR SELECT USING (user_id = get_employee_shop_owner_id());

-- ============================================================
-- Cashier / Employee Dashboard Improvements Fixes
-- ============================================================

-- 1. Link orders to the employee who completed the billing
ALTER TABLE orders ADD COLUMN IF NOT EXISTS employee_id uuid REFERENCES employees(id) ON DELETE SET NULL;

-- 2. Allow active employees to update their own profile (balances, shift collected amounts, etc.)
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Employees can update their own record" ON employees;
CREATE POLICY "Employees can update their own record" ON employees
  FOR UPDATE USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 3. Shop owners can fully manage their employees (INSERT, SELECT, UPDATE, DELETE)
DROP POLICY IF EXISTS "Shop owners manage their employees" ON employees;
CREATE POLICY "Shop owners manage their employees" ON employees
  FOR ALL USING (shop_owner_id = auth.uid()) WITH CHECK (shop_owner_id = auth.uid());

-- 4. Employees can read their own record (by user_id match or email match prior to claiming)
DROP POLICY IF EXISTS "Employees can read their own record" ON employees;
CREATE POLICY "Employees can read their own record" ON employees
  FOR SELECT USING (
    user_id = auth.uid()
    OR (user_id IS NULL AND lower(email) = lower(auth.jwt() ->> 'email'))
  );

-- 5. Invited employees can claim their own record (link user_id)
DROP POLICY IF EXISTS "Invited employees can claim their own record" ON employees;
CREATE POLICY "Invited employees can claim their own record" ON employees
  FOR UPDATE USING (
    user_id IS NULL
    AND status = 'invited'
    AND lower(email) = lower(auth.jwt() ->> 'email')
  ) WITH CHECK (
    user_id = auth.uid()
  );

-- ============================================================
-- Seeding Plans (critical for auth trigger and billing limits)
-- ============================================================
INSERT INTO plans (id, name, price_monthly, price_yearly, product_limit, order_limit, features, is_popular)
VALUES
  ('free', 'Free', 0, 0, 50, 100, '["Up to 50 products","100 orders/month","Basic invoice download","Cash & UPI payments","1 shop profile"]', false),
  ('starter', 'Starter', 199, 1499, 500, 1000, '["Up to 500 products","1,000 orders/month","GST invoices with logo","Razorpay digital payments","Customer management","Basic analytics","Low stock alerts","Email support"]', true),
  ('pro', 'Pro', 499, 3999, null, null, '["Unlimited products","Unlimited orders","Custom branded invoices","All payment methods","Advanced analytics & reports","Multi-staff access","Loyalty points system","Priority support","Data export (CSV/PDF)"]', false)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  price_monthly = EXCLUDED.price_monthly,
  price_yearly = EXCLUDED.price_yearly,
  product_limit = EXCLUDED.product_limit,
  order_limit = EXCLUDED.order_limit,
  features = EXCLUDED.features,
  is_popular = EXCLUDED.is_popular;

