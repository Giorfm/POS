'use client';

import React, { useState } from 'react';
import { usePosStore } from '@/lib/store/usePosStore';
import { formatRupiah, formatDateTime } from '@/lib/formatters';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/Dialog';
import { Select } from '@/components/ui/Select';
import { Switch } from '@/components/ui/Switch';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { useToast } from '@/components/ui/Toaster';
import {
  Package,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Plus,
  SlidersHorizontal,
  History,
  Trash2,
  CheckCircle,
  FileText
} from 'lucide-react';

export default function InventoryPage() {
  const { ingredients, stockMovements, adjustStock, currentUser } = usePosStore();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState('stock');
  const [search, setSearch] = useState('');

  // Modal Penyesuaian Stok
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [selectedIngredient, setSelectedIngredient] = useState(null);
  const [adjustType, setAdjustType] = useState('opname'); // 'opname' | 'adjust' | 'waste'
  const [newStockValue, setNewStockValue] = useState('');
  const [adjustReason, setAdjustReason] = useState('');

  // Modal Tambah Bahan Baru
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newIngredientForm, setNewIngredientForm] = useState({
    name: '',
    base_unit: 'g',
    purchase_unit: 'kg',
    conversion: 1000,
    cost: '',
    current_stock: '',
    min_stock: '',
    is_critical: false,
  });

  const lowStockIngredients = ingredients.filter((i) => i.current_stock <= i.min_stock);
  const criticalStockIngredients = ingredients.filter((i) => i.is_critical && i.current_stock <= 0);

  const filteredIngredients = ingredients.filter((i) =>
    i.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleOpenAdjust = (ing) => {
    setSelectedIngredient(ing);
    setNewStockValue(String(ing.current_stock));
    setAdjustType('opname');
    setAdjustReason('Stock opname berkala');
    setIsAdjustModalOpen(true);
  };

  const handleSaveAdjust = () => {
    if (!selectedIngredient) return;
    const val = Number(newStockValue);
    if (isNaN(val)) {
      showToast('Kuantitas stok tidak valid', 'error');
      return;
    }
    if (!adjustReason.trim()) {
      showToast('Alasan wajib diisi', 'error');
      return;
    }

    adjustStock(selectedIngredient.id, val, `${adjustType.toUpperCase()}: ${adjustReason}`);
    showToast(`Stok ${selectedIngredient.name} berhasil diperbarui menjadi ${val} ${selectedIngredient.base_unit}`, 'success');
    setIsAdjustModalOpen(false);
  };

  const handleSaveAddIngredient = () => {
    if (!newIngredientForm.name.trim()) {
      showToast('Nama bahan baku wajib diisi', 'error');
      return;
    }

    usePosStore.setState((state) => ({
      ingredients: [
        ...state.ingredients,
        {
          id: crypto.randomUUID(),
          name: newIngredientForm.name.trim(),
          base_unit: newIngredientForm.base_unit,
          purchase_unit: newIngredientForm.purchase_unit,
          conversion: Number(newIngredientForm.conversion) || 1000,
          cost: Number(newIngredientForm.cost) || 0,
          current_stock: Number(newIngredientForm.current_stock) || 0,
          min_stock: Number(newIngredientForm.min_stock) || 100,
          is_critical: newIngredientForm.is_critical,
        },
      ],
    }));

    showToast(`Bahan baku "${newIngredientForm.name}" berhasil ditambahkan`, 'success');
    setIsAddModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header Halaman */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Inventaris & Stok Bahan Baku</h1>
          <p className="text-sm text-muted-foreground">
            Pantau stok riil, peringatan stok menipis, stock opname fisik, dan log pergerakan otomatis
          </p>
        </div>
        <Button onClick={() => setIsAddModalOpen(true)} className="gap-2 shadow-sm font-bold">
          <Plus className="h-5 w-5" />
          <span>Tambah Bahan Baku</span>
        </Button>
      </div>

      {/* Ringkasan Kartu Metrik */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 shadow-sm border flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold">
            <Package className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-semibold uppercase">Total Bahan Terdaftar</p>
            <h3 className="text-2xl font-black text-foreground">{ingredients.length} Bahan</h3>
          </div>
        </Card>

        <Card className="p-4 shadow-sm border flex items-center gap-4 bg-amber-500/5">
          <div className="h-12 w-12 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-semibold uppercase">Stok Menipis (Perlu PO)</p>
            <h3 className="text-2xl font-black text-amber-600">{lowStockIngredients.length} Bahan</h3>
          </div>
        </Card>

        <Card className="p-4 shadow-sm border flex items-center gap-4 bg-rose-500/5">
          <div className="h-12 w-12 rounded-2xl bg-rose-500/10 text-rose-600 flex items-center justify-center font-bold">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-semibold uppercase">Bahan Krusial Habis (0)</p>
            <h3 className="text-2xl font-black text-rose-600">{criticalStockIngredients.length} Bahan</h3>
          </div>
        </Card>
      </div>

      {/* Tabs Konten: Stok Saat Ini vs Riwayat Mutasi */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-2">
          <TabsList>
            <TabsTrigger value="stock" className="gap-2 font-bold text-xs">
              <Package className="h-4 w-4" />
              <span>Stok Saat Ini ({ingredients.length})</span>
            </TabsTrigger>
            <TabsTrigger value="movements" className="gap-2 font-bold text-xs">
              <History className="h-4 w-4" />
              <span>Log Mutasi Stok ({stockMovements.length})</span>
            </TabsTrigger>
          </TabsList>

          {activeTab === 'stock' && (
            <Input
              placeholder="Cari nama bahan baku..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-xs h-10 text-xs"
            />
          )}
        </div>

        {/* TAB 1: DAFTAR STOK SAAT INI */}
        <TabsContent value="stock" className="space-y-4">
          <div className="rounded-2xl border bg-card overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/40 border-b text-muted-foreground font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="p-4">Nama Bahan Baku</th>
                    <th className="p-4">Stok Saat Ini</th>
                    <th className="p-4">Batas Minimum</th>
                    <th className="p-4">Satuan Beli</th>
                    <th className="p-4">Harga / Satuan</th>
                    <th className="p-4">Status Stok</th>
                    <th className="p-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredIngredients.map((ing) => {
                    const isLow = ing.current_stock <= ing.min_stock;
                    const isNegative = ing.current_stock < 0;

                    return (
                      <tr key={ing.id} className="hover:bg-muted/20 transition-colors">
                        <td className="p-4 font-bold text-foreground">
                          <div className="flex items-center gap-2">
                            <span>{ing.name}</span>
                            {ing.is_critical && (
                              <Badge variant="destructive" className="text-[9px] font-mono">
                                KRUSIAL
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="p-4 font-mono font-bold text-sm">
                          <span className={isNegative ? 'text-destructive' : isLow ? 'text-amber-600' : 'text-foreground'}>
                            {ing.current_stock.toLocaleString('id-ID')} {ing.base_unit}
                          </span>
                        </td>
                        <td className="p-4 font-mono text-muted-foreground">
                          {ing.min_stock.toLocaleString('id-ID')} {ing.base_unit}
                        </td>
                        <td className="p-4 text-muted-foreground">
                          1 {ing.purchase_unit} = {ing.conversion} {ing.base_unit}
                        </td>
                        <td className="p-4 font-mono font-semibold">
                          {formatRupiah(ing.cost)} / {ing.base_unit}
                        </td>
                        <td className="p-4">
                          {isNegative ? (
                            <Badge variant="destructive">MINUS (Toleransi)</Badge>
                          ) : isLow ? (
                            <Badge variant="warning">MENIPIS</Badge>
                          ) : (
                            <Badge variant="success">AMAN</Badge>
                          )}
                        </td>
                        <td className="p-4 text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenAdjust(ing)}
                            className="text-xs font-semibold gap-1.5 h-8"
                          >
                            <SlidersHorizontal className="h-3.5 w-3.5" />
                            <span>Opname / Sesuaikan</span>
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* TAB 2: RIWAYAT MUTASI STOK */}
        <TabsContent value="movements" className="space-y-4">
          <div className="rounded-2xl border bg-card overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/40 border-b text-muted-foreground font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="p-4">Waktu</th>
                    <th className="p-4">Bahan Baku</th>
                    <th className="p-4">Tipe Mutasi</th>
                    <th className="p-4">Perubahan Qty</th>
                    <th className="p-4">Sisa Saldo</th>
                    <th className="p-4">Keterangan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border font-mono">
                  {stockMovements.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="p-8 text-center text-muted-foreground font-sans">
                        Belum ada pergerakan stok tercatat.
                      </td>
                    </tr>
                  ) : (
                    stockMovements.slice(0, 50).map((m) => {
                      const ing = ingredients.find((i) => i.id === m.ingredient_id);
                      const isAddition = m.qty > 0;

                      return (
                        <tr key={m.id} className="hover:bg-muted/20 transition-colors">
                          <td className="p-4 text-muted-foreground whitespace-nowrap">
                            {formatDateTime(m.created_at)}
                          </td>
                          <td className="p-4 font-sans font-bold text-foreground">
                            {ing?.name || 'Bahan'}
                          </td>
                          <td className="p-4 uppercase font-bold">
                            <span className={`px-2 py-0.5 rounded text-[10px] ${
                              m.type === 'sale'
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                : m.type === 'reversal'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                : m.type === 'purchase'
                                ? 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300'
                                : 'bg-muted text-muted-foreground'
                            }`}>
                              {m.type}
                            </span>
                          </td>
                          <td className={`p-4 font-bold ${isAddition ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {isAddition ? `+${m.qty}` : m.qty} {ing?.base_unit}
                          </td>
                          <td className="p-4 text-foreground font-bold">
                            {m.balance_after !== undefined ? `${m.balance_after} ${ing?.base_unit}` : '-'}
                          </td>
                          <td className="p-4 font-sans text-muted-foreground">
                            {m.note || '-'}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* DIALOG PENYESUAIAN STOK & STOCK OPNAME */}
      <Dialog open={isAdjustModalOpen} onClose={() => setIsAdjustModalOpen(false)} maxWidth="max-w-md">
        <DialogHeader>
          <DialogTitle>Penyesuaian Stok / Opname Fisik</DialogTitle>
          <DialogDescription>
            Bahan: <span className="font-bold text-foreground">{selectedIngredient?.name}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 my-2">
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">
              Jenis Penyesuaian
            </label>
            <Select value={adjustType} onChange={(e) => setAdjustType(e.target.value)}>
              <option value="opname">Stock Opname (Hitung Fisik)</option>
              <option value="adjust">Koreksi Stok Manual</option>
              <option value="waste">Pencatatan Waste / Rusak / Basi</option>
            </Select>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">
              Jumlah Stok Baru ({selectedIngredient?.base_unit}) *
            </label>
            <Input
              type="number"
              value={newStockValue}
              onChange={(e) => setNewStockValue(e.target.value)}
              className="font-mono font-bold text-lg"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">
              Alasan Penyesuaian *
            </label>
            <Input
              placeholder="Contoh: Perbedaan hitungan fisik opname mingguan..."
              value={adjustReason}
              onChange={(e) => setAdjustReason(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsAdjustModalOpen(false)}>
            Batal
          </Button>
          <Button onClick={handleSaveAdjust} className="font-bold">
            Simpan Penyesuaian
          </Button>
        </DialogFooter>
      </Dialog>

      {/* DIALOG TAMBAH BAHAN BAKU BARU */}
      <Dialog open={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} maxWidth="max-w-md">
        <DialogHeader>
          <DialogTitle>Tambah Master Bahan Baku</DialogTitle>
          <DialogDescription>Daftarkan bahan baku baru beserta takaran dan batas minimum.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3 my-2">
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">
              Nama Bahan Baku *
            </label>
            <Input
              placeholder="Contoh: Biji Kopi Robusta Lampung"
              value={newIngredientForm.name}
              onChange={(e) => setNewIngredientForm({ ...newIngredientForm, name: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">
                Satuan Dasar (Resep)
              </label>
              <Select
                value={newIngredientForm.base_unit}
                onChange={(e) => setNewIngredientForm({ ...newIngredientForm, base_unit: e.target.value })}
              >
                <option value="g">Gram (g)</option>
                <option value="ml">Mililiter (ml)</option>
                <option value="pcs">Pcs / Butir</option>
              </Select>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">
                Satuan Beli (PO)
              </label>
              <Select
                value={newIngredientForm.purchase_unit}
                onChange={(e) => setNewIngredientForm({ ...newIngredientForm, purchase_unit: e.target.value })}
              >
                <option value="kg">Kilogram (kg)</option>
                <option value="liter">Liter</option>
                <option value="pack">Pack / Dus</option>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">
                Rasio Konversi
              </label>
              <Input
                type="number"
                placeholder="1000"
                value={newIngredientForm.conversion}
                onChange={(e) => setNewIngredientForm({ ...newIngredientForm, conversion: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">
                Harga Beli / Satuan Dasar (Rp)
              </label>
              <Input
                type="number"
                placeholder="Contoh: 250"
                value={newIngredientForm.cost}
                onChange={(e) => setNewIngredientForm({ ...newIngredientForm, cost: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">
                Stok Awal
              </label>
              <Input
                type="number"
                placeholder="1000"
                value={newIngredientForm.current_stock}
                onChange={(e) => setNewIngredientForm({ ...newIngredientForm, current_stock: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">
                Stok Minimum (Alert)
              </label>
              <Input
                type="number"
                placeholder="200"
                value={newIngredientForm.min_stock}
                onChange={(e) => setNewIngredientForm({ ...newIngredientForm, min_stock: e.target.value })}
              />
            </div>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl border bg-muted/20 mt-2">
            <div>
              <p className="text-xs font-bold">Bahan Krusial?</p>
              <p className="text-[11px] text-muted-foreground">Jika stok 0, produk terkait otomatis Habis</p>
            </div>
            <Switch
              checked={newIngredientForm.is_critical}
              onCheckedChange={(val) => setNewIngredientForm({ ...newIngredientForm, is_critical: val })}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>
            Batal
          </Button>
          <Button onClick={handleSaveAddIngredient} className="font-bold">
            Simpan Bahan Baku
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
