'use client';

/**
 * @file src/app/delivery/page.js
 * Modul Integrasi Pesanan Online Delivery (GoFood, GrabFood, ShopeeFood).
 * Menampilkan pesanan real-time dari platform pengantaran makanan dengan
 * alur terima/tolak, pemantauan kurir/driver, rekonsiliasi komisi platform (20%),
 * pemetaan SKU (sku_mappings), dan simulator pesanan masuk untuk uji coba tanpa API key.
 */

import React, { useState, useMemo } from 'react';
import { usePosStore } from '@/lib/store/usePosStore';
import { formatRupiah } from '@/lib/formatters';
import { useToast } from '@/components/ui/Toaster';
import {
  Truck,
  Sparkles,
  CheckCircle2,
  XCircle,
  Clock,
  Phone,
  User,
  ShoppingBag,
  ExternalLink,
  Plus,
  Trash2,
  AlertTriangle,
  RefreshCw,
  Search,
  Filter,
  DollarSign,
  Layers,
  ChefHat,
  ArrowRight,
  X,
} from 'lucide-react';

export default function DeliveryPage() {
  const {
    deliveryOrders,
    orders,
    products,
    skuMappings,
    simulateDeliveryOrder,
    acceptDeliveryOrder,
    rejectDeliveryOrder,
    updateDeliveryStatus,
    addSkuMapping,
    deleteSkuMapping,
  } = usePosStore();

  const { addToast } = useToast();

  const [activeTab, setActiveTab] = useState('orders'); // 'orders' | 'mappings'
  const [platformFilter, setPlatformFilter] = useState('all'); // 'all' | 'gofood' | 'grabfood' | 'shopeefood'
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'incoming' | 'accepted' | 'ready_for_pickup' | 'completed' | 'rejected'
  const [searchQuery, setSearchQuery] = useState('');

  // Simulation Modal State
  const [showSimulateModal, setShowSimulateModal] = useState(false);
  const [simPlatform, setSimPlatform] = useState('gofood');

  // Reject Modal State
  const [rejectingOrder, setRejectingOrder] = useState(null);
  const [rejectReason, setRejectReason] = useState('Bahan baku habis');

  // New SKU Mapping Modal State
  const [showAddMappingModal, setShowAddMappingModal] = useState(false);
  const [newMappingPlatform, setNewMappingPlatform] = useState('gofood');
  const [newMappingSku, setNewMappingSku] = useState('');
  const [newMappingProductId, setNewMappingProductId] = useState('');

  // Gabungkan data deliveryOrders dengan detail order POS
  const enrichedDeliveryOrders = useMemo(() => {
    return deliveryOrders.map((del) => {
      const order = orders.find((o) => o.id === del.order_id);
      return {
        ...del,
        order,
      };
    });
  }, [deliveryOrders, orders]);

  // Filter pesanan
  const filteredOrders = useMemo(() => {
    return enrichedDeliveryOrders.filter((item) => {
      const matchPlatform =
        platformFilter === 'all' || item.platform === platformFilter;
      const matchStatus =
        statusFilter === 'all' || item.status === statusFilter;
      const matchSearch =
        item.external_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.order?.customer_name &&
          item.order.customer_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.driver_name &&
          item.driver_name.toLowerCase().includes(searchQuery.toLowerCase()));

      return matchPlatform && matchStatus && matchSearch;
    });
  }, [enrichedDeliveryOrders, platformFilter, statusFilter, searchQuery]);

  // Statistik Ringkasan
  const stats = useMemo(() => {
    const totalCount = enrichedDeliveryOrders.length;
    const completedCount = enrichedDeliveryOrders.filter((d) => d.status === 'completed').length;
    const grossTotal = enrichedDeliveryOrders
      .filter((d) => d.status !== 'rejected')
      .reduce((sum, d) => sum + (d.order?.total || 0), 0);
    const totalCommission = enrichedDeliveryOrders
      .filter((d) => d.status !== 'rejected')
      .reduce((sum, d) => sum + (Number(d.commission_amount) || 0), 0);
    const netTotal = grossTotal - totalCommission;

    return { totalCount, completedCount, grossTotal, totalCommission, netTotal };
  }, [enrichedDeliveryOrders]);

  // Handler Simulasi Pesanan Masuk
  const handleTriggerSimulation = () => {
    try {
      const result = simulateDeliveryOrder(simPlatform);
      setShowSimulateModal(false);
      addToast(
        `Pesanan simulasi ${simPlatform.toUpperCase()} (${result.deliveryOrder.external_id}) berhasil dibuat!`,
        'success'
      );
    } catch (err) {
      addToast(err.message || 'Gagal membuat simulasi pesanan', 'error');
    }
  };

  // Handler Terima Pesanan
  const handleAccept = (delId) => {
    acceptDeliveryOrder(delId);
    addToast('Pesanan diterima & diteruskan ke Dapur (KDS)!', 'success');
  };

  // Handler Konfirmasi Tolak Pesanan
  const handleConfirmReject = () => {
    if (!rejectingOrder) return;
    rejectDeliveryOrder(rejectingOrder.id, rejectReason);
    setRejectingOrder(null);
    addToast('Pesanan telah ditolak dan dibatalkan', 'info');
  };

  // Handler Tambah Mapping SKU Baru
  const handleSaveMapping = (e) => {
    e.preventDefault();
    if (!newMappingSku.trim() || !newMappingProductId) {
      addToast('Harap lengkapi semua bidang form pemetaan', 'error');
      return;
    }

    addSkuMapping({
      platform: newMappingPlatform,
      external_sku: newMappingSku.trim().toUpperCase(),
      product_id: newMappingProductId,
    });

    setNewMappingSku('');
    setShowAddMappingModal(false);
    addToast('Pemetaan SKU baru berhasil disimpan', 'success');
  };

  // Helper tampilan badge platform
  const getPlatformBadge = (platform) => {
    switch (platform) {
      case 'gofood':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-black bg-red-500/10 text-red-600 border border-red-500/20">
            <span className="h-2 w-2 rounded-full bg-red-600" />
            GoFood
          </span>
        );
      case 'grabfood':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-black bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
            <span className="h-2 w-2 rounded-full bg-emerald-600" />
            GrabFood
          </span>
        );
      case 'shopeefood':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-black bg-orange-500/10 text-orange-600 border border-orange-500/20">
            <span className="h-2 w-2 rounded-full bg-orange-600" />
            ShopeeFood
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-muted text-muted-foreground">
            {platform}
          </span>
        );
    }
  };

  // Helper tampilan badge status
  const getStatusBadge = (status) => {
    switch (status) {
      case 'incoming':
        return (
          <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-500/15 text-amber-700 animate-pulse">
            Perlu Konfirmasi
          </span>
        );
      case 'accepted':
      case 'preparing':
        return (
          <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-500/15 text-blue-700">
            Sedang Disiapkan
          </span>
        );
      case 'ready_for_pickup':
        return (
          <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-500/15 text-purple-700">
            Menunggu Driver
          </span>
        );
      case 'completed':
        return (
          <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-500/15 text-emerald-700">
            Selesai Diambil
          </span>
        );
      case 'rejected':
        return (
          <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-destructive/15 text-destructive">
            Ditolak
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-xs bg-muted text-muted-foreground">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold">
              <Truck className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight">Integrasi Delivery Online</h1>
              <p className="text-xs text-muted-foreground">
                Pesanan terpusat dari GoFood, GrabFood, dan ShopeeFood
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowSimulateModal(true)}
            className="h-10 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black text-xs flex items-center gap-2 shadow-md hover:opacity-95 active:scale-95 transition-all"
          >
            <Sparkles className="h-4 w-4" />
            <span>Simulasi Pesanan Masuk (Mock)</span>
          </button>
        </div>
      </div>

      {/* STATS OVERVIEW CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-card border shadow-sm space-y-1">
          <span className="text-xs text-muted-foreground font-semibold">Total Pesanan Online</span>
          <p className="text-2xl font-black">{stats.totalCount}</p>
          <span className="text-[11px] text-muted-foreground">{stats.completedCount} pesanan selesai</span>
        </div>

        <div className="p-4 rounded-2xl bg-card border shadow-sm space-y-1">
          <span className="text-xs text-muted-foreground font-semibold">Omset Kotor (Gross)</span>
          <p className="text-2xl font-black text-foreground">{formatRupiah(stats.grossTotal)}</p>
          <span className="text-[11px] text-muted-foreground">Sebelum potongan platform</span>
        </div>

        <div className="p-4 rounded-2xl bg-card border shadow-sm space-y-1">
          <span className="text-xs text-muted-foreground font-semibold">Komisi Platform (20%)</span>
          <p className="text-2xl font-black text-destructive">{formatRupiah(stats.totalCommission)}</p>
          <span className="text-[11px] text-muted-foreground">Biaya bagi hasil mitra</span>
        </div>

        <div className="p-4 rounded-2xl bg-card border shadow-sm space-y-1">
          <span className="text-xs text-muted-foreground font-semibold">Pendapatan Bersih (Net)</span>
          <p className="text-2xl font-black text-emerald-600">{formatRupiah(stats.netTotal)}</p>
          <span className="text-[11px] text-emerald-600 font-semibold">Diterima restoran</span>
        </div>
      </div>

      {/* TAB NAVIGATION */}
      <div className="flex items-center gap-2 border-b pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('orders')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'orders'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:bg-muted'
          }`}
        >
          <ShoppingBag className="h-4 w-4" />
          <span>Pesanan Masuk & Aktif ({enrichedDeliveryOrders.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('mappings')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'mappings'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:bg-muted'
          }`}
        >
          <Layers className="h-4 w-4" />
          <span>Pemetaan SKU ({skuMappings.length})</span>
        </button>
      </div>

      {/* TAB 1: PESANAN DELIVERY */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          {/* FILTER CONTROLS */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-card p-3 rounded-2xl border shadow-sm">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
              <span className="text-xs font-bold text-muted-foreground whitespace-nowrap">Platform:</span>
              <button
                type="button"
                onClick={() => setPlatformFilter('all')}
                className={`px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap ${
                  platformFilter === 'all'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:text-foreground'
                }`}
              >
                Semua
              </button>
              <button
                type="button"
                onClick={() => setPlatformFilter('gofood')}
                className={`px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap ${
                  platformFilter === 'gofood'
                    ? 'bg-red-600 text-white'
                    : 'bg-muted text-muted-foreground hover:text-foreground'
                }`}
              >
                GoFood
              </button>
              <button
                type="button"
                onClick={() => setPlatformFilter('grabfood')}
                className={`px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap ${
                  platformFilter === 'grabfood'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-muted text-muted-foreground hover:text-foreground'
                }`}
              >
                GrabFood
              </button>
              <button
                type="button"
                onClick={() => setPlatformFilter('shopeefood')}
                className={`px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap ${
                  platformFilter === 'shopeefood'
                    ? 'bg-orange-600 text-white'
                    : 'bg-muted text-muted-foreground hover:text-foreground'
                }`}
              >
                ShopeeFood
              </button>
            </div>

            <div className="relative min-w-[220px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari ID pesanan atau driver..."
                className="w-full h-9 pl-9 pr-3 rounded-xl border bg-background text-xs focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          {/* LIST PESANAN */}
          {filteredOrders.length === 0 ? (
            <div className="text-center py-16 bg-card border rounded-3xl p-8 space-y-3">
              <Truck className="h-12 w-12 mx-auto text-muted-foreground/30" />
              <h3 className="font-bold text-base">Belum Ada Pesanan Delivery</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Pesanan dari GoFood, GrabFood, atau ShopeeFood akan otomatis muncul di sini.
                Klik tombol simulasi di atas untuk menguji coba pesanan baru.
              </p>
              <button
                type="button"
                onClick={() => setShowSimulateModal(true)}
                className="h-9 px-4 rounded-xl bg-primary text-primary-foreground text-xs font-bold"
              >
                Uji Coba Simulasi
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredOrders.map((del) => {
                const order = del.order;
                const isIncoming = del.status === 'incoming';
                const isAccepted = del.status === 'accepted';
                const isReady = del.status === 'ready_for_pickup';

                return (
                  <div
                    key={del.id}
                    className="bg-card border rounded-3xl p-5 shadow-sm space-y-4 flex flex-col justify-between hover:border-primary/40 transition-all"
                  >
                    {/* Top Row: Platform & Status */}
                    <div className="flex items-center justify-between gap-2 border-b pb-3">
                      <div className="flex items-center gap-2">
                        {getPlatformBadge(del.platform)}
                        <span className="font-mono font-black text-sm">{del.external_id}</span>
                      </div>
                      <div>{getStatusBadge(del.status)}</div>
                    </div>

                    {/* Customer & Driver Info */}
                    <div className="grid grid-cols-2 gap-2 p-3 rounded-2xl bg-muted/40 text-xs">
                      <div>
                        <span className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1">
                          <User className="h-3 w-3" /> Pelanggan
                        </span>
                        <p className="font-bold text-foreground truncate">
                          {order?.customer_name || 'Pelanggan Online'}
                        </p>
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1">
                          <Truck className="h-3 w-3" /> Driver / Kurir
                        </span>
                        <p className="font-bold text-foreground truncate">
                          {del.driver_name || 'Menunggu Driver'}
                        </p>
                        {del.driver_phone && (
                          <span className="text-[10px] text-muted-foreground">{del.driver_phone}</span>
                        )}
                      </div>
                    </div>

                    {/* Items List */}
                    <div className="space-y-1.5 flex-1">
                      <span className="text-[11px] font-bold text-muted-foreground">Item Pesanan:</span>
                      <div className="divide-y text-xs">
                        {order?.items?.map((item, idx) => (
                          <div key={item.id || idx} className="py-1.5 flex justify-between items-start gap-2">
                            <div>
                              <p className="font-semibold text-foreground">
                                <span className="font-bold text-primary mr-1.5">{item.qty}x</span>
                                {item.name_snapshot}
                              </p>
                              {item.notes && (
                                <p className="text-[10px] text-amber-600 bg-amber-500/10 px-1.5 py-0.2 rounded inline-block mt-0.5">
                                  Catatan: {item.notes}
                                </p>
                              )}
                            </div>
                            <span className="font-mono text-muted-foreground">
                              {formatRupiah(item.price_snapshot * item.qty)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Financial Summary */}
                    <div className="p-3 rounded-2xl bg-muted/20 border text-xs space-y-1">
                      <div className="flex justify-between text-muted-foreground">
                        <span>Nilai Pesanan:</span>
                        <span className="font-bold text-foreground">{formatRupiah(order?.total || 0)}</span>
                      </div>
                      <div className="flex justify-between text-destructive">
                        <span>Komisi Mitra ({Math.round(del.commission_rate * 100)}%):</span>
                        <span>-{formatRupiah(del.commission_amount)}</span>
                      </div>
                      <div className="flex justify-between font-black pt-1 border-t text-sm text-emerald-600">
                        <span>Pendapatan Bersih:</span>
                        <span>{formatRupiah((order?.total || 0) - del.commission_amount)}</span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="pt-2 flex items-center gap-2">
                      {isIncoming && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleAccept(del.id)}
                            className="flex-1 h-10 rounded-xl bg-emerald-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-emerald-700 shadow-sm"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                            Terima Pesanan
                          </button>
                          <button
                            type="button"
                            onClick={() => setRejectingOrder(del)}
                            className="h-10 px-3 rounded-xl border border-destructive text-destructive font-bold text-xs hover:bg-destructive/10"
                          >
                            Tolak
                          </button>
                        </>
                      )}

                      {isAccepted && (
                        <button
                          type="button"
                          onClick={() => updateDeliveryStatus(del.id, 'ready_for_pickup')}
                          className="w-full h-10 rounded-xl bg-purple-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-purple-700 shadow-sm"
                        >
                          <ChefHat className="h-4 w-4" />
                          Tandai Makanan Siap (Driver Call)
                        </button>
                      )}

                      {isReady && (
                        <button
                          type="button"
                          onClick={() => updateDeliveryStatus(del.id, 'completed')}
                          className="w-full h-10 rounded-xl bg-emerald-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-emerald-700 shadow-sm"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          Driver Sudah Ambil (Selesaikan)
                        </button>
                      )}

                      {del.status === 'completed' && (
                        <div className="w-full py-2 text-center text-xs font-bold text-muted-foreground bg-muted/40 rounded-xl">
                          Pesanan Selesai
                        </div>
                      )}

                      {del.status === 'rejected' && (
                        <div className="w-full py-2 text-center text-xs font-bold text-destructive bg-destructive/10 rounded-xl">
                          Pesanan Dibatalkan
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: PEMETAAN SKU */}
      {activeTab === 'mappings' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card p-4 rounded-3xl border shadow-sm">
            <div className="space-y-1">
              <h3 className="font-black text-sm">Daftar Pemetaan SKU Eksternal</h3>
              <p className="text-xs text-muted-foreground max-w-xl">
                Kode SKU pada menu aplikasi delivery dipetakan ke produk internal POS agar
                pemotongan stok dan pencatatan laporan tetap akurat. Pesanan dengan SKU baru yang
                belum terdaftar akan tetap diproses dengan status &quot;Perlu Pemetaan&quot;.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowAddMappingModal(true)}
              className="h-10 px-4 rounded-xl bg-primary text-primary-foreground font-black text-xs flex items-center gap-1.5 shadow-sm shrink-0"
            >
              <Plus className="h-4 w-4" />
              <span>Tambah Pemetaan SKU</span>
            </button>
          </div>

          <div className="bg-card border rounded-3xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/50 border-b text-muted-foreground font-bold">
                  <tr>
                    <th className="p-3.5 pl-6">Platform</th>
                    <th className="p-3.5">Kode SKU Eksternal</th>
                    <th className="p-3.5">Produk POS Nusantara</th>
                    <th className="p-3.5">Harga Produk</th>
                    <th className="p-3.5 pr-6 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {skuMappings.map((mapItem, idx) => {
                    const product = products.find((p) => p.id === mapItem.product_id);

                    return (
                      <tr key={idx} className="hover:bg-muted/30 transition-colors">
                        <td className="p-3.5 pl-6">{getPlatformBadge(mapItem.platform)}</td>
                        <td className="p-3.5 font-mono font-bold text-foreground">
                          {mapItem.external_sku}
                        </td>
                        <td className="p-3.5 font-semibold text-foreground">
                          {product?.name || 'Produk Tidak Ditemukan'}
                        </td>
                        <td className="p-3.5 font-mono text-muted-foreground">
                          {product ? formatRupiah(product.price) : '-'}
                        </td>
                        <td className="p-3.5 pr-6 text-right">
                          <button
                            type="button"
                            onClick={() => deleteSkuMapping(mapItem.platform, mapItem.external_sku)}
                            className="p-1.5 rounded-lg text-destructive hover:bg-destructive/10"
                            title="Hapus pemetaan"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL SIMULASI PESANAN MASUK (SANDBOX MOCK) */}
      {showSimulateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-sm bg-card rounded-3xl border shadow-2xl p-5 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-amber-500" />
                <h3 className="font-black text-base">Simulasi Pesanan Delivery</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSimulateModal(false)}
                className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              Uji coba integrasi webhook dan alur pesanan GoFood/GrabFood/ShopeeFood tanpa API
              key resmi. Pesanan akan langsung masuk ke tab delivery dan layar KDS.
            </p>

            <div className="space-y-2">
              <label className="text-xs font-bold">Pilih Platform</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setSimPlatform('gofood')}
                  className={`p-3 rounded-2xl border text-xs font-black flex flex-col items-center gap-1.5 transition-all ${
                    simPlatform === 'gofood'
                      ? 'border-red-500 bg-red-500/10 text-red-600'
                      : 'hover:bg-muted'
                  }`}
                >
                  <span className="h-2.5 w-2.5 rounded-full bg-red-600" />
                  GoFood
                </button>

                <button
                  type="button"
                  onClick={() => setSimPlatform('grabfood')}
                  className={`p-3 rounded-2xl border text-xs font-black flex flex-col items-center gap-1.5 transition-all ${
                    simPlatform === 'grabfood'
                      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600'
                      : 'hover:bg-muted'
                  }`}
                >
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-600" />
                  GrabFood
                </button>

                <button
                  type="button"
                  onClick={() => setSimPlatform('shopeefood')}
                  className={`p-3 rounded-2xl border text-xs font-black flex flex-col items-center gap-1.5 transition-all ${
                    simPlatform === 'shopeefood'
                      ? 'border-orange-500 bg-orange-500/10 text-orange-600'
                      : 'hover:bg-muted'
                  }`}
                >
                  <span className="h-2.5 w-2.5 rounded-full bg-orange-600" />
                  ShopeeFood
                </button>
              </div>
            </div>

            <div className="pt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setShowSimulateModal(false)}
                className="flex-1 h-11 rounded-xl border text-xs font-bold hover:bg-muted"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleTriggerSimulation}
                className="flex-1 h-11 rounded-xl bg-primary text-primary-foreground text-xs font-black shadow-md flex items-center justify-center gap-1.5"
              >
                <Sparkles className="h-4 w-4" />
                Kirim Simulasi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL TOLAK PESANAN */}
      {rejectingOrder && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-sm bg-card rounded-3xl border shadow-2xl p-5 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center gap-2 text-destructive">
              <XCircle className="h-6 w-6" />
              <h3 className="font-black text-base">Tolak Pesanan Online</h3>
            </div>

            <p className="text-xs text-muted-foreground">
              Apakah Anda yakin ingin menolak pesanan <span className="font-bold">{rejectingOrder.external_id}</span>?
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-bold">Alasan Penolakan</label>
              <select
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border bg-card text-xs focus:ring-2 focus:ring-primary focus:outline-none"
              >
                <option value="Bahan baku habis">Bahan baku habis</option>
                <option value="Restoran sedang ramai / over capacity">Restoran sedang ramai / over capacity</option>
                <option value="Toko akan segera tutup">Toko akan segera tutup</option>
                <option value="Kesalahan item pelanggan">Kesalahan item pelanggan</option>
              </select>
            </div>

            <div className="pt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setRejectingOrder(null)}
                className="flex-1 h-11 rounded-xl border text-xs font-bold hover:bg-muted"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                className="flex-1 h-11 rounded-xl bg-destructive text-destructive-foreground text-xs font-black shadow-md"
              >
                Tolak Pesanan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL TAMBAH PEMETAAN SKU */}
      {showAddMappingModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-sm bg-card rounded-3xl border shadow-2xl p-5 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-black text-base">Tambah Pemetaan SKU</h3>
              <button
                type="button"
                onClick={() => setShowAddMappingModal(false)}
                className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveMapping} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-bold">Platform Mitra</label>
                <select
                  value={newMappingPlatform}
                  onChange={(e) => setNewMappingPlatform(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border bg-card text-xs focus:ring-2 focus:ring-primary focus:outline-none"
                >
                  <option value="gofood">GoFood</option>
                  <option value="grabfood">GrabFood</option>
                  <option value="shopeefood">ShopeeFood</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold">Kode SKU Eksternal</label>
                <input
                  type="text"
                  value={newMappingSku}
                  onChange={(e) => setNewMappingSku(e.target.value)}
                  placeholder="Contoh: GF-KOPI-SUSU-01"
                  required
                  className="w-full h-10 px-3 rounded-xl border bg-card text-xs font-mono uppercase focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold">Pilih Produk POS Terkait</label>
                <select
                  value={newMappingProductId}
                  onChange={(e) => setNewMappingProductId(e.target.value)}
                  required
                  className="w-full h-10 px-3 rounded-xl border bg-card text-xs focus:ring-2 focus:ring-primary focus:outline-none"
                >
                  <option value="">-- Pilih Produk --</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({formatRupiah(p.price)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddMappingModal(false)}
                  className="flex-1 h-11 rounded-xl border text-xs font-bold hover:bg-muted"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 h-11 rounded-xl bg-primary text-primary-foreground text-xs font-black shadow-md"
                >
                  Simpan Mapping
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
