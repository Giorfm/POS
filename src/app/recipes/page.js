'use client';

import React, { useState } from 'react';
import { usePosStore } from '@/lib/store/usePosStore';
import { formatRupiah } from '@/lib/formatters';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/Dialog';
import { Select } from '@/components/ui/Select';
import { useToast } from '@/components/ui/Toaster';
import { 
  BookOpen, 
  Plus, 
  Trash2, 
  DollarSign, 
  TrendingUp, 
  Layers, 
  Search,
  Scale
} from 'lucide-react';

export default function RecipesPage() {
  const { products, categories, ingredients, recipes, modifierOptions } = usePosStore();
  const { showToast } = useToast();

  const [selectedProductId, setSelectedProductId] = useState(products[0]?.id || '');
  const [search, setSearch] = useState('');

  // Modal Tambah Bahan ke Resep
  const [isAddRecipeModalOpen, setIsAddRecipeModalOpen] = useState(false);
  const [recipeForm, setRecipeForm] = useState({
    ingredient_id: ingredients[0]?.id || '',
    qty: '',
    action: 'add',
    replaces_ingredient_id: '',
  });

  const selectedProduct = products.find((p) => p.id === selectedProductId);

  // Resep untuk produk ini
  const productRecipes = recipes.filter((r) => r.product_id === selectedProductId);

  // Kalkulasi HPP (Food Cost)
  const totalHpp = productRecipes.reduce((sum, r) => {
    const ing = ingredients.find((i) => i.id === r.ingredient_id);
    return sum + (Number(r.qty) * (Number(ing?.cost) || 0));
  }, 0);

  const price = Number(selectedProduct?.price) || 0;
  const grossProfit = Math.max(0, price - totalHpp);
  const foodCostPercentage = price > 0 ? ((totalHpp / price) * 100).toFixed(1) : 0;

  const handleSaveRecipeItem = () => {
    const qtyNum = Number(recipeForm.qty);
    if (isNaN(qtyNum) || qtyNum <= 0) {
      showToast('Kuantitas takaran bahan harus lebih dari 0', 'error');
      return;
    }

    usePosStore.setState((state) => ({
      recipes: [
        ...state.recipes,
        {
          id: crypto.randomUUID(),
          outlet_id: state.outlet.id,
          product_id: selectedProductId,
          ingredient_id: recipeForm.ingredient_id,
          qty: qtyNum,
          action: recipeForm.action,
          replaces_ingredient_id: recipeForm.replaces_ingredient_id || null,
        },
      ],
    }));

    showToast('Bahan berhasil ditambahkan ke resep menu', 'success');
    setIsAddRecipeModalOpen(false);
    setRecipeForm({
      ingredient_id: ingredients[0]?.id || '',
      qty: '',
      action: 'add',
      replaces_ingredient_id: '',
    });
  };

  const handleDeleteRecipeItem = (indexToRemove) => {
    const targetItem = productRecipes[indexToRemove];
    if (!targetItem) return;

    usePosStore.setState((state) => ({
      recipes: state.recipes.filter((r) => r !== targetItem),
    }));
    showToast('Bahan dihapus dari resep', 'info');
  };

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header Halaman */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Manajemen Resep & HPP (Food Cost)</h1>
          <p className="text-sm text-muted-foreground">
            Susun komposisi bahan baku (Bill of Materials) per menu untuk kalkulasi HPP otomatis dan pemotongan stok
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Kolom Kiri: Daftar Menu untuk Dipilih */}
        <div className="space-y-3">
          <Input
            placeholder="Cari menu untuk racikan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 text-xs"
          />

          <div className="rounded-2xl border bg-card p-2 space-y-1 max-h-[600px] overflow-y-auto">
            {filteredProducts.map((p) => {
              const isSelected = p.id === selectedProductId;
              const recipeCount = recipes.filter((r) => r.product_id === p.id).length;

              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelectedProductId(p.id)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl text-left text-xs transition-all ${
                    isSelected
                      ? 'bg-primary text-primary-foreground font-bold shadow-sm'
                      : 'hover:bg-muted text-foreground'
                  }`}
                >
                  <div>
                    <p className="font-bold">{p.name}</p>
                    <p className="text-[10px] opacity-75 font-mono">{formatRupiah(p.price)}</p>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-muted text-muted-foreground'
                  }`}>
                    {recipeCount} bahan
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Kolom Kanan: Detail Resep & Kartu Analisis HPP */}
        <div className="lg:col-span-2 space-y-4">
          {selectedProduct ? (
            <>
              {/* Kartu Analisis Profit Margin & HPP */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Card className="p-4 shadow-sm border">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Harga Jual Menu
                  </span>
                  <span className="text-xl font-black font-mono text-foreground mt-1 block">
                    {formatRupiah(price)}
                  </span>
                </Card>

                <Card className="p-4 shadow-sm border bg-amber-500/5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 block">
                    HPP Bahan (Food Cost)
                  </span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-xl font-black font-mono text-amber-600">
                      {formatRupiah(totalHpp)}
                    </span>
                    <span className="text-xs font-bold text-amber-700 font-mono">
                      ({foodCostPercentage}%)
                    </span>
                  </div>
                </Card>

                <Card className="p-4 shadow-sm border bg-emerald-500/5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 block">
                    Gross Margin Keuntungan
                  </span>
                  <span className="text-xl font-black font-mono text-emerald-600 mt-1 block">
                    {formatRupiah(grossProfit)}
                  </span>
                </Card>
              </div>

              {/* Tabel Resep Takaran Bahan */}
              <Card className="shadow-sm border">
                <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Komposisi Bahan: {selectedProduct.name}</CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Bahan baku yang otomatis terpotong dari inventaris saat menu ini dipesan
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => setIsAddRecipeModalOpen(true)}
                    className="font-bold text-xs gap-1"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Tambah Takaran</span>
                  </Button>
                </CardHeader>

                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-muted/30 border-b text-muted-foreground font-semibold uppercase tracking-wider">
                        <tr>
                          <th className="p-4">Bahan Baku</th>
                          <th className="p-4">Takaran / Porsi</th>
                          <th className="p-4">Harga / Satuan</th>
                          <th className="p-4">Biaya Bahan (HPP)</th>
                          <th className="p-4 text-right">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {productRecipes.length === 0 ? (
                          <tr>
                            <td colSpan="5" className="p-8 text-center text-muted-foreground">
                              Belum ada resep untuk menu ini. Produk akan dijual sebagai stok produk jadi langsung.
                            </td>
                          </tr>
                        ) : (
                          productRecipes.map((r, idx) => {
                            const ing = ingredients.find((i) => i.id === r.ingredient_id);
                            const cost = Number(r.qty) * (Number(ing?.cost) || 0);

                            return (
                              <tr key={idx} className="hover:bg-muted/20 transition-colors">
                                <td className="p-4 font-bold text-foreground">
                                  {ing?.name || 'Bahan'}
                                </td>
                                <td className="p-4 font-mono font-bold text-foreground">
                                  {r.qty} {ing?.base_unit}
                                </td>
                                <td className="p-4 font-mono text-muted-foreground">
                                  {formatRupiah(ing?.cost || 0)} / {ing?.base_unit}
                                </td>
                                <td className="p-4 font-mono font-bold text-amber-600">
                                  {formatRupiah(cost)}
                                </td>
                                <td className="p-4 text-right">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleDeleteRecipeItem(idx)}
                                    className="h-8 text-destructive hover:bg-destructive/10"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
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
            </>
          ) : (
            <div className="p-12 text-center border rounded-2xl bg-muted/20 text-muted-foreground">
              Pilih menu di sebelah kiri untuk melihat dan menyusun komposisi resep.
            </div>
          )}
        </div>

      </div>

      {/* DIALOG TAMBAH TAKARAN KE RESEP */}
      <Dialog open={isAddRecipeModalOpen} onClose={() => setIsAddRecipeModalOpen(false)} maxWidth="max-w-md">
        <DialogHeader>
          <DialogTitle>Tambah Bahan ke Resep</DialogTitle>
          <DialogDescription>
            Menu: <span className="font-bold text-foreground">{selectedProduct?.name}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 my-2">
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">
              Pilih Bahan Baku *
            </label>
            <Select
              value={recipeForm.ingredient_id}
              onChange={(e) => setRecipeForm({ ...recipeForm, ingredient_id: e.target.value })}
            >
              {ingredients.map((ing) => (
                <option key={ing.id} value={ing.id}>
                  {ing.name} (Satuan: {ing.base_unit}) - {formatRupiah(ing.cost)}/{ing.base_unit}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">
              Jumlah Takaran *
            </label>
            <Input
              type="number"
              placeholder="Contoh: 18 untuk kopi, 150 untuk susu..."
              value={recipeForm.qty}
              onChange={(e) => setRecipeForm({ ...recipeForm, qty: e.target.value })}
              className="font-mono font-bold"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsAddRecipeModalOpen(false)}>
            Batal
          </Button>
          <Button onClick={handleSaveRecipeItem} className="font-bold">
            Simpan ke Resep
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
