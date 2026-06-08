-- ============================================================
-- STAFF INVITE SETUP
-- Run this in your Supabase SQL Editor if not already done
-- ============================================================

-- Ensure employees table has updated_at column
ALTER TABLE employees ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Policy: Allow employees to read their OWN record (by email match before linking)
DROP POLICY IF EXISTS "Employees can read their own record" ON employees;
CREATE POLICY "Employees can read their own record" ON employees
  FOR SELECT USING (
    user_id = auth.uid()
    OR (user_id IS NULL AND lower(email) = lower(auth.jwt() ->> 'email'))
  );

-- Policy: Allow invited employees to claim (update) their own record
DROP POLICY IF EXISTS "Invited employees can claim their own record" ON employees;
CREATE POLICY "Invited employees can claim their own record" ON employees
  FOR UPDATE USING (
    user_id IS NULL
    AND status = 'invited'
    AND lower(email) = lower(auth.jwt() ->> 'email')
  ) WITH CHECK (
    user_id = auth.uid()
  );

-- Policy: Shop owners can do everything with their own employees
DROP POLICY IF EXISTS "Shop owners manage their employees" ON employees;
CREATE POLICY "Shop owners manage their employees" ON employees
  FOR ALL
  USING (shop_owner_id = auth.uid())
  WITH CHECK (shop_owner_id = auth.uid());

-- ============================================================
-- HOW STAFF INVITES WORK
-- ============================================================
-- 1. Shop owner adds employee email in the Employees page
-- 2. A record is created in `employees` table with status='invited'
-- 3. Employee signs up or logs in using that exact email
-- 4. AuthContext.syncRoleWithEmployeeMembership() automatically:
--    - Finds the invited record by email match
--    - Updates user_id = auth.uid() and status = 'active'
--    - Sets the user's role to 'employee'
-- 5. Employee sees the Employee Dashboard instead of Admin Dashboard
-- ============================================================
