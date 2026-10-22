'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Coffee, Home } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="max-w-md w-full bg-card border rounded-3xl p-8 shadow-2xl text-center space-y-4">
        <div className="h-16 w-16 mx-auto rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
          <Coffee className="h-8 w-8" />
        </div>
        <h2 className="text-2xl font-black tracking-tight">404 - Halaman Tidak Ditemukan</h2>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Halaman yang Anda tuju tidak ditemukan dalam sistem POS Kopi & Resto Nusantara.
        </p>
        <div className="pt-4 border-t">
          <Link href="/pos">
            <Button variant="default" className="font-bold text-xs gap-2 w-full">
              <Home className="h-4 w-4" />
              Kembali ke Terminal POS
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
