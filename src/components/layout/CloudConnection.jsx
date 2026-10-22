'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { usePosStore } from '@/lib/store/usePosStore';
import { startCloudSync } from '@/lib/pos/cloud';

export function CloudConnection() {
  const state = usePosStore();
  const router = useRouter();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => startCloudSync(usePosStore), []);
  async function logout() {
    setError('');
    if (usePosStore.getState().cloudPending.length) { setError('Tunggu sampai semua transaksi tersinkron sebelum keluar atau berganti akun.'); return; }
    setBusy(true);
    const { error: signOutError } = await supabase.auth.signOut({ scope: 'local' });
    if (signOutError) { setError(signOutError.message); setBusy(false); return; }
    router.replace('/login');
  }
  return <div className="border-b bg-card px-4 py-2 text-sm">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <span>{state.outlet?.name} · {state.cloudPending.length ? `${state.cloudPending.length} catatan menunggu sinkronisasi` : 'Semua catatan tersinkron'}</span>
      <button disabled={busy} className="font-semibold underline" onClick={logout}>{busy ? 'Keluar…' : 'Keluar / ganti akun'}</button>
    </div>
    {(state.cloudError || error) && <p role="alert" className="text-red-600 mt-1">{error || `Belum tersinkron: ${state.cloudError}. Catatan tersimpan di perangkat dan akan dicoba kembali.`}</p>}
  </div>;
}
