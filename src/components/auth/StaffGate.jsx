'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { loadStaffSession } from '@/lib/pos/session';
import { usePosStore } from '@/lib/store/usePosStore';
import { cloudRequest } from '@/lib/pos/cloud';

// Cached Zustand identities never grant access. Verify the real session on the server.
export function StaffGate({ children }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let active = true;
    const verify = async (initial = false) => {
      try {
        if (initial) await loadStaffSession();
        else await cloudRequest('/api/pos/session');
        if (active) setReady(true);
      } catch {
        if (active) { setReady(false); router.replace('/login'); }
      }
    };
    verify(true);
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user.id !== usePosStore.getState().currentUser?.id) {
        setReady(false);
        setTimeout(() => active && verify(true), 0);
      }
      if (event === 'SIGNED_OUT') { setReady(false); router.replace('/login'); }
      // Avoid calling Supabase auth APIs synchronously inside its auth callback.
      if (event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') setTimeout(() => active && verify(), 0);
    });
    const onFocus = () => verify();
    window.addEventListener('focus', onFocus);
    return () => { active = false; subscription.unsubscribe(); window.removeEventListener('focus', onFocus); };
  }, [router]);
  if (!ready) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Memeriksa akses akun…</div>;
  return children;
}
