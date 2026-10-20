'use client';

import React, { useState } from 'react';
import { usePosStore } from '@/lib/store/usePosStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import { Switch } from '@/components/ui/Switch';
import { useToast } from '@/components/ui/Toaster';
import { 
  Settings, 
  Store, 
  Receipt, 
  ShieldCheck, 
  Printer, 
  Package, 
  Check, 
  Save 
} from 'lucide-react';

export default function SettingsPage() {
  const { outlet, profiles, logAudit } = usePosStore();
  const { showToast } = useToast();

  const [formData, setFormData] = useState({
    name: outlet.name || 'Kopi & Resto Nusantara',
    address: outlet.address || 'Jl. Senopati No. 45, Jakarta Selatan',
    phone: outlet.phone || '0812-9876-5432',
    tax_rate: (outlet.tax_rate * 100).toFixed(0), // 10%
    service_charge_rate: (outlet.service_charge_rate * 100).toFixed(0), // 5%
    stock_deduct_trigger: outlet.stock_deduct_trigger || 'on_send',
    allow_negative_stock: outlet.allow_negative_stock ?? true,
    qr_approval_required: outlet.qr_approval_required ?? false,
    max_discount_without_manager: outlet.max_discount_without_manager || 10,
  });

  const handleSaveSettings = () => {
    const taxNum = Number(formData.tax_rate) / 100;
    const serviceNum = Number(formData.service_charge_rate) / 100;

    usePosStore.setState((state) => ({
      outlet: {
        ...state.outlet,
        name: formData.name,
        address: formData.address,
        phone: formData.phone,
        tax_rate: taxNum,
        service_charge_rate: serviceNum,
        stock_deduct_trigger: formData.stock_deduct_trigger,
        allow_negative_stock: formData.allow_negative_stock,
        qr_approval_required: formData.qr_approval_required,
        max_discount_without_manager: Number(formData.max_discount_without_manager),
      },
    }));

    logAudit('update_settings', 'outlets', outlet.id, 'Perbarui pengaturan outlet & pajak');
    showToast('Pengaturan outlet berhasil disimpan!', 'success');
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header Halaman */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Pengaturan Outlet & Sistem</h1>
          <p className="text-sm text-muted-foreground">
            Konfigurasi tarif pajak PB1, service charge, aturan pemotongan stok, dan printer struk
          </p>
        </div>
        <Button onClick={handleSaveSettings} className="gap-2 font-bold shadow-sm">
          <Save className="h-4 w-4" />
          <span>Simpan Perubahan</span>
        </Button>
      </div>

      <div className="space-y-6">
        {/* 1. INFORMASI OUTLET */}
        <Card className="shadow-sm border">
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-base flex items-center gap-2">
              <Store className="h-5 w-5 text-primary" />
              <span>Profil Outlet Restoran</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">
                  Nama Resto / Outlet *
                </label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">
                  Nomor Telepon
                </label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">
                Alamat Lengkap (Tampil di Struk)
              </label>
              <Input
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </div>
          </CardContent>
        </Card>

        {/* 2. PAJAK PB1 & SERVICE CHARGE */}
        <Card className="shadow-sm border">
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-base flex items-center gap-2">
              <Receipt className="h-5 w-5 text-primary" />
              <span>Pajak Restoran & Biaya Layanan</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">
                  PB1 / Pajak Restoran (%) *
                </label>
                <Input
                  type="number"
                  min="0"
                  max="50"
                  value={formData.tax_rate}
                  onChange={(e) => setFormData({ ...formData, tax_rate: e.target.value })}
                  className="font-mono font-bold"
                />
                <span className="text-[11px] text-muted-foreground mt-1 block">
                  Standar pemerintah daerah: 10%
                </span>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">
                  Service Charge (%)
                </label>
                <Input
                  type="number"
                  min="0"
                  max="50"
                  value={formData.service_charge_rate}
                  onChange={(e) => setFormData({ ...formData, service_charge_rate: e.target.value })}
                  className="font-mono font-bold"
                />
                <span className="text-[11px] text-muted-foreground mt-1 block">
                  Biaya pelayanan resto: umumnya 5%
                </span>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">
                Batas Diskon Maksimal Kasir Tanpa PIN Manajer (%)
              </label>
              <Input
                type="number"
                min="0"
                max="100"
                value={formData.max_discount_without_manager}
                onChange={(e) => setFormData({ ...formData, max_discount_without_manager: e.target.value })}
                className="max-w-xs font-mono font-bold"
              />
              <span className="text-[11px] text-muted-foreground mt-1 block">
                Diskon di atas persentase ini akan otomatis memicu modal PIN Manajer
              </span>
            </div>
          </CardContent>
        </Card>

        {/* 3. PERILAKU STOK & RESEP */}
        <Card className="shadow-sm border">
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              <span>Perilaku Stok & Pengurangan Otomatis</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">
                Kapan Stok Bahan Baku Dipotong?
              </label>
              <Select
                value={formData.stock_deduct_trigger}
                onChange={(e) => setFormData({ ...formData, stock_deduct_trigger: e.target.value })}
              >
                <option value="on_send">Saat Pesanan Dikirim ke Dapur (Rekomendasi F&B)</option>
                <option value="on_paid">Saat Tagihan Dibayar Lunas</option>
              </Select>
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-xl border bg-muted/20">
              <div>
                <p className="text-xs font-bold">Toleransi Stok Minus?</p>
                <p className="text-[11px] text-muted-foreground">
                  Izinkan penjualan tetap berjalan jika stok bahan baku habis di sistem (diberi tanda peringatan)
                </p>
              </div>
              <Switch
                checked={formData.allow_negative_stock}
                onCheckedChange={(val) => setFormData({ ...formData, allow_negative_stock: val })}
              />
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-xl border bg-muted/20">
              <div>
                <p className="text-xs font-bold">Persetujuan Pesanan QR Meja?</p>
                <p className="text-[11px] text-muted-foreground">
                  Jika aktif, pesanan dari scan QR harus disetujui kasir sebelum diteruskan ke dapur
                </p>
              </div>
              <Switch
                checked={formData.qr_approval_required}
                onCheckedChange={(val) => setFormData({ ...formData, qr_approval_required: val })}
              />
            </div>
          </CardContent>
        </Card>

        {/* 4. DAFTAR PENGGUNA & PIN HAK AKSES */}
        <Card className="shadow-sm border">
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              <span>Daftar Karyawan & Akun Pengguna</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="divide-y text-xs">
              {profiles.map((p) => (
                <div key={p.id} className="py-2.5 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-foreground">{p.name}</span>
                    <span className="ml-2 uppercase font-mono text-[10px] px-2 py-0.5 rounded bg-muted">
                      {p.role}
                    </span>
                  </div>
                  <Badge variant="success">Aktif</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
