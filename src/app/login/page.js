'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePosStore } from '@/lib/store/usePosStore';
import { Button } from '@/components/ui/Button';
import { Lock, Delete, Check, Coffee, ShieldCheck } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { profiles, loginWithPin } = usePosStore();
  const [selectedUser, setSelectedUser] = useState(profiles[2]); // Default Kasir (Rian Pratama)
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Demo PIN information map
  const demoPins = {
    owner: '112233',
    manager: '123456',
    cashier: '654321',
    waiter: '111111',
    kitchen: '222222',
  };

  const handleDigit = (digit) => {
    if (pin.length < 6) {
      setPin((prev) => prev + digit);
      setError('');
    }
  };

  const handleBackspace = () => {
    setPin((prev) => prev.slice(0, -1));
    setError('');
  };

  const handleClear = () => {
    setPin('');
    setError('');
  };

  const handleLogin = async (overridePin = null) => {
    const pinToUse = overridePin || pin;
    if (pinToUse.length < 4) {
      setError('Masukkan minimal 4 digit PIN');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const user = await loginWithPin(pinToUse, selectedUser?.id);
      if (user.role === 'kitchen') {
        router.push('/kds');
      } else {
        router.push('/pos');
      }
    } catch (err) {
      setError(err.message || 'PIN salah');
      setPin('');
    } finally {
      setLoading(false);
    }
  };

  // Quick 1-tap demo login helper
  const handleQuickDemoLogin = (user) => {
    setSelectedUser(user);
    const demoPin = demoPins[user.role];
    setPin(demoPin);
    handleLogin(demoPin);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-muted/30 to-background">
      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-8 items-center bg-card border rounded-3xl p-6 md:p-10 shadow-2xl">
        
        {/* Sisi Kiri: Info Restoran & Pemilihan Akun Demo */}
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shadow-lg font-black text-2xl">
              <Coffee className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight">Kopi & Resto Nusantara</h1>
              <p className="text-sm text-muted-foreground">Sistem POS Terpadu F&B</p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-muted/40 border border-muted">
            <div className="flex items-center gap-2 mb-2 text-xs font-bold uppercase tracking-wider text-primary">
              <ShieldCheck className="h-4 w-4" />
              <span>Pilih Karyawan (Klik untuk Cepat Masuk)</span>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {profiles.map((p) => {
                const isSelected = selectedUser?.id === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleQuickDemoLogin(p)}
                    className={`flex items-center justify-between p-3 rounded-xl text-left border transition-all ${
                      isSelected
                        ? 'border-primary bg-primary/10 shadow-sm font-bold'
                        : 'border-transparent hover:bg-muted/70 text-muted-foreground'
                    }`}
                  >
                    <div>
                      <p className="text-sm text-foreground">{p.name}</p>
                      <p className="text-xs uppercase font-mono tracking-wider opacity-75">
                        Peran: {p.role} · PIN: <span className="font-bold underline">{demoPins[p.role]}</span>
                      </p>
                    </div>
                    <span className="text-xs px-2 py-1 rounded-md bg-background border font-semibold">
                      Login
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Sisi Kanan: Keypad PIN */}
        <div className="flex flex-col items-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-2">
            <Lock className="h-7 w-7" />
          </div>

          <h2 className="text-xl font-bold tracking-tight">Masukkan PIN Karyawan</h2>
          <p className="text-xs text-muted-foreground text-center mt-1">
            Masuk sebagai: <span className="font-bold text-foreground">{selectedUser?.name}</span> ({selectedUser?.role})
          </p>

          {/* Dots */}
          <div className="flex justify-center items-center gap-3 py-4">
            {[0, 1, 2, 3, 4, 5].map((index) => (
              <div
                key={index}
                className={`h-4 w-4 rounded-full transition-all duration-200 ${
                  index < pin.length ? 'bg-primary scale-125' : 'bg-muted-foreground/30 scale-100'
                }`}
              />
            ))}
          </div>

          {error && <p className="text-xs text-destructive font-medium text-center mb-2">{error}</p>}

          {/* Touch Keypad */}
          <div className="grid grid-cols-3 gap-2 w-full max-w-[260px]">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
              <button
                key={digit}
                type="button"
                onClick={() => handleDigit(digit)}
                className="h-14 rounded-2xl bg-muted/60 text-xl font-bold hover:bg-muted active:scale-95 transition-all text-foreground select-none"
              >
                {digit}
              </button>
            ))}
            <button
              type="button"
              onClick={handleClear}
              className="h-14 rounded-2xl bg-muted/30 text-xs font-semibold hover:bg-muted text-muted-foreground active:scale-95 transition-all select-none"
            >
              HAPUS
            </button>
            <button
              type="button"
              onClick={() => handleDigit(0)}
              className="h-14 rounded-2xl bg-muted/60 text-xl font-bold hover:bg-muted active:scale-95 transition-all text-foreground select-none"
            >
              0
            </button>
            <button
              type="button"
              onClick={handleBackspace}
              className="h-14 rounded-2xl bg-muted/30 flex items-center justify-center hover:bg-muted text-muted-foreground active:scale-95 transition-all select-none"
            >
              <Delete className="h-5 w-5" />
            </button>
          </div>

          <Button
            onClick={() => handleLogin()}
            disabled={loading || pin.length < 4}
            className="w-full max-w-[260px] h-12 rounded-xl text-base font-bold shadow-md mt-4"
          >
            <Check className="mr-2 h-5 w-5" />
            {loading ? 'Masuk...' : 'Masuk Aplikasi'}
          </Button>
        </div>

      </div>
    </div>
  );
}
