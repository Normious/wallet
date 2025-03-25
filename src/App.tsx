import React, { useState, useEffect } from 'react';
import { Auth } from './components/Auth';
import { WalletDashboard } from './components/WalletDashboard';
import { supabase } from './lib/supabase';
import { Toaster } from 'react-hot-toast';

function App() {
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <>
      <Toaster position="top-right" />
      {!session ? (
        <Auth onSuccess={() => {}} />
      ) : (
        <WalletDashboard onSignOut={() => setSession(null)} />
      )}
    </>
  );
}

export default App;