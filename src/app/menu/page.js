'use client';

import React, { useState } from 'react';
import { usePosStore } from '@/lib/store/usePosStore';
import { formatRupiah } from '@/lib/formatters';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/Dialog';
import { Select } from '@/components/ui/Select';
import { Switch } from '@/components/ui/Switch';
import { useToast } from '@/components/ui/Toaster';
import { 
  Plus, 
  Search, 
  Star, 
  Edit3, 
  Coffee, 
  Utensils, 
  Flame, 
  Cake, 
  Check, 
  Filter,
  Eye,
  EyeOff
} from 'lucide-react';

export default function MenuPage() {
  const { 
    products, 
    categories, 
    modifierGroups, 
    createProduct, 
    updateProduct, 
    toggleProductAvailability, 
    toggleProductFavorite 
  } = usePosStore();
  const { showToast } = useToast();

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [filterAvailability, setFilterAvailability] = useState('all'); // 'all' | 'available' | 'unavailable'

  // Modal State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    category_id: '',
    price: '',
    description: '',
    is_available: true,
    is_favorite: false,
    image_url: '/menu/default.jpg',
    modifier_group_ids: [],
  });

  const getStationBadge = (categoryId) => {
    const cat = categories.find((c) => c.id === categoryId);
    if (!cat) return null;
    const variants = {
      Bar: 'info',
      Grill: 'destructive',
      Dessert: 'purple',
      Kitchen: 'warning',
    };
    return (
      <Badge variant={variants[cat.station] || 'secondary'} className="text-[10px]">
        {cat.station}
      </Badge>
    );
  };

  const filteredProducts = products.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
                          p.description?.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || p.category_id === selectedCategory;
    const matchesAvailability =
      filterAvailability === 'all' ||
      (filterAvailability === 'available' && p.is_available) ||
      (filterAvailability === 'unavailable' && !p.is_available);

    return matchesSearch && matchesCategory && matchesAvailability;
  });

  const handleOpenDialog = (product = null) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        name: product.name,
        category_id: product.category_id || categories[0]?.id || '',
        price: String(product.price),
        description: product.description || '',
        is_available: product.is_available,
        is_favorite: product.is_favorite,
        image_url: product.image_url || '/menu/default.jpg',
        modifier_group_ids: product.modifier_group_ids || [],
      });
    } else {
      setEditingProduct(null);
      setFormData({
        name: '',
        category_id: categories[0]?.id || '',
        price: '',
        description: '',
        is_available: true,
        is_favorite: false,
        image_url: '/menu/default.jpg',
        modifier_group_ids: [],
      });
    }
    setIsDialogOpen(true);
  };

  const handleSaveProduct = () => {
    if (!formData.name.trim()) {
      showToast('Nama menu wajib diisi', 'error');
      return;
    }
    const priceNum = Number(formData.price);
    if (isNaN(priceNum) || priceNum < 0) {
      showToast('Harga menu tidak valid', 'error');
      return;
    }

    if (editingProduct) {
      updateProduct(editingProduct.id, {
        ...formData,
        price: priceNum,
      });
      showToast(`Menu "${formData.name}" berhasil diperbarui`, 'success');
    } else {
      createProduct({
        ...formData,
        price: priceNum,
      });
      showToast(`Menu "${formData.name}" berhasil ditambahkan`, 'success');
    }

    setIsDialogOpen(false);
  };

  const toggleModifierGroup = (groupId) => {
    setFormData((prev) => {
      const exists = prev.modifier_group_ids.includes(groupId);
      return {
        ...prev,
        modifier_group_ids: exists
          ? prev.modifier_group_ids.filter((id) => id !== groupId)
          : [...prev.modifier_group_ids, groupId],
      };
    });
  };

  return (
    <div className="space-y-6">
      {/* Header Halaman */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Katalog Menu & Kategori</h1>
          <p className="text-sm text-muted-foreground">
            Kelola menu makanan, minuman, harga, stasiun dapur, dan ketersediaan stok
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="gap-2 shadow-sm font-bold">
          <Plus className="h-5 w-5" />
          <span>Tambah Menu Baru</span>
        </Button>
      </div>

      {/* Filter & Pencarian */}
      <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari nama menu atau deskripsi..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1">
          <Button
            size="sm"
            variant={selectedCategory === 'all' ? 'default' : 'outline'}
            onClick={() => setSelectedCategory('all')}
            className="rounded-full text-xs"
          >
            Semua ({products.length})
          </Button>
          {categories.map((cat) => {
            const count = products.filter((p) => p.category_id === cat.id).length;
            return (
              <Button
                key={cat.id}
                size="sm"
                variant={selectedCategory === cat.id ? 'default' : 'outline'}
                onClick={() => setSelectedCategory(cat.id)}
                className="rounded-full text-xs shrink-0"
              >
                {cat.name} ({count})
              </Button>
            );
          })}
        </div>
      </div>

      {/* Grid Menu Produk */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filteredProducts.map((product) => {
          const category = categories.find((c) => c.id === product.category_id);
          return (
            <Card
              key={product.id}
              className={`overflow-hidden transition-all duration-200 border hover:shadow-md ${
                !product.is_available ? 'opacity-60 bg-muted/30' : 'bg-card'
              }`}
            >
              {/* Image & Badges */}
              <div className="h-36 bg-muted relative flex items-center justify-center overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />
                
                {/* Fallback Icon jika belum ada file gambar lokal */}
                <div className="text-muted-foreground/40 font-black text-3xl">
                  {category?.station === 'Bar' ? <Coffee className="h-12 w-12" /> : <Utensils className="h-12 w-12" />}
                </div>

                {/* Stasiun & Ketersediaan */}
                <div className="absolute top-2 left-2 flex items-center gap-1.5">
                  {getStationBadge(product.category_id)}
                  {!product.is_available && (
                    <Badge variant="destructive" className="text-[10px]">
                      HABIS
                    </Badge>
                  )}
                </div>

                {/* Favorite Toggle Button */}
                <button
                  type="button"
                  onClick={() => toggleProductFavorite(product.id)}
                  className={`absolute top-2 right-2 p-1.5 rounded-full backdrop-blur-md transition-colors ${
                    product.is_favorite
                      ? 'bg-amber-400 text-amber-950 shadow-md'
                      : 'bg-black/40 text-white/80 hover:text-white'
                  }`}
                  title={product.is_favorite ? 'Favorit' : 'Jadikan Favorit'}
                >
                  <Star className={`h-4 w-4 ${product.is_favorite ? 'fill-current' : ''}`} />
                </button>

                {/* Harga di atas gambar */}
                <div className="absolute bottom-2 left-2">
                  <span className="text-white font-black text-base drop-shadow-md">
                    {formatRupiah(product.price)}
                  </span>
                </div>
              </div>

              {/* Detail Menu */}
              <div className="p-4 space-y-2">
                <div className="flex justify-between items-start gap-2">
                  <h3 className="font-bold text-sm leading-snug line-clamp-1">{product.name}</h3>
                </div>

                <p className="text-xs text-muted-foreground line-clamp-2 h-8 leading-relaxed">
                  {product.description || 'Tidak ada deskripsi'}
                </p>

                {/* Modifier Groups Attached */}
                <div className="flex flex-wrap gap-1 pt-1 min-h-[22px]">
                  {(product.modifier_group_ids || []).map((mgId) => {
                    const group = modifierGroups.find((g) => g.id === mgId);
                    return group ? (
                      <span key={mgId} className="text-[9px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono">
                        {group.name}
                      </span>
                    ) : null;
                  })}
                </div>

                {/* Action Controls */}
                <div className="flex items-center justify-between pt-3 border-t gap-2">
                  {/* Availability Toggle */}
                  <button
                    type="button"
                    onClick={() => {
                      toggleProductAvailability(product.id);
                      showToast(
                        `Status "${product.name}" diubah jadi ${!product.is_available ? 'Tersedia' : 'Habis'}`,
                        'info'
                      );
                    }}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                      product.is_available
                        ? 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300'
                        : 'text-rose-700 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950 dark:text-rose-300'
                    }`}
                  >
                    {product.is_available ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                    <span>{product.is_available ? 'Tersedia' : 'Habis'}</span>
                  </button>

                  {/* Edit Button */}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleOpenDialog(product)}
                    className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
                  >
                    <Edit3 className="h-3.5 w-3.5 mr-1" />
                    <span>Edit</span>
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {filteredProducts.length === 0 && (
        <div className="p-12 text-center border rounded-2xl bg-muted/20">
          <p className="text-muted-foreground text-sm font-medium">Tidak ada menu yang sesuai dengan filter.</p>
        </div>
      )}

      {/* DIALOG FORM TAMBAH / EDIT PRODUK */}
      <Dialog open={isDialogOpen} onClose={() => setIsDialogOpen(false)} maxWidth="max-w-xl">
        <DialogHeader>
          <DialogTitle>{editingProduct ? 'Edit Menu' : 'Tambah Menu Baru'}</DialogTitle>
          <DialogDescription>
            Masukkan detail menu makanan atau minuman, tentukan stasiun dapur, dan pilih grup modifier.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 my-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">
                Nama Menu *
              </label>
              <Input
                placeholder="Contoh: Kopi Susu Aren Spesial"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">
                Kategori *
              </label>
              <Select
                value={formData.category_id}
                onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.station})
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">
                Harga Jual (Rp) *
              </label>
              <Input
                type="number"
                placeholder="Contoh: 25000"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">
                URL Gambar (Opsional)
              </label>
              <Input
                placeholder="/menu/kopi.jpg"
                value={formData.image_url}
                onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">
              Deskripsi Menu
            </label>
            <Input
              placeholder="Deskripsi singkat racikan menu..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          {/* Toggle Switches */}
          <div className="flex items-center gap-6 pt-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <Switch
                checked={formData.is_available}
                onCheckedChange={(val) => setFormData({ ...formData, is_available: val })}
              />
              <span className="text-xs font-medium">Tersedia untuk Dipesan</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <Switch
                checked={formData.is_favorite}
                onCheckedChange={(val) => setFormData({ ...formData, is_favorite: val })}
              />
              <span className="text-xs font-medium">Menu Favorit (Shortcut)</span>
            </label>
          </div>

          {/* Hubungkan ke Grup Modifier */}
          <div className="pt-3 border-t">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
              Grup Modifier Terkait
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {modifierGroups.map((group) => {
                const isChecked = formData.modifier_group_ids.includes(group.id);
                return (
                  <button
                    key={group.id}
                    type="button"
                    onClick={() => toggleModifierGroup(group.id)}
                    className={`p-2.5 rounded-xl border text-left text-xs transition-colors flex items-center justify-between ${
                      isChecked
                        ? 'bg-primary/10 border-primary text-primary font-bold'
                        : 'hover:bg-muted text-muted-foreground'
                    }`}
                  >
                    <span>{group.name}</span>
                    {isChecked && <Check className="h-4 w-4" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
            Batal
          </Button>
          <Button onClick={handleSaveProduct} className="font-bold">
            Simpan Menu
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
