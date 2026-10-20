'use client';

import React, { useState, useEffect } from 'react';
import { usePosStore } from '@/lib/store/usePosStore';
import { Lock, Delete, Users, Check } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export function LockScreenModal() {
  const { sessionLocked, unlockSession, currentUser, profiles, switchUser, lockSession } = usePosStore();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSwitchUser, setShowSwitchUser] = useState(false);

  // Auto-lock on idle (15 menit tanpa aktivitas sentuh/klik/ketik)
  useEffect(() => {
    let timer;
    const resetTimer = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        lockSession();
      }, 15 * 60 * 1000); // 15 menit
    };

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach((ev) => window.addEventListener(ev, resetTimer));
    resetTimer();

    return () => {
      clearTimeout(timer);
      events.forEach((ev) => window.removeEventListener(ev, resetTimer));
    };
  }, [lockSession]);

  if (!sessionLocked) return null;

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

  const handleUnlock = async () => {
    if (pin.length < 4) {
      setError('Masukkan minimal 4 digit PIN');
      return;
    }

    setLoading(true);
    const success = await unlockSession(pin);
    setLoading(false);

    if (success) {
      setPin('');
      setError('');
    } else {
      setError('PIN salah. Silakan coba lagi.');
      setPin('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-xl p-4">
      <div className="w-full max-w-sm flex flex-col items-center animate-in zoom-in-95">
        <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-primary text-primary-foreground shadow-xl mb-3">
          <Lock className="h-8 w-8" />
        </div>

        <h2 className="text-xl font-black tracking-tight text-center">Sesi Terkunci</h2>
        <p className="text-sm text-muted-foreground text-center mt-1">
          Karyawan: <span className="font-bold text-foreground">{currentUser?.name}</span> ({currentUser?.role})
        </p>

        {/* PIN Dots */}
        <div className="flex justify-center items-center gap-3 py-6">
          {[0, 1, 2, 3, 4, 5].map((index) => (
            <div
              key={index}
              className={`h-4 w-4 rounded-full transition-all duration-200 ${
                index < pin.length ? 'bg-primary scale-125' : 'bg-muted-foreground/30 scale-100'
              }`}
            />
          ))}
        </div>

        {error && <p className="text-sm text-destructive font-medium text-center mb-3">{error}</p>}

        {/* Numeric Keypad */}
        <div className="grid grid-cols-3 gap-2.5 w-full max-w-[280px]">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => handleDigit(digit)}
              className="h-16 rounded-2xl bg-muted/60 text-2xl font-bold hover:bg-muted active:scale-95 transition-all select-none"
            >
              {digit}
            </button>
          ))}
          <button
            type="button"
            onClick={handleClear}
            className="h-16 rounded-2xl bg-muted/30 text-xs font-semibold hover:bg-muted text-muted-foreground active:scale-95 transition-all select-none"
          >
            HAPUS
          </button>
          <button
            type="button"
            onClick={() => handleDigit(0)}
            className="h-16 rounded-2xl bg-muted/60 text-2xl font-bold hover:bg-muted active:scale-95 transition-all select-none"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleBackspace}
            className="h-16 rounded-2xl bg-muted/30 flex items-center justify-center hover:bg-muted text-muted-foreground active:scale-95 transition-all select-none"
          >
            <Delete className="h-6 w-6" />
          </button>
        </div>

        <div className="w-full max-w-[280px] mt-4 space-y-2">
          <Button
            onClick={handleUnlock}
            disabled={loading || pin.length < 4}
            className="w-full h-12 rounded-xl text-base font-bold shadow-md"
          >
            <Check className="mr-2 h-5 w-5" />
            {loading ? 'Membuka...' : 'Buka Kunci'}
          </Button>

          <Button
            variant="ghost"
            onClick={() => setShowSwitchUser(!showSwitchUser)}
            className="w-full text-xs text-muted-foreground hover:text-foreground"
          >
            <Users className="mr-1.5 h-3.5 w-3.5" />
            Ganti Pengguna Lain
          </Button>
        </div>

        {/* Switch User List */}
        {showSwitchUser && (
          <div className="mt-4 w-full max-w-[280px] p-2 rounded-2xl border bg-card shadow-lg space-y-1 animate-in fade-in">
            {profiles.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  switchUser(p.id);
                  setPin('');
                  setError('');
                  setShowSwitchUser(false);
                }}
                className={`w-full flex items-center justify-between p-2 rounded-xl text-xs transition-colors ${
                  p.id === currentUser?.id ? 'bg-primary text-primary-foreground font-bold' : 'hover:bg-muted'
                }`}
              >
                <span>{p.name}</span>
                <span className="uppercase text-[10px] opacity-75">{p.role}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
