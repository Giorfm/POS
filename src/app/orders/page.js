'use client';

import React, { useState } from 'react';
import { usePosStore } from '@/lib/store/usePosStore';
import { formatRupiah, formatDateTime } from '@/lib/formatters';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/Dialog';
import { PinPadDialog } from '@/components/auth/PinPadDialog';
import { useToast } from '@/components/ui/Toaster';
import {
  Search,
  Receipt,
  Clock,
  Printer,
  XCircle,
  Eye,
  CheckCircle,
  Filter,
  Users
} from 'lucide-react';

export default function OrdersHistoryPage() {
  const { orders, bills, payments, tables, voidOrderItem } = usePosStore();
  const { showToast } = useToast();

  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  const [selectedOrder, setSelectedOrder] = useState(null);

  // Void item modal
  const [voidingItem, setVoidingItem] = useState(null);
  const [isVoidAuthOpen, setIsVoidAuthOpen] = useState(false);

  const filteredOrders = orders.filter((o) => {
    const matchesSearch =
      o.order_number.toLowerCase().includes(search.toLowerCase()) ||
      o.customer_name?.toLowerCase().includes(search.toLowerCase());
    const matchesType = filterType === 'all' || o.type === filterType;
    const matchesStatus = filterStatus === 'all' || o.status === filterStatus;
    return matchesSearch && matchesType && matchesStatus;
  });

  const handleOpenVoidItem = (item) => {
    setVoidingItem(item);
    setIsVoidAuthOpen(true);
  };

  const handleConfirmVoid = async (managerPin, reason) => {
    if (!selectedOrder || !voidingItem) return;
    try {
      await voidOrderItem(selectedOrder.id, voidingItem.id, managerPin, reason);
      showToast(`Item "${voidingItem.name_snapshot}" berhasil dibatalkan (void)`, 'success');
      setIsVoidAuthOpen(false);
      setVoidingItem(null);
      // Refresh selected order state
      const updated = usePosStore.getState().orders.find((o) => o.id === selectedOrder.id);
      setSelectedOrder(updated || null);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handlePrintOrder = (order) => {
    showToast(`Mencetak struk ${order.order_number}...`, 'info');
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Riwayat & Daftar Pesanan</h1>
          <p className="text-sm text-muted-foreground">
            Pantau seluruh transaksi aktif, pesanan selesai, detail tagihan split, dan pembatalan
          </p>
        </div>
      </div>

      {/* Filter & Search */}
      <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari nomor order atau nama tamu..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1">
          {['all', 'dine_in', 'takeaway', 'qr', 'delivery'].map((type) => (
            <Button
              key={type}
              size="sm"
              variant={filterType === type ? 'default' : 'outline'}
              onClick={() => setFilterType(type)}
              className="rounded-full text-xs font-semibold capitalize whitespace-nowrap"
            >
              {type === 'all' ? 'Semua Tipe' : type.replace('_', ' ')}
            </Button>
          ))}
        </div>
      </div>

      {/* Grid Pesanan */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredOrders.length === 0 ? (
          <div className="col-span-full p-12 text-center border rounded-2xl bg-muted/20 text-muted-foreground">
            Tidak ada pesanan yang sesuai filter.
          </div>
        ) : (
          filteredOrders.map((order) => {
            const table = tables.find((t) => t.id === order.table_id);
            const orderBills = bills.filter((b) => b.order_id === order.id);
            const isAllBillsPaid = orderBills.length > 0 && orderBills.every((b) => b.status === 'paid');

            const statusBadges = {
              open: { label: 'Terbuka', variant: 'warning' },
              sent: { label: 'Di Dapur', variant: 'info' },
              ready: { label: 'Siap', variant: 'purple' },
              completed: { label: 'Lunas', variant: 'success' },
              cancelled: { label: 'Batal', variant: 'destructive' },
            };

            const sb = statusBadges[order.status] || { label: order.status, variant: 'secondary' };

            return (
              <Card
                key={order.id}
                className="p-4 flex flex-col justify-between hover:shadow-md transition-shadow border"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-extrabold text-sm text-foreground">
                        {order.order_number}
                      </span>
                      <p className="text-[11px] text-muted-foreground font-mono">
                        {formatDateTime(order.created_at)}
                      </p>
                    </div>
                    <Badge variant={sb.variant}>{sb.label}</Badge>
                  </div>

                  <div className="flex items-center justify-between text-xs py-1 border-y text-muted-foreground">
                    <span className="font-semibold text-foreground">
                      {table?.name || order.customer_name || 'Takeaway'}
                    </span>
                    <span className="uppercase text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-muted">
                      {order.type.replace('_', ' ')}
                    </span>
                  </div>

                  {/* Ringkasan Item */}
                  <div className="space-y-1 text-xs">
                    {order.items.slice(0, 3).map((it) => (
                      <div key={it.id} className="flex justify-between text-muted-foreground">
                        <span className="truncate max-w-[200px]">
                          {it.qty}x {it.name_snapshot}
                        </span>
                        <span className="font-mono">{formatRupiah(it.price_snapshot * it.qty)}</span>
                      </div>
                    ))}
                    {order.items.length > 3 && (
                      <p className="text-[11px] text-muted-foreground italic">
                        +{order.items.length - 3} item lainnya...
                      </p>
                    )}
                  </div>
                </div>

                {/* Footer Pesanan */}
                <div className="pt-3 border-t mt-4 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-muted-foreground">Total Tagihan:</span>
                    <span className="font-extrabold text-sm text-primary font-mono">
                      {formatRupiah(order.total)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedOrder(order)}
                      className="text-xs font-semibold gap-1"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      Detail
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handlePrintOrder(order)}
                      className="text-xs font-semibold gap-1"
                    >
                      <Printer className="h-3.5 w-3.5" />
                      Struk
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* DIALOG DETAIL PESANAN */}
      <Dialog
        open={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
        maxWidth="max-w-2xl"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Detail Pesanan: {selectedOrder?.order_number}</span>
            <Badge variant="outline" className="uppercase font-mono">
              {selectedOrder?.type}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            Waktu dibuat: {formatDateTime(selectedOrder?.created_at)} · Meja/Tamu: {selectedOrder?.customer_name}
          </DialogDescription>
        </DialogHeader>

        {selectedOrder && (
          <div className="space-y-4 my-2 max-h-[65vh] overflow-y-auto pr-1">
            {/* Daftar Item */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Daftar Item Pesanan
              </h4>
              <div className="divide-y border rounded-xl bg-card overflow-hidden">
                {selectedOrder.items.map((item) => (
                  <div key={item.id} className="p-3 flex items-center justify-between text-xs">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className={`font-bold ${item.status === 'void' ? 'line-through text-destructive' : 'text-foreground'}`}>
                          {item.qty}x {item.name_snapshot}
                        </span>
                        {item.status === 'void' && (
                          <Badge variant="destructive" className="text-[9px]">BATAL</Badge>
                        )}
                        {item.is_additional && (
                          <Badge variant="warning" className="text-[9px]">TAMBAHAN</Badge>
                        )}
                      </div>
                      {item.modifiers && item.modifiers.length > 0 && (
                        <p className="text-[10px] text-muted-foreground">
                          {item.modifiers.map(m => `+ ${m.name || m.name_snapshot}`).join(', ')}
                        </p>
                      )}
                      {item.void_reason && (
                        <p className="text-[10px] text-destructive italic">
                          Alasan void: {item.void_reason}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold">
                        {formatRupiah(item.price_snapshot * item.qty)}
                      </span>

                      {/* Tombol Void jika belum di-void */}
                      {item.status !== 'void' && selectedOrder.status !== 'completed' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleOpenVoidItem(item)}
                          className="h-8 px-2 text-destructive hover:bg-destructive/10 text-xs"
                          title="Batalkan item (Butuh PIN Manajer)"
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Void
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Rincian Biaya */}
            <div className="p-4 rounded-xl bg-muted/20 border space-y-1.5 text-xs">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span className="font-mono">{formatRupiah(selectedOrder.subtotal)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Service Charge (5%)</span>
                <span className="font-mono">{formatRupiah(selectedOrder.service)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>PB1 / Pajak Resto (10%)</span>
                <span className="font-mono">{formatRupiah(selectedOrder.tax)}</span>
              </div>
              <div className="flex justify-between font-black text-sm pt-2 border-t text-foreground">
                <span>TOTAL</span>
                <span className="text-primary font-mono">{formatRupiah(selectedOrder.total)}</span>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => setSelectedOrder(null)}>
            Tutup
          </Button>
        </DialogFooter>
      </Dialog>

      {/* MODAL OTORISASI PIN MANAJER UNTUK VOID ITEM */}
      <PinPadDialog
        open={isVoidAuthOpen}
        onClose={() => setIsVoidAuthOpen(false)}
        onSuccess={handleConfirmVoid}
        title="Otorisasi Void Item"
        description={`Membatalkan item "${voidingItem?.name_snapshot}". Masukkan PIN Manajer dan alasan pembatalan.`}
        requireReason={true}
      />
    </div>
  );
}
