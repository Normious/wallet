import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Shield } from 'lucide-react';
import toast from 'react-hot-toast';

interface TwoFactorVerifyProps {
  onVerified: () => void;
}

export function TwoFactorVerify({ onVerified }: TwoFactorVerifyProps) {
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);

  const verifyToken = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.mfa.verify({
        factorId: 'totp',
        code: token
      });

      if (error) throw error;

      onVerified();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <Shield className="h-12 w-12 text-indigo-600" />
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Two-Factor Authentication
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="space-y-6">
            <div>
              <label htmlFor="token" className="block text-sm font-medium text-gray-700">
                Verification Code
              </label>
              <div className="mt-1">
                <input
                  id="token"
                  type="text"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="Enter 6-digit code"
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>
            </div>

            <button
              onClick={verifyToken}
              disabled={loading || token.length !== 6}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {loading ? 'Verifying...' : 'Verify'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}