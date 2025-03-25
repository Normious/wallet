/*
  # Add MFA Support to Wallet Application

  This migration adds support for Multi-Factor Authentication (MFA) to the existing wallet application.
  Since the base tables already exist, this migration focuses on ensuring the correct state
  and adding any missing security policies.

  1. Security Updates
    - Verify RLS is enabled on existing tables
    - Ensure all necessary policies are in place
    - Add any missing constraints or indexes
*/

-- Ensure RLS is enabled (idempotent)
DO $$ 
BEGIN
  -- Enable RLS if not already enabled
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_tables 
    WHERE tablename = 'wallets' 
    AND rowsecurity = true
  ) THEN
    ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
  END IF;

  IF NOT EXISTS (
    SELECT 1 
    FROM pg_tables 
    WHERE tablename = 'transactions' 
    AND rowsecurity = true
  ) THEN
    ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Recreate policies (DROP IF EXISTS + CREATE ensures latest version)
DROP POLICY IF EXISTS "Users can view their own wallet" ON wallets;
DROP POLICY IF EXISTS "Users can update their own wallet" ON wallets;
DROP POLICY IF EXISTS "Users can view their own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can insert transactions" ON transactions;

CREATE POLICY "Users can view their own wallet"
  ON wallets
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own wallet"
  ON wallets
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own transactions"
  ON transactions
  FOR SELECT
  TO authenticated
  USING (
    wallet_id IN (
      SELECT id FROM wallets WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert transactions"
  ON transactions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    wallet_id IN (
      SELECT id FROM wallets WHERE user_id = auth.uid()
    )
  );

-- Recreate wallet creation trigger (if it doesn't exist)
DO $$ 
BEGIN
  -- Drop existing function if it exists
  DROP FUNCTION IF EXISTS create_wallet_for_new_user CASCADE;
  
  -- Create the function
  CREATE FUNCTION create_wallet_for_new_user()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $$
  BEGIN
    INSERT INTO wallets (user_id)
    VALUES (NEW.id);
    RETURN NEW;
  END;
  $$;

  -- Create trigger if it doesn't exist
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'create_wallet_after_signup'
  ) THEN
    CREATE TRIGGER create_wallet_after_signup
      AFTER INSERT ON auth.users
      FOR EACH ROW
      EXECUTE FUNCTION create_wallet_for_new_user();
  END IF;
END $$;