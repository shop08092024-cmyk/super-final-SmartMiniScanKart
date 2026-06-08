-- ============================================================
-- SQL Migration: Add Invite Codes to Employees
-- ============================================================

-- 1. Add invite_code column if it doesn't exist
ALTER TABLE employees ADD COLUMN IF NOT EXISTS invite_code text;

-- 2. Create a unique index for non-null invite codes
CREATE UNIQUE INDEX IF NOT EXISTS employees_invite_code_idx ON employees(invite_code) WHERE invite_code IS NOT NULL;

-- 3. Employees table RLS Policy updates
-- Ensure employees can read their own active records
DROP POLICY IF EXISTS "Employees can read their own record" ON employees;
CREATE POLICY "Employees can read their own record" ON employees
  FOR SELECT USING (
    user_id = auth.uid()
  );

-- 4. Shop profiles policy update: allow employees to read the shop profile
DROP POLICY IF EXISTS "Employees can read shop owner shop profile" ON shop_profiles;
CREATE POLICY "Employees can read shop owner shop profile" ON shop_profiles
  FOR SELECT USING (user_id = get_shop_owner_id());

-- 5. Secure function to claim an invite code
CREATE OR REPLACE FUNCTION claim_employee_invite(p_invite_code text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_employee_id uuid;
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Find the invited employee record with the given invite code
  SELECT id INTO v_employee_id
  FROM employees
  WHERE upper(invite_code) = upper(p_invite_code)
    AND status = 'invited'
    AND user_id IS NULL
  LIMIT 1;

  IF v_employee_id IS NULL THEN
    RETURN false;
  END IF;

  -- Update the employee record to link it to the user
  UPDATE employees
  SET user_id = v_user_id,
      status = 'active',
      joined_at = now(),
      updated_at = now()
  WHERE id = v_employee_id;

  RETURN true;
END;
$$;
