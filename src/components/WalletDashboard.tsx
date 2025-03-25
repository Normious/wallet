import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { loadStripe } from '@stripe/stripe-js';
import { Transaction, Wallet } from '../types';
import { TransactionList } from './TransactionList';
import { Wallet as WalletIcon, LogOut, RefreshCw, Shield } from 'lucide-react';
import toast from 'react-hot-toast';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

interface WalletDashboardProps {
  onSignOut: () => void;
}

export function WalletDashboard({ onSignOut }: WalletDashboardProps) {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasTwoFactor, setHasTwoFactor] = useState(false);

  useEffect(() => {
    fetchWalletData();
    checkTwoFactorStatus();
  }, []);

  const checkTwoFactorStatus = async () => {
    const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    setHasTwoFactor(data.currentLevel === 'aal2');
  };

  const fetchWalletData = async () => {
    setRefreshing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: walletData, error: walletError } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (walletError) throw walletError;
      setWallet(walletData);

      const { data: transactionData, error: transactionError } = await supabase
        .from('transactions')
        .select('*')
        .eq('wallet_id', walletData.id)
        .order('created_at', { ascending: false });

      if (transactionError) throw transactionError;
      setTransactions(transactionData);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setRefreshing(false);
    }
  };

  const handleDeposit = async () => {
    if (!wallet) return;
    setLoading(true);

    try {
      const stripe = await stripePromise;
      if (!stripe) throw new Error('Stripe failed to load');

      const response = await fetch('/api/create-payment-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: parseFloat(amount) * 100, // Convert to cents
          wallet_id: wallet.id,
        }),
      });

      const { clientSecret } = await response.json();

      const result = await stripe.confirmCardPayment(clientSecret);

      if (result.error) {
        throw result.error;
      }

      toast.success('Deposit successful!');
      setAmount('');
      fetchWalletData();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleWithdrawal = async () => {
    if (!wallet) return;
    setLoading(true);

    try {
      const withdrawalAmount = parseFloat(amount);
      if (withdrawalAmount > wallet.balance) {
        throw new Error('Insufficient funds');
      }

      const response = await fetch('/api/create-payout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: withdrawalAmount * 100, // Convert to cents
          wallet_id: wallet.id,
        }),
      });

      if (!response.ok) {
        throw new Error('Withdrawal failed');
      }

      toast.success('Withdrawal initiated successfully!');
      setAmount('');
      fetchWalletData();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error(error.message);
    } else {
      onSignOut();
    }
  };

  if (!wallet) return null;

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center">
            <WalletIcon className="h-8 w-8 text-indigo-600 mr-3" />
            <h1 className="text-2xl font-bold text-gray-900">My Wallet</h1>
          </div>
          <div className="flex items-center space-x-4">
            {hasTwoFactor && (
              <div className="flex items-center text-green-600">
                <Shield className="h-5 w-5 mr-1" />
                <span className="text-sm">2FA Enabled</span>
              </div>
            )}
            <button
              onClick={fetchWalletData}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={handleSignOut}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-medium text-gray-900">Current Balance</h2>
                <span className="text-2xl font-bold text-indigo-600">
                  ${wallet.balance.toFixed(2)}
                </span>
              </div>

              <div className="mt-6">
                <label htmlFor="amount" className="block text-sm font-medium text-gray-700">
                  Amount
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">$</span>
                  </div>
                  <input
                    type="number"
                    name="amount"
                    id="amount"
                    min="0"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-7 pr-12 sm:text-sm border-gray-300 rounded-md"
                    placeholder="0.00"
                  />
                </div>

                <div className="mt-4 grid grid-cols-2 gap-4">
                  <button
                    onClick={handleDeposit}
                    disabled={loading || !amount || parseFloat(amount) <= 0}
                    className="inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                  >
                    {loading ? 'Processing...' : 'Deposit'}
                  </button>
                  <button
                    onClick={handleWithdrawal}
                    disabled={loading || !amount || parseFloat(amount) <= 0 || parseFloat(amount) > wallet.balance}
                    className="inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                  >
                    {loading ? 'Processing...' : 'Withdraw'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-8">
            <TransactionList transactions={transactions} />
          </div>
        </div>
      </div>
    </div>
  );
}