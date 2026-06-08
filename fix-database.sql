-- ============================================================
-- SmartMiniScanKart - Database Fix Script
-- Run ALL of this in your Supabase SQL Editor
-- ============================================================

-- CRITICAL: Add missing columns to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS mrp numeric(10,2) NOT NULL DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS sold_quantity INTEGER NOT NULL DEFAULT 0;

-- CRITICAL: Add missing columns to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_number TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'paid';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS razorpay_order_id TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS razorpay_payment_id TEXT;

-- Performance indexes
CREATE INDEX IF NOT EXISTS orders_number_idx ON orders(order_number);
CREATE INDEX IF NOT EXISTS orders_payment_idx ON orders(payment_status);

-- Backfill missing order_numbers for existing orders
WITH numbered_orders AS (
  SELECT
    id,
    row_number() OVER (ORDER BY created_at, id) AS order_seq,
    EXTRACT(YEAR FROM created_at)::TEXT AS yr
  FROM orders
  WHERE order_number IS NULL
)
UPDATE orders o
SET order_number = 'ORD-' || no.yr || '-' || LPAD(no.order_seq::TEXT, 4, '0')
FROM numbered_orders no
WHERE o.id = no.id;

-- Ensure employees table has updated_at column
ALTER TABLE employees ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Ensure shop_profiles table exists
CREATE TABLE IF NOT EXISTS shop_profiles (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  shop_name        text NOT NULL DEFAULT '',
  owner_name       text NOT NULL DEFAULT '',
  phone            text NOT NULL DEFAULT '',
  alternate_phone  text,
  email            text,
  address          text NOT NULL DEFAULT '',
  city             text,
  state            text,
  pincode          text,
  gstin            text,
  fssai_number     text,
  upi_id           text,
  logo_url         text,
  thank_you_message text DEFAULT 'Thank you for your purchase! Visit again.',
  currency         text DEFAULT 'INR',
  invoice_prefix   text DEFAULT 'INV',
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);

ALTER TABLE shop_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own shop profile" ON shop_profiles;
CREATE POLICY "Users manage own shop profile" ON shop_profiles
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS shop_profiles_user_idx ON shop_profiles(user_id);

-- ============================================================
-- EMPLOYEE RLS POLICIES (for staff invite to work)
-- ============================================================
DROP POLICY IF EXISTS "Shop owners manage their employees" ON employees;
DROP POLICY IF EXISTS "Employees can read their own record" ON employees;
DROP POLICY IF EXISTS "Invited employees can claim their own record" ON employees;

CREATE POLICY "Shop owners manage their employees" ON employees
  FOR ALL USING (shop_owner_id = auth.uid()) WITH CHECK (shop_owner_id = auth.uid());

CREATE POLICY "Employees can read their own record" ON employees
  FOR SELECT USING (
    user_id = auth.uid()
    OR (user_id IS NULL AND lower(email) = lower(auth.jwt() ->> 'email'))
  );

CREATE POLICY "Invited employees can claim their own record" ON employees
  FOR UPDATE USING (
    user_id IS NULL
    AND status = 'invited'
    AND lower(email) = lower(auth.jwt() ->> 'email')
  ) WITH CHECK (
    user_id = auth.uid()
  );

-- ============================================================
-- VERIFY: Check tables have the required columns
-- ============================================================
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'orders' ORDER BY ordinal_position;
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'products' ORDER BY ordinal_position;
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'employees' ORDER BY ordinal_position;
