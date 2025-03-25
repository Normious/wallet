/*
  # Wallet Application Schema

  1. New Tables
    - `wallets`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `balance` (numeric, default 0)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `transactions`
      - `id` (uuid, primary key)
      - `wallet_id` (uuid, references wallets)
      - `amount` (numeric)
      - `type` (text, either 'deposit' or 'withdrawal')
      - `status` (text)
      - `stripe_payment_id` (text)
      - `created_at` (timestamp)
      - `metadata` (jsonb, for additional transaction details)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to:
      - Read their own wallet and transactions
      - Insert new transactions
      - Update their wallet balance
*/

-- Create wallets table
CREATE TABLE wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  balance numeric DEFAULT 0 CHECK (balance >= 0),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- Create transactions table
CREATE TABLE transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id uuid REFERENCES wallets NOT NULL,
  amount numeric NOT NULL,
  type text NOT NULL CHECK (type IN ('deposit', 'withdrawal')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed')),
  stripe_payment_id text,
  created_at timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Enable RLS
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Policies for wallets
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

-- Policies for transactions
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

-- Function to create wallet for new users
CREATE OR REPLACE FUNCTION create_wallet_for_new_user()
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

-- Trigger to create wallet when new user signs up
CREATE TRIGGER create_wallet_after_signup
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_wallet_for_new_user();