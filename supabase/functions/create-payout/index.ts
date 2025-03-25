import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.39.7';
import Stripe from 'npm:stripe@14.18.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
});

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { amount, wallet_id } = await req.json();

    // Create a payout
    const payout = await stripe.payouts.create({
      amount,
      currency: 'usd',
      metadata: {
        wallet_id,
      },
    });

    // Update wallet balance
    const { data: wallet, error: walletError } = await supabase
      .from('wallets')
      .select('balance')
      .eq('id', wallet_id)
      .single();

    if (walletError) throw walletError;

    const newBalance = wallet.balance - (amount / 100);
    if (newBalance < 0) throw new Error('Insufficient funds');

    const { error: updateError } = await supabase
      .from('wallets')
      .update({ balance: newBalance })
      .eq('id', wallet_id);

    if (updateError) throw updateError;

    // Create a pending transaction
    const { error: transactionError } = await supabase
      .from('transactions')
      .insert({
        wallet_id,
        amount: amount / 100,
        type: 'withdrawal',
        status: 'pending',
        stripe_payment_id: payout.id,
      });

    if (transactionError) throw transactionError;

    return new Response(
      JSON.stringify({ success: true }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});