-- ====================================================================
-- claim_employee_invite_by_email.sql
-- Run this in your Supabase SQL Editor:
-- SQL Editor -> New Query -> paste this script -> Run
-- ====================================================================

-- 1. Create a secure RPC to claim an invitation by matching email
CREATE OR REPLACE FUNCTION claim_employee_invite_by_email()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_employee_id uuid;
  v_user_id uuid;
  v_email text;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Since it is a SECURITY DEFINER function, we can query auth.users directly
  SELECT email INTO v_email
  FROM auth.users
  WHERE id = v_user_id;

  IF v_email IS NULL THEN
    RETURN false;
  END IF;

  -- Find the invited employee record matching the email (case-insensitive and trimmed)
  SELECT id INTO v_employee_id
  FROM employees
  WHERE lower(trim(email)) = lower(trim(v_email))
    AND status = 'invited'
    AND user_id IS NULL
  LIMIT 1;

  IF v_employee_id IS NULL THEN
    RETURN false;
  END IF;

  -- Link the employee record to the user ID and activate it
  UPDATE employees
  SET user_id = v_user_id,
      status = 'active',
      joined_at = now(),
      updated_at = now()
  WHERE id = v_employee_id;

  RETURN true;
END;
$$;

-- 2. Enable active employees to read all active employees in their own shop
-- This uses the get_employee_shop_owner_id() helper function to avoid RLS recursion!
DROP POLICY IF EXISTS "Active employees can read shop employees" ON employees;
CREATE POLICY "Active employees can read shop employees" ON employees
  FOR SELECT
  USING (
    shop_owner_id = get_employee_shop_owner_id()
  );

-- 3. Confirm policies are properly linked
GRANT EXECUTE ON FUNCTION claim_employee_invite_by_email() TO authenticated;
