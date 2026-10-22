'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LockKeyhole, Store } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { loadStaffSession } from '@/lib/pos/session';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function login(event) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (authError) throw new Error('Email atau kata sandi salah. Gunakan akun yang diberikan super admin.');
      const profile = await loadStaffSession();
      setPassword('');
      router.replace(profile.role === 'kitchen' ? '/kds' : '/pos');
    } catch (e) {
      await supabase.auth.signOut({ scope: 'local' });
      setError(e.message); setBusy(false);
    }
  }
  return <main className="min-h-screen bg-muted/30 flex items-center justify-center p-6">
    <div className="w-full max-w-md bg-card border rounded-2xl p-8 shadow-sm">
      <div className="h-12 w-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center mb-6"><Store /></div>
      <h1 className="text-2xl font-bold">Masuk ke POS</h1>
      <p className="text-sm text-muted-foreground mt-2 mb-6">Gunakan akun karyawan yang sudah didaftarkan oleh super admin.</p>
      <form onSubmit={login} className="space-y-4">
        <label className="block text-sm font-medium">Email<input className="mt-2 w-full rounded-lg border bg-background p-3" type="email" autoComplete="username" required value={email} onChange={e => setEmail(e.target.value)} disabled={busy} /></label>
        <label className="block text-sm font-medium">Kata sandi<input className="mt-2 w-full rounded-lg border bg-background p-3" type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} disabled={busy} /></label>
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        <button disabled={busy} className="w-full rounded-lg bg-primary text-primary-foreground p-3 font-semibold flex items-center justify-center gap-2"><LockKeyhole className="h-4 w-4" />{busy ? 'Memeriksa akun…' : 'Masuk'}</button>
      </form>
      <p className="text-xs text-muted-foreground border-t mt-6 pt-4">Belum punya akun, lupa kata sandi, atau belum mendapat akses outlet? Hubungi super admin. Pendaftaran akun tidak tersedia di POS.</p>
    </div>
  </main>;
}
