'use client';

import React, { useState } from 'react';
import { formatRupiah, formatDateTime } from '@/lib/formatters';
import { Button } from '@/components/ui/Button';
import { Printer, X } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';

export function ThermalReceiptModal({ open, onClose, data }) {
  const [paperWidth, setPaperWidth] = useState('80mm'); // '58mm' | '80mm'

  if (!data) return null;
  const { order, bill, payment } = data;

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="max-w-md">
      <div className="flex justify-between items-center mb-4 pb-2 border-b">
        <h3 className="font-bold text-lg">Pratinjau Struk Kasir</h3>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPaperWidth('58mm')}
            className={`px-2.5 py-1 text-xs rounded-md font-semibold transition-colors ${
              paperWidth === '58mm' ? 'bg-primary text-primary-foreground' : 'bg-muted'
            }`}
          >
            58 mm
          </button>
          <button
            type="button"
            onClick={() => setPaperWidth('80mm')}
            className={`px-2.5 py-1 text-xs rounded-md font-semibold transition-colors ${
              paperWidth === '80mm' ? 'bg-primary text-primary-foreground' : 'bg-muted'
            }`}
          >
            80 mm
          </button>
        </div>
      </div>

      {/* STRUK CONTAINER (DI DESAIN UNTUK CETAK THERMAL) */}
      <div
        id="thermal-receipt"
        className={`mx-auto bg-white text-black p-4 font-mono text-xs shadow-md border rounded-lg transition-all ${
          paperWidth === '58mm' ? 'w-[260px]' : 'w-[340px]'
        }`}
      >
        <div className="text-center space-y-1 pb-3 border-b border-dashed border-gray-400">
          <h2 className="font-black text-sm uppercase tracking-wider">KOPI & RESTO NUSANTARA</h2>
          <p className="text-[10px] text-gray-600">Jl. Senopati No. 45, Jakarta Selatan</p>
          <p className="text-[10px] text-gray-600">Telp: 0812-9876-5432</p>
        </div>

        <div className="py-2 text-[10px] space-y-0.5 border-b border-dashed border-gray-400 text-gray-700">
          <div className="flex justify-between">
            <span>No. Order:</span>
            <span className="font-bold">{order.order_number}</span>
          </div>
          <div className="flex justify-between">
            <span>Waktu:</span>
            <span>{formatDateTime(payment?.paid_at || new Date())}</span>
          </div>
          <div className="flex justify-between">
            <span>Kasir / Meja:</span>
            <span>{order.customer_name}</span>
          </div>
          <div className="flex justify-between">
            <span>Tipe:</span>
            <span className="uppercase font-semibold">{order.type.replace('_', ' ')}</span>
          </div>
          {bill?.split_group && (
            <div className="flex justify-between font-semibold text-primary">
              <span>Tagihan Bagian:</span>
              <span>Sub-tagihan #{bill.split_group}</span>
            </div>
          )}
        </div>

        {/* ITEMS */}
        <div className="py-3 border-b border-dashed border-gray-400 space-y-2">
          {order.items.map((item, idx) => (
            <div key={idx} className="space-y-0.5">
              <div className="flex justify-between">
                <span className="font-bold">{item.qty}x {item.name_snapshot}</span>
                <span>{formatRupiah(item.price_snapshot * item.qty)}</span>
              </div>
              {item.modifiers && item.modifiers.length > 0 && (
                <div className="pl-4 text-[9px] text-gray-500">
                  {item.modifiers.map((m, mIdx) => (
                    <div key={mIdx}>+ {m.name || m.name_snapshot}</div>
                  ))}
                </div>
              )}
              {item.notes && (
                <div className="pl-4 text-[9px] italic text-gray-500">
                  *{item.notes}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* TOTALS */}
        <div className="py-2 space-y-1 border-b border-dashed border-gray-400 text-xs">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>{formatRupiah(bill?.subtotal || order.subtotal)}</span>
          </div>
          {(bill?.discount || order.discount) > 0 && (
            <div className="flex justify-between text-emerald-700">
              <span>Diskon</span>
              <span>-{formatRupiah(bill?.discount || order.discount)}</span>
            </div>
          )}
          <div className="flex justify-between text-gray-600">
            <span>Service (5%)</span>
            <span>{formatRupiah(bill?.service || order.service)}</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>PB1 / Pajak (10%)</span>
            <span>{formatRupiah(bill?.tax || order.tax)}</span>
          </div>
          <div className="flex justify-between font-black text-sm pt-1 border-t border-gray-300">
            <span>TOTAL</span>
            <span>{formatRupiah(bill?.amount || order.total)}</span>
          </div>
        </div>

        {/* PAYMENT INFO */}
        <div className="pt-2 text-[10px] space-y-0.5 text-gray-700">
          <div className="flex justify-between">
            <span>Metode Bayar:</span>
            <span className="font-bold uppercase">{payment?.method || 'TUNAI'}</span>
          </div>
          {payment?.method === 'cash' && (
            <>
              <div className="flex justify-between">
                <span>Diterima (Tunai):</span>
                <span>{formatRupiah(payment.tendered_amount)}</span>
              </div>
              <div className="flex justify-between font-bold">
                <span>Kembalian:</span>
                <span>{formatRupiah(payment.change_amount)}</span>
              </div>
            </>
          )}
          {payment?.reference && (
            <div className="flex justify-between text-[9px] text-gray-500">
              <span>Ref:</span>
              <span>{payment.reference}</span>
            </div>
          )}
        </div>

        <div className="mt-4 pt-2 text-center text-[9px] border-t border-gray-300 text-gray-500">
          <p>Terima Kasih Atas Kunjungan Anda!</p>
          <p>Wifi: KopiNusantara / PW: nusantara2026</p>
        </div>
      </div>

      <div className="flex justify-between items-center mt-6 pt-2 border-t">
        <Button variant="outline" onClick={onClose}>
          Tutup
        </Button>
        <Button onClick={handlePrint} className="bg-emerald-600 hover:bg-emerald-700 text-white">
          <Printer className="mr-2 h-4 w-4" />
          Cetak Struk
        </Button>
      </div>
    </Dialog>
  );
}
