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

  // Real-time synchronization: Cross-tab & multi-device (smartphone/tablet -> POS & KDS)
  React.useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleSyncFromStorage = () => {
      try {
        if (usePosStore.persist && typeof usePosStore.persist.rehydrate === 'function') {
          usePosStore.persist.rehydrate();
        }
      } catch (err) {
        console.warn('Gagal rehydrate store:', err);
      }
    };

    // 1. Cross-tab instant communication via BroadcastChannel
    let channel = null;
    if ('BroadcastChannel' in window) {
      try {
        channel = new BroadcastChannel('pos_fb_sync_channel');
        channel.onmessage = (event) => {
          if (event.data?.type === 'STATE_CHANGED') {
            handleSyncFromStorage();
          }
        };
      } catch (e) {
        // Fallback ke storage event
      }
    }

    // 2. Storage event listener when another tab updates localStorage
    const onStorageChange = (e) => {
      if (e.key === 'pos-fb-storage') {
        handleSyncFromStorage();
      }
    };
    window.addEventListener('storage', onStorageChange);

    // 3. Multi-device background sync with Next.js server API
    const syncWithServer = async () => {
      try {
        const res = await fetch('/api/orders');
        if (!res.ok) return;
        const data = await res.json();
        if (data.orders && Array.isArray(data.orders) && data.orders.length > 0) {
          const { mergeExternalOrders } = usePosStore.getState();
          if (typeof mergeExternalOrders === 'function') {
            mergeExternalOrders(data.orders, data.bills || [], data.tables || []);
          }
        }
      } catch {
        // Ignore network errors in dev/offline
      }
    };

    // Initial push local state to server (only for staff pages to seed server)
    if (!pathname.startsWith('/t/')) {
      const pushLocalState = async () => {
        try {
          const { orders, bills, tables, deliveryOrders } = usePosStore.getState();
          await fetch('/api/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'sync_state',
              orders,
              bills,
              tables,
              deliveryOrders,
            }),
          });
        } catch {}
      };
      pushLocalState();
    }

    // Polling server every 3s to capture orders created from other devices (e.g. mobile phones)
    const interval = setInterval(syncWithServer, 3000);

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        handleSyncFromStorage();
        syncWithServer();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      if (channel) channel.close();
      window.removeEventListener('storage', onStorageChange);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      clearInterval(interval);
    };
  }, [pathname]);

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
