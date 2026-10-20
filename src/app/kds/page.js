'use client';

import React, { useState, useEffect } from 'react';
import { usePosStore } from '@/lib/store/usePosStore';
import { formatTime, formatDuration, getDurationMinutes } from '@/lib/formatters';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { useToast } from '@/components/ui/Toaster';
import { 
  UtensilsCrossed, 
  Clock, 
  Check, 
  Printer, 
  Volume2, 
  VolumeX, 
  Filter, 
  ChevronRight, 
  AlertOctagon,
  RefreshCw,
  Maximize2
} from 'lucide-react';
import Link from 'next/link';

export default function KitchenDisplaySystemPage() {
  const { 
    orders, 
    categories, 
    updateOrderItemStatus, 
    kdsStationFilter, 
    setKdsFilter,
    tables 
  } = usePosStore();
  const { showToast } = useToast();

  const [soundEnabled, setSoundEnabled] = useState(true);
  const [now, setNow] = useState(Date.now());

  // Tick timer every 10 seconds to update color and minutes elapsed
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  // Filter pesanan aktif yang relevan untuk KDS (status: 'sent' atau 'ready', belum selesai 'completed')
  const activeOrders = orders
    .filter((o) => o.status === 'sent' || o.status === 'ready' || o.items.some((i) => i.status === 'preparing' || i.status === 'new'))
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()); // FIFO (First In First Out)

  const stations = ['all', 'Bar', 'Grill', 'Dessert', 'Kitchen'];

  // Print tiket dapur fallback
  const handlePrintKitchenTicket = (order) => {
    showToast(`Mencetak tiket dapur untuk ${order.order_number}...`, 'info');
    window.print();
  };

  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col select-none">
      
      {/* HEADER KDS FULLSCREEN */}
      <header className="h-16 px-6 bg-slate-900 border-b border-slate-800 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-4">
          <Link href="/pos" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="h-9 w-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black text-lg">
              <UtensilsCrossed className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-black text-sm tracking-wide text-white uppercase">
                Kitchen Display System (KDS)
              </h1>
              <p className="text-[11px] text-slate-400">
                Antrean FIFO Dapur Real-time
              </p>
            </div>
          </Link>

          {/* Filter Stasiun Dapur */}
          <div className="hidden sm:flex items-center gap-1.5 ml-4 pl-4 border-l border-slate-800">
            <Filter className="h-4 w-4 text-slate-500 mr-1" />
            {stations.map((st) => (
              <button
                key={st}
                onClick={() => setKdsFilter(st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  kdsStationFilter === st
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {st === 'all' ? 'Semua Stasiun' : st}
              </button>
            ))}
          </div>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2 text-xs font-mono font-bold text-emerald-400 bg-emerald-950/60 px-3 py-1.5 rounded-xl border border-emerald-800">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
            <span>{activeOrders.length} Tiket Aktif</span>
          </div>

          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="h-10 w-10 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-colors"
            title={soundEnabled ? 'Matikan Suara Lonceng' : 'Nyalakan Suara Lonceng'}
          >
            {soundEnabled ? <Volume2 className="h-5 w-5 text-emerald-400" /> : <VolumeX className="h-5 w-5 text-rose-400" />}
          </button>

          <button
            type="button"
            onClick={handleToggleFullscreen}
            className="h-10 w-10 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-colors"
            title="Layar Penuh"
          >
            <Maximize2 className="h-5 w-5" />
          </button>

          <Link href="/pos">
            <Button size="sm" variant="outline" className="text-xs bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700">
              Kembali ke POS
            </Button>
          </Link>
        </div>
      </header>

      {/* FILTER MOBILE TABS */}
      <div className="sm:hidden flex items-center gap-1 p-2 bg-slate-900 border-b border-slate-800 overflow-x-auto">
        {stations.map((st) => (
          <button
            key={st}
            onClick={() => setKdsFilter(st)}
            className={`px-3 py-1 rounded-md text-xs font-bold whitespace-nowrap ${
              kdsStationFilter === st ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400'
            }`}
          >
            {st === 'all' ? 'Semua' : st}
          </button>
        ))}
      </div>

      {/* TIKET CONTAINER (RESPONSIF KARTU FIFO) */}
      <main className="flex-1 p-4 md:p-6 overflow-x-auto">
        {activeOrders.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 py-32">
            <UtensilsCrossed className="h-16 w-16 mb-4 opacity-30 animate-pulse" />
            <h2 className="text-xl font-black text-slate-300">Semua Pesanan Selesai Disajikan</h2>
            <p className="text-sm mt-1">Dapur saat ini bersih dari antrean tiket pesanan.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 items-start">
            {activeOrders.map((order, orderIndex) => {
              const minutes = getDurationMinutes(order.created_at);
              const tableName = order.table_id ? tables.find((t) => t.id === order.table_id)?.name : null;

              // Filter item sesuai stasiun jika filter aktif
              const displayedItems = order.items.filter((item) => {
                if (kdsStationFilter === 'all') return true;
                const cat = categories.find((c) => c.id === item.product_id); // atau cari produk
                const product = usePosStore.getState().products.find((p) => p.id === item.product_id);
                const category = categories.find((c) => c.id === product?.category_id);
                return category?.station === kdsStationFilter;
              });

              if (displayedItems.length === 0) return null;

              // Warna timer KDS sesuai PRD:
              // Hijau: < 10 menit
              // Kuning: 10 - 15 menit
              // Merah: > 15 menit
              let timerColor = 'bg-emerald-500 text-slate-950 font-black';
              let cardBorder = 'border-slate-800';
              if (minutes >= 10 && minutes < 15) {
                timerColor = 'bg-amber-400 text-slate-950 font-black';
                cardBorder = 'border-amber-500/60';
              } else if (minutes >= 15) {
                timerColor = 'bg-rose-600 text-white font-black animate-pulse';
                cardBorder = 'border-rose-500';
              }

              // Label sumber pesanan (Dine-in / QR / GoFood / GrabFood / ShopeeFood)
              const sourceColors = {
                pos: 'bg-slate-700 text-slate-200',
                qr: 'bg-sky-600 text-white',
                gofood: 'bg-red-600 text-white',
                grabfood: 'bg-emerald-600 text-white',
                shopeefood: 'bg-orange-600 text-white',
              };

              return (
                <div
                  key={order.id}
                  className={`bg-slate-900 rounded-2xl border-2 ${cardBorder} shadow-xl flex flex-col overflow-hidden transition-all`}
                >
                  {/* Tiket Header */}
                  <div className="p-3 bg-slate-800/80 border-b border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-black text-sm text-white">
                          {tableName || order.customer_name || 'Takeaway'}
                        </span>
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${sourceColors[order.source] || 'bg-slate-700'}`}>
                          {order.source}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                        {order.order_number} · {formatTime(order.created_at)}
                      </p>
                    </div>

                    {/* Timer Durasi Berwarna */}
                    <div className={`px-2.5 py-1 rounded-xl flex items-center gap-1 text-xs font-mono shadow-sm ${timerColor}`}>
                      <Clock className="h-3.5 w-3.5" />
                      <span>{formatDuration(minutes)}</span>
                    </div>
                  </div>

                  {/* Daftar Item Tiket Dapur */}
                  <div className="p-3 space-y-3 flex-1 divide-y divide-slate-800">
                    {displayedItems.map((item) => {
                      const isVoid = item.status === 'void';
                      const isReady = item.status === 'ready';
                      const isServed = item.status === 'served';
                      const isPreparing = item.status === 'preparing' || item.status === 'new';

                      return (
                        <div key={item.id} className="pt-3 first:pt-0 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className={`text-base font-black ${isVoid ? 'line-through text-rose-400' : isReady ? 'text-emerald-400' : 'text-white'}`}>
                                  {item.qty}x {item.name_snapshot}
                                </span>

                                {/* Penanda TAMBAHAN dan BATAL */}
                                {item.is_additional && (
                                  <span className="px-1.5 py-0.2 rounded bg-amber-500 text-slate-950 text-[10px] font-black tracking-wider">
                                    TAMBAHAN
                                  </span>
                                )}
                                {isVoid && (
                                  <span className="px-1.5 py-0.2 rounded bg-rose-600 text-white text-[10px] font-black tracking-wider">
                                    BATAL
                                  </span>
                                )}
                              </div>

                              {/* Modifiers List */}
                              {item.modifiers && item.modifiers.length > 0 && (
                                <div className="text-xs text-slate-400 pl-2 mt-1 space-y-0.5 font-medium">
                                  {item.modifiers.map((m, mIdx) => (
                                    <div key={mIdx} className="text-amber-300">
                                      • {m.name || m.name_snapshot}
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* Catatan Khusus */}
                              {item.notes && (
                                <p className="text-xs italic text-yellow-300 pl-2 mt-1 font-semibold bg-yellow-950/40 p-1 rounded border border-yellow-800/40">
                                  Catatan: {item.notes}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Tombol Sentuh Besar Transisi Status */}
                          {!isVoid && (
                            <div className="pt-1 flex gap-2">
                              {isPreparing && (
                                <button
                                  type="button"
                                  onClick={() => updateOrderItemStatus(order.id, item.id, 'ready')}
                                  className="w-full h-11 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-black text-xs transition-all flex items-center justify-center gap-1.5 shadow-md"
                                >
                                  <Check className="h-4 w-4" />
                                  <span>Tandai SIAP</span>
                                </button>
                              )}

                              {isReady && (
                                <button
                                  type="button"
                                  onClick={() => updateOrderItemStatus(order.id, item.id, 'served')}
                                  className="w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-black text-xs transition-all flex items-center justify-center gap-1.5 shadow-md"
                                >
                                  <Check className="h-4 w-4" />
                                  <span>Tandai DISAJIKAN</span>
                                </button>
                              )}

                              {isServed && (
                                <div className="w-full h-9 rounded-xl bg-slate-800 text-slate-400 text-xs font-bold flex items-center justify-center gap-1">
                                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                                  <span>Sudah Disajikan</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Tiket Footer */}
                  <div className="p-3 bg-slate-800/40 border-t border-slate-800 flex items-center justify-between text-xs">
                    <button
                      type="button"
                      onClick={() => handlePrintKitchenTicket(order)}
                      className="text-slate-400 hover:text-white flex items-center gap-1 font-semibold transition-colors"
                      title="Cetak Tiket Kertas"
                    >
                      <Printer className="h-3.5 w-3.5" />
                      <span>Cetak</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        // Tandai seluruh item di tiket ini siap
                        order.items.forEach((it) => {
                          if (it.status === 'preparing' || it.status === 'new') {
                            updateOrderItemStatus(order.id, it.id, 'ready');
                          }
                        });
                        showToast(`Semua item di ${order.order_number} ditandai SIAP`, 'success');
                      }}
                      className="font-bold text-emerald-400 hover:underline"
                    >
                      Siapkan Semua
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

    </div>
  );
}
