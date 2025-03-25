export interface Transaction {
  id: string;
  wallet_id: string;
  amount: number;
  type: 'deposit' | 'withdrawal';
  status: 'pending' | 'success' | 'failed';
  stripe_payment_id: string | null;
  created_at: string;
  metadata: Record<string, any>;
}

export interface Wallet {
  id: string;
  user_id: string;
  balance: number;
  created_at: string;
  updated_at: string;
}