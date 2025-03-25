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
    const signature = req.headers.get('stripe-signature');
    if (!signature) {
      throw new Error('No Stripe signature found');
    }

    const body = await req.text();
    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      Deno.env.get('STRIPE_WEBHOOK_SECRET') || ''
    );

    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object;
        const { wallet_id } = paymentIntent.metadata;
        const amount = paymentIntent.amount / 100; // Convert from cents

        // Update wallet balance and transaction status
        const { data: wallet, error: walletError } = await supabase
          .from('wallets')
          .select('balance')
          .eq('id', wallet_id)
          .single();

        if (walletError) throw walletError;

        const newBalance = wallet.balance + amount;

        const { error: updateError } = await supabase
          .from('wallets')
          .update({ balance: newBalance })
          .eq('id', wallet_id);

        if (updateError) throw updateError;

        const { error: transactionError } = await supabase
          .from('transactions')
          .update({ status: 'success' })
          .eq('stripe_payment_id', paymentIntent.id);

        if (transactionError) throw transactionError;
        break;
      }

      case 'payout.paid': {
        const payout = event.data.object;
        const { wallet_id } = payout.metadata;

        // Update transaction status
        const { error: transactionError } = await supabase
          .from('transactions')
          .update({ status: 'success' })
          .eq('stripe_payment_id', payout.id);

        if (transactionError) throw transactionError;
        break;
      }

      case 'payout.failed': {
        const payout = event.data.object;
        const { wallet_id } = payout.metadata;
        const amount = payout.amount / 100;

        // Revert wallet balance and update transaction status
        const { data: wallet, error: walletError } = await supabase
          .from('wallets')
          .select('balance')
          .eq('id', wallet_id)
          .single();

        if (walletError) throw walletError;

        const newBalance = wallet.balance + amount;

        const { error: updateError } = await supabase
          .from('wallets')
          .update({ balance: newBalance })
          .eq('id', wallet_id);

        if (updateError) throw updateError;

        const { error: transactionError } = await supabase
          .from('transactions')
          .update({ status: 'failed' })
          .eq('stripe_payment_id', payout.id);

        if (transactionError) throw transactionError;
        break;
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});