'use client';

import React, { useState } from 'react';
import { usePosStore } from '@/lib/store/usePosStore';
import { formatRupiah, formatDateTime } from '@/lib/formatters';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/Dialog';
import { useToast } from '@/components/ui/Toaster';
import { 
  ShoppingBag, 
  AlertTriangle, 
  Download, 
  MessageSquare, 
  CheckCircle, 
  Plus, 
  FileText,
  Truck
} from 'lucide-react';

export default function PurchasingPage() {
  const { ingredients, purchaseOrders, createPurchaseOrder, receivePurchaseOrder, outlet } = usePosStore();
  const { showToast } = useToast();

  const [selectedPo, setSelectedPo] = useState(null);

  // Bahan yang perlu dipesan (stok <= min_stock)
  const lowStockIngredients = ingredients.filter((i) => i.current_stock <= i.min_stock);

  // Generate Draft PO otomatis dari bahan yang menipis
  const handleGenerateDraftPo = () => {
    if (lowStockIngredients.length === 0) {
      showToast('Seluruh stok bahan saat ini dalam kondisi aman', 'info');
      return;
    }

    const items = lowStockIngredients.map((ing) => {
      // Rekomendasi pesan 2x batas minimum
      const deficitInBase = Math.max(0, ing.min_stock * 2 - ing.current_stock);
      const orderQtyInPurchaseUnit = Math.ceil(deficitInBase / (ing.conversion || 1000));
      const unitCost = (ing.cost || 0) * (ing.conversion || 1000);

      return {
        ingredient_id: ing.id,
        name: ing.name,
        order_qty: Math.max(1, orderQtyInPurchaseUnit),
        purchase_unit: ing.purchase_unit,
        unit_cost: unitCost,
        total_cost: Math.max(1, orderQtyInPurchaseUnit) * unitCost,
      };
    });

    const totalPoCost = items.reduce((acc, it) => acc + it.total_cost, 0);

    const po = createPurchaseOrder({
      supplier_name: 'Pemasok Bahan Utama Nusantara',
      totalCost: totalPoCost,
      items,
    });

    showToast(`Draft ${po.po_number} berhasil dibuat (${items.length} jenis bahan)`, 'success');
  };

  // Ekspor CSV
  const handleExportCsv = (po) => {
    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += `Nomor PO,${po.po_number}\n`;
    csvContent += `Supplier,${po.supplier_name}\n`;
    csvContent += `Tanggal,${formatDateTime(po.created_at)}\n\n`;
    csvContent += 'Bahan,Jumlah,Satuan Beli,Estimasi Biaya\n';

    po.items.forEach((it) => {
      csvContent += `"${it.name}",${it.order_qty},${it.purchase_unit},${it.total_cost}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${po.po_number}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast('File CSV berhasil diunduh', 'success');
  };

  // Salin Format Teks Pesan WhatsApp untuk Supplier
  const handleCopyWhatsAppText = (po) => {
    let text = `*PURCHASE ORDER — ${outlet.name}*\n`;
    text += `No. PO: ${po.po_number}\n`;
    text += `Tanggal: ${formatDateTime(po.created_at)}\n`;
    text += `Kepada: ${po.supplier_name}\n\n`;
    text += `*Daftar Pesanan Bahan:*\n`;

    po.items.forEach((it, idx) => {
      text += `${idx + 1}. ${it.name} — ${it.order_qty} ${it.purchase_unit}\n`;
    });

    text += `\nMohon konfirmasi ketersediaan dan jadwal pengiriman. Terima kasih!`;

    navigator.clipboard.writeText(text);
    showToast('Format pesan WhatsApp berhasil disalin ke clipboard!', 'success');
  };

  // Penerimaan Barang (Receive PO)
  const handleReceivePo = (poId) => {
    try {
      receivePurchaseOrder(poId);
      showToast('Barang berhasil diterima! Stok inventaris otomatis bertambah.', 'success');
      setSelectedPo(null);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Halaman */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Pengadaan & Pembelian (Purchase Order)</h1>
          <p className="text-sm text-muted-foreground">
            Otomatisasi daftar belanja stok menipis, buat draft PO, kirim ke supplier via WhatsApp, dan terima barang
          </p>
        </div>
        <Button
          onClick={handleGenerateDraftPo}
          disabled={lowStockIngredients.length === 0}
          className="gap-2 shadow-sm font-bold bg-amber-600 hover:bg-amber-700 text-white"
        >
          <Plus className="h-5 w-5" />
          <span>Buat Draft PO dari Stok Menipis</span>
        </Button>
      </div>

      {/* Bagian 1: Daftar Bahan Baku yang Perlu Dipesan */}
      <Card className="shadow-sm border">
        <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <div>
              <CardTitle className="text-base">Daftar Bahan Perlu Dipesan</CardTitle>
              <p className="text-xs text-muted-foreground">
                Bahan dengan sisa stok di bawah ambang minimum
              </p>
            </div>
          </div>
          <Badge variant="warning">{lowStockIngredients.length} Bahan Menipis</Badge>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/30 border-b text-muted-foreground font-semibold uppercase tracking-wider">
                <tr>
                  <th className="p-4">Nama Bahan</th>
                  <th className="p-4">Sisa Stok Fisik</th>
                  <th className="p-4">Batas Minimum</th>
                  <th className="p-4">Rekomendasi Pesan</th>
                  <th className="p-4">Satuan Beli</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border font-mono">
                {lowStockIngredients.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="p-8 text-center text-muted-foreground font-sans">
                      Semua stok bahan baku saat ini berada di atas batas aman.
                    </td>
                  </tr>
                ) : (
                  lowStockIngredients.map((ing) => {
                    const deficit = Math.max(0, ing.min_stock * 2 - ing.current_stock);
                    const recPurchaseUnit = Math.ceil(deficit / (ing.conversion || 1000));

                    return (
                      <tr key={ing.id} className="hover:bg-muted/20 transition-colors">
                        <td className="p-4 font-sans font-bold text-foreground">
                          {ing.name}
                        </td>
                        <td className="p-4 text-amber-600 font-bold">
                          {ing.current_stock.toLocaleString('id-ID')} {ing.base_unit}
                        </td>
                        <td className="p-4 text-muted-foreground">
                          {ing.min_stock.toLocaleString('id-ID')} {ing.base_unit}
                        </td>
                        <td className="p-4 font-black text-primary font-sans">
                          {recPurchaseUnit} {ing.purchase_unit}
                        </td>
                        <td className="p-4 text-muted-foreground font-sans">
                          1 {ing.purchase_unit} ({ing.conversion} {ing.base_unit})
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Bagian 2: Riwayat Purchase Order (PO) */}
      <div className="space-y-4">
        <h3 className="text-lg font-black tracking-tight">Riwayat Dokumen Purchase Order</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {purchaseOrders.length === 0 ? (
            <div className="col-span-full p-12 text-center border rounded-2xl bg-muted/20 text-muted-foreground text-xs">
              Belum ada dokumen PO yang diterbitkan.
            </div>
          ) : (
            purchaseOrders.map((po) => {
              const isReceived = po.status === 'received';

              return (
                <Card key={po.id} className="p-4 shadow-sm border flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-sm text-foreground">{po.po_number}</span>
                      <Badge variant={isReceived ? 'success' : 'warning'}>
                        {isReceived ? 'Diterima' : 'Draft Siap Kirim'}
                      </Badge>
                    </div>

                    <div className="text-xs text-muted-foreground space-y-0.5">
                      <p className="font-semibold text-foreground">{po.supplier_name}</p>
                      <p>{formatDateTime(po.created_at)}</p>
                      <p className="font-mono text-primary font-bold pt-1">
                        Total Estimasi: {formatRupiah(po.total_cost)}
                      </p>
                    </div>

                    {/* Ringkasan Item PO */}
                    <div className="space-y-1 text-xs border-t pt-2">
                      {po.items.map((it, idx) => (
                        <div key={idx} className="flex justify-between text-muted-foreground">
                          <span>{it.name}</span>
                          <span className="font-mono font-bold text-foreground">
                            {it.order_qty} {it.purchase_unit}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Aksi PO */}
                  <div className="pt-3 border-t mt-4 space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCopyWhatsAppText(po)}
                        className="text-xs font-semibold gap-1 text-emerald-600 hover:text-emerald-700"
                        title="Salin Pesan WA"
                      >
                        <MessageSquare className="h-3.5 w-3.5" />
                        <span>Kirim WA</span>
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleExportCsv(po)}
                        className="text-xs font-semibold gap-1"
                        title="Unduh File CSV"
                      >
                        <Download className="h-3.5 w-3.5" />
                        <span>CSV</span>
                      </Button>
                    </div>

                    {!isReceived && (
                      <Button
                        size="sm"
                        onClick={() => handleReceivePo(po.id)}
                        className="w-full text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                      >
                        <Truck className="h-3.5 w-3.5" />
                        <span>Terima Barang (Tambah Stok)</span>
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
