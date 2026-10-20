'use client';

import React, { useState } from 'react';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Lock, Delete, Check } from 'lucide-react';

export function PinPadDialog({
  open,
  onClose,
  onSuccess,
  title = 'Verifikasi PIN Manajer',
  description = 'Aksi sensitif ini memerlukan otorisasi PIN Manajer atau Owner.',
  requireReason = false,
}) {
  const [pin, setPin] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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

  const handleSubmit = async () => {
    if (pin.length < 4) {
      setError('PIN minimal 4 digit');
      return;
    }
    if (requireReason && (!reason || reason.trim().length < 3)) {
      setError('Alasan pembatalan/diskon wajib diisi minimal 3 karakter');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await onSuccess(pin, reason);
      setPin('');
      setReason('');
      onClose();
    } catch (err) {
      setError(err.message || 'PIN tidak valid');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="max-w-md">
      <DialogHeader>
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 dark:bg-amber-950 text-amber-600 mb-2">
          <Lock className="h-7 w-7" />
        </div>
        <DialogTitle className="text-center">{title}</DialogTitle>
        <DialogDescription className="text-center">{description}</DialogDescription>
      </DialogHeader>

      <div className="space-y-4 my-2">
        {requireReason && (
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">
              Alasan Otorisasi
            </label>
            <Input
              placeholder="Contoh: Tamu salah pesan / salah input..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="text-sm"
            />
          </div>
        )}

        {/* PIN Indicators */}
        <div className="flex justify-center items-center gap-3 py-3">
          {[0, 1, 2, 3, 4, 5].map((index) => (
            <div
              key={index}
              className={`h-4 w-4 rounded-full transition-all duration-200 ${
                index < pin.length
                  ? 'bg-primary scale-110'
                  : 'bg-muted-foreground/30 scale-100'
              }`}
            />
          ))}
        </div>

        {error && (
          <p className="text-sm text-center text-destructive font-medium animate-shake">
            {error}
          </p>
        )}

        {/* Touch Keypad */}
        <div className="grid grid-cols-3 gap-2.5 max-w-[280px] mx-auto pt-2">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => handleDigit(digit)}
              className="h-16 rounded-2xl bg-muted/60 text-xl font-bold hover:bg-muted active:scale-95 transition-all text-foreground select-none"
            >
              {digit}
            </button>
          ))}
          <button
            type="button"
            onClick={handleClear}
            className="h-16 rounded-2xl bg-muted/30 text-sm font-semibold hover:bg-muted text-muted-foreground active:scale-95 transition-all select-none"
          >
            HAPUS
          </button>
          <button
            type="button"
            onClick={() => handleDigit(0)}
            className="h-16 rounded-2xl bg-muted/60 text-xl font-bold hover:bg-muted active:scale-95 transition-all text-foreground select-none"
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
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onClose} disabled={loading} className="w-full sm:w-auto">
          Batal
        </Button>
        <Button onClick={handleSubmit} disabled={loading || pin.length < 4} className="w-full sm:w-auto">
          <Check className="mr-2 h-4 w-4" />
          {loading ? 'Memverifikasi...' : 'Konfirmasi PIN'}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
