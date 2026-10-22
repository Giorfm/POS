'use client';

import React, { useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';
import Link from 'next/link';

export default function GlobalErrorPage({ error, reset }) {
  useEffect(() => {
    console.error('Unhandled app error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="max-w-md w-full bg-card border rounded-3xl p-8 shadow-2xl text-center space-y-4">
        <div className="h-16 w-16 mx-auto rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center">
          <AlertCircle className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-bold tracking-tight">Terjadi Kesalahan Sistem</h2>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {error?.message || 'Aplikasi mengalami kendala teknis sementara. Data Anda tersimpan aman secara lokal.'}
        </p>
        <div className="flex items-center justify-center gap-3 pt-4 border-t">
          <Button onClick={() => reset()} variant="default" className="font-bold text-xs gap-2">
            <RefreshCw className="h-4 w-4" />
            Coba Lagi
          </Button>
          <Link href="/pos">
            <Button variant="outline" className="font-bold text-xs gap-2">
              <Home className="h-4 w-4" />
              Ke Kasir
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
