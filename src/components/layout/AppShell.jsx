'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { LockScreenModal } from '@/components/auth/LockScreenModal';
import { ThermalReceiptModal } from '@/components/receipt/ThermalReceipt';
import { usePosStore } from '@/lib/store/usePosStore';

export function AppShell({ children }) {
  const pathname = usePathname();
  const { lastReceiptData } = usePosStore();
  const [showReceipt, setShowReceipt] = React.useState(false);

  React.useEffect(() => {
    if (lastReceiptData) {
      setShowReceipt(true);
    }
  }, [lastReceiptData]);

  // Halaman khusus tanpa header/sidebar POS: QR Self-Order (/t/[token]) dan KDS Layar Dapur (/kds)
  const isPublicOrFullscreen = pathname.startsWith('/t/') || pathname === '/kds' || pathname === '/login';

  if (isPublicOrFullscreen) {
    return (
      <div className="min-h-screen bg-background">
        {children}
        {!pathname.startsWith('/t/') && pathname !== '/login' && <LockScreenModal />}
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-muted/10">
          {children}
        </main>
      </div>

      <LockScreenModal />

      {lastReceiptData && (
        <ThermalReceiptModal
          open={showReceipt}
          onClose={() => setShowReceipt(false)}
          data={lastReceiptData}
        />
      )}
    </div>
  );
}
