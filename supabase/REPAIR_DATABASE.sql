-- ================================================================
-- SmartMiniScanKart - Database Repair & Setup Fixes
-- Run this entire script in your Supabase SQL Editor (SQL Editor -> New Query -> Run)
-- ================================================================

-- 1. Ensure all columns in products table have correct default values
ALTER TABLE products ALTER COLUMN cost_price SET DEFAULT 0;
ALTER TABLE products ALTER COLUMN stock SET DEFAULT 0;
ALTER TABLE products ALTER COLUMN min_stock SET DEFAULT 5;
ALTER TABLE products ALTER COLUMN tax_percent SET DEFAULT 5;
ALTER TABLE products ALTER COLUMN category SET DEFAULT 'Other';
ALTER TABLE products ALTER COLUMN mrp SET DEFAULT 0;
ALTER TABLE products ALTER COLUMN sold_quantity SET DEFAULT 0;

-- 2. Ensure all columns in orders table have correct default values
ALTER TABLE orders ALTER COLUMN payment_status SET DEFAULT 'paid';
ALTER TABLE orders ALTER COLUMN discount SET DEFAULT 0;
ALTER TABLE orders ALTER COLUMN tax SET DEFAULT 0;

-- 3. Ensure all columns in customers table have correct default values
ALTER TABLE customers ALTER COLUMN total_spent SET DEFAULT 0;
ALTER TABLE customers ALTER COLUMN order_count SET DEFAULT 0;
ALTER TABLE customers ALTER COLUMN loyalty_points SET DEFAULT 0;

-- 4. Ensure plans table is up to date and has updated_at column
ALTER TABLE plans ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- 5. Seed default plans safely
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

-- 6. Ensure subscriptions table columns have robust defaults
ALTER TABLE subscriptions ALTER COLUMN billing_cycle SET DEFAULT 'monthly';
ALTER TABLE subscriptions ALTER COLUMN status SET DEFAULT 'trialing';
ALTER TABLE subscriptions ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE subscriptions ALTER COLUMN updated_at SET DEFAULT now();

-- 7. Recreate auth signup trigger function with exception handling
-- This ensures that even if a subscription cannot be created for any reason,
-- the auth.users signup transaction does NOT crash with "Database error saving new user".
CREATE OR REPLACE FUNCTION handle_new_user_subscription()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Double check the 'free' plan exists before attempting to insert
  IF NOT EXISTS (SELECT 1 FROM plans WHERE id = 'free') THEN
    INSERT INTO plans (id, name, price_monthly, price_yearly, product_limit, order_limit, features, is_popular)
    VALUES ('free', 'Free', 0, 0, 50, 100, '["Up to 50 products","100 orders/month","Basic invoice download","Cash & UPI payments","1 shop profile"]', false)
    ON CONFLICT (id) DO NOTHING;
  END IF;

  -- Attempt to create the subscription inside a safe subtransaction block
  BEGIN
    INSERT INTO subscriptions (user_id, plan_id, status, billing_cycle, trial_ends_at)
    VALUES (new.id, 'free', 'trialing', 'monthly', now() + interval '14 days')
    ON CONFLICT (user_id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    -- Log a warning to database logs but don't fail the signup transaction
    RAISE WARNING 'Could not auto-create subscription for user %: %', new.id, SQLERRM;
  END;

  RETURN new;
END;
$$;

-- 8. Re-link trigger
DROP TRIGGER IF EXISTS on_auth_user_created_subscription ON auth.users;
CREATE TRIGGER on_auth_user_created_subscription
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE handle_new_user_subscription();

-- 9. Backfill any missing order_numbers cleanly (CTE method)
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

-- 10. Backfill mrp = price for existing products (where mrp = 0)
UPDATE products SET mrp = price WHERE mrp = 0 OR mrp IS NULL;
