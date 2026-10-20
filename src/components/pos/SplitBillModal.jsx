'use client';

import React, { useState } from 'react';
import { usePosStore } from '@/lib/store/usePosStore';
import { formatRupiah } from '@/lib/formatters';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/Dialog';
import { useToast } from '@/components/ui/Toaster';
import { 
  Users, 
  Divide, 
  Check, 
  CreditCard, 
  Banknote, 
  QrCode, 
  Split, 
  CheckCircle2, 
  Clock 
} from 'lucide-react';

export function SplitBillModal({ open, onClose, order }) {
  const { bills, splitBillEqual, splitBillByItems, payBill } = usePosStore();
  const { showToast } = useToast();

  const [splitMode, setSplitMode] = useState('equal'); // 'equal' | 'item'
  const [splitCount, setSplitCount] = useState(2); // Untuk bagi rata N orang

  // Sub-tagihan aktif untuk order ini
  const orderBills = bills.filter((b) => b.order_id === order?.id);
  const [activePayingBillId, setActivePayingBillId] = useState(null);
  const [payMethod, setPayMethod] = useState('cash');
  const [tenderedAmount, setTenderedAmount] = useState('');

  if (!order) return null;

  // Split Bagi Rata N Orang
  const handleExecuteEqualSplit = () => {
    if (splitCount < 2) {
      showToast('Minimal bagi 2 orang', 'warning');
      return;
    }
    try {
      splitBillEqual(order.id, Number(splitCount));
      showToast(`Tagihan berhasil dibagi rata menjadi ${splitCount} bagian`, 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Bayar Sub-tagihan Tertentu
  const handlePaySubBill = (bill) => {
    setActivePayingBillId(bill.id);
    setTenderedAmount(String(bill.amount));
  };

  const handleConfirmPaySubBill = () => {
    const bill = orderBills.find((b) => b.id === activePayingBillId);
    if (!bill) return;

    try {
      const amount = bill.amount;
      const tendered = payMethod === 'cash' ? Number(tenderedAmount) : amount;

      if (payMethod === 'cash' && tendered < amount) {
        showToast('Nominal tunai kurang dari total sub-tagihan', 'error');
        return;
      }

      payBill(bill.id, {
        method: payMethod,
        amount,
        tenderedAmount: tendered,
      });

      setActivePayingBillId(null);
      showToast(`Sub-tagihan #${bill.split_group} lunas!`, 'success');

      // Cek apakah semua sudah lunas
      const remainingUnpaid = orderBills.filter((b) => b.id !== bill.id && b.status === 'pending');
      if (remainingUnpaid.length === 0) {
        showToast('Seluruh tagihan order ini telah LUNAS!', 'success');
        onClose();
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="max-w-2xl">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Split className="h-5 w-5 text-primary" />
          <span>Split Bill (Pisah Tagihan) · {order.order_number}</span>
        </DialogTitle>
        <DialogDescription>
          Total Order: <span className="font-bold text-foreground font-mono">{formatRupiah(order.total)}</span>. Bagi tagihan per orang atau bayar masing-masing.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 my-2">
        {/* Mode Split Tabs */}
        {orderBills.length <= 1 && (
          <div className="p-4 rounded-2xl bg-muted/30 border space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Pilih Cara Pisah Tagihan:
            </h4>

            <div className="flex flex-col sm:flex-row gap-3 items-center">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Users className="h-4 w-4 text-primary" />
                <span className="text-xs font-semibold">Bagi Rata:</span>
                <Input
                  type="number"
                  min="2"
                  max="20"
                  value={splitCount}
                  onChange={(e) => setSplitCount(Math.max(2, Number(e.target.value)))}
                  className="w-20 h-9 font-bold font-mono text-center"
                />
                <span className="text-xs text-muted-foreground">Orang</span>
              </div>

              <Button
                size="sm"
                onClick={handleExecuteEqualSplit}
                className="w-full sm:w-auto font-bold text-xs"
              >
                Bagi Tagihan Sekarang
              </Button>
            </div>
          </div>
        )}

        {/* Daftar Sub-tagihan Hasil Split */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Daftar Sub-Tagihan ({orderBills.length} Bagian):
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-72 overflow-y-auto pr-1">
            {orderBills.map((bill) => {
              const isPaid = bill.status === 'paid';
              const isPayingThis = activePayingBillId === bill.id;

              return (
                <div
                  key={bill.id}
                  className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between ${
                    isPaid
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800'
                      : isPayingThis
                      ? 'border-primary ring-2 ring-primary/30 bg-card shadow-md'
                      : 'bg-card border-border hover:border-primary/50'
                  }`}
                >
                  <div className="flex items-center justify-between pb-2 border-b border-border/50">
                    <span className="font-extrabold text-xs">
                      Sub-Tagihan #{bill.split_group}
                    </span>
                    <Badge variant={isPaid ? 'success' : 'warning'} className="text-[10px]">
                      {isPaid ? 'LUNAS' : 'Belum Bayar'}
                    </Badge>
                  </div>

                  <div className="py-2 space-y-1 text-xs text-muted-foreground">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span className="font-mono">{formatRupiah(bill.subtotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Pajak & Service:</span>
                      <span className="font-mono">{formatRupiah(bill.tax + bill.service)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-foreground pt-1 border-t">
                      <span>Total:</span>
                      <span className="text-sm text-primary font-mono">{formatRupiah(bill.amount)}</span>
                    </div>
                  </div>

                  {/* Tombol Bayar Sub-tagihan */}
                  {!isPaid && (
                    <Button
                      size="sm"
                      onClick={() => handlePaySubBill(bill)}
                      variant={isPayingThis ? 'default' : 'outline'}
                      className="w-full text-xs font-bold mt-2 h-9"
                    >
                      <CreditCard className="mr-1.5 h-3.5 w-3.5" />
                      {isPayingThis ? 'Sedang Diproses' : `Bayar Bagian #${bill.split_group}`}
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal Form Pembayaran Sub-tagihan Terpilih */}
        {activePayingBillId && (
          <div className="p-4 rounded-2xl border-2 border-primary bg-accent/20 space-y-3 animate-in fade-in">
            <h5 className="font-bold text-xs uppercase tracking-wider text-primary">
              Proses Pembayaran Sub-Tagihan
            </h5>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPayMethod('cash')}
                className={`py-2 rounded-xl text-xs font-bold border transition-colors ${
                  payMethod === 'cash' ? 'bg-primary text-primary-foreground font-bold' : 'bg-card'
                }`}
              >
                Tunai
              </button>
              <button
                type="button"
                onClick={() => setPayMethod('qris')}
                className={`py-2 rounded-xl text-xs font-bold border transition-colors ${
                  payMethod === 'qris' ? 'bg-primary text-primary-foreground font-bold' : 'bg-card'
                }`}
              >
                QRIS
              </button>
              <button
                type="button"
                onClick={() => setPayMethod('card')}
                className={`py-2 rounded-xl text-xs font-bold border transition-colors ${
                  payMethod === 'card' ? 'bg-primary text-primary-foreground font-bold' : 'bg-card'
                }`}
              >
                Kartu
              </button>
            </div>

            {payMethod === 'cash' && (
              <div>
                <label className="text-[11px] text-muted-foreground font-semibold mb-1 block">
                  Uang Tunai Diterima:
                </label>
                <Input
                  type="number"
                  value={tenderedAmount}
                  onChange={(e) => setTenderedAmount(e.target.value)}
                  className="font-mono font-bold"
                />
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button size="sm" variant="outline" onClick={() => setActivePayingBillId(null)}>
                Batal
              </Button>
              <Button size="sm" onClick={handleConfirmPaySubBill} className="font-bold bg-emerald-600 hover:bg-emerald-700 text-white">
                Konfirmasi Lunas
              </Button>
            </div>
          </div>
        )}
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Tutup
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
