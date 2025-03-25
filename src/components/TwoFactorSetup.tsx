import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { QrCode, Copy, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

interface TwoFactorSetupProps {
  onComplete: () => void;
}

export function TwoFactorSetup({ onComplete }: TwoFactorSetupProps) {
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const setupTwoFactor = async () => {
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp'
      });

      if (error) throw error;

      setQrCode(data.qr);
      setSecret(data.secret);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const verifyTwoFactor = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.mfa.challenge({
        factorId: 'totp',
        code: token
      });

      if (error) throw error;

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: 'totp',
        code: token
      });

      if (verifyError) throw verifyError;

      toast.success('2FA enabled successfully!');
      onComplete();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const copySecret = async () => {
    try {
      await navigator.clipboard.writeText(secret);
      setCopied(true);
      toast.success('Secret copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Failed to copy secret');
    }
  };

  React.useEffect(() => {
    setupTwoFactor();
  }, []);

  return (
    <div className="bg-white p-6 rounded-lg shadow-md max-w-md mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Set Up Two-Factor Authentication</h2>
      
      {qrCode && (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">1. Scan QR Code</h3>
            <div className="bg-gray-50 p-4 rounded-lg flex justify-center">
              <img src={qrCode} alt="QR Code" className="w-48 h-48" />
            </div>
          </div>

          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">2. Or Enter Secret Key</h3>
            <div className="flex items-center space-x-2">
              <code className="bg-gray-100 px-3 py-2 rounded-md flex-1 font-mono text-sm">
                {secret}
              </code>
              <button
                onClick={copySecret}
                className="p-2 text-gray-500 hover:text-gray-700"
                title="Copy secret"
              >
                {copied ? <CheckCircle className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">3. Enter Verification Code</h3>
            <input
              type="text"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Enter 6-digit code"
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>

          <button
            onClick={verifyTwoFactor}
            disabled={loading || token.length !== 6}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {loading ? 'Verifying...' : 'Enable 2FA'}
          </button>
        </div>
      )}
    </div>
  );
}