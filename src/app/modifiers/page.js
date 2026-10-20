'use client';

import React, { useState } from 'react';
import { usePosStore } from '@/lib/store/usePosStore';
import { formatRupiah } from '@/lib/formatters';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/Dialog';
import { Switch } from '@/components/ui/Switch';
import { useToast } from '@/components/ui/Toaster';
import { Plus, Sliders, Check, Tag } from 'lucide-react';

export default function ModifiersPage() {
  const { modifierGroups, modifierOptions, createModifierGroup, createModifierOption } = usePosStore();
  const { showToast } = useToast();

  // Modal Tambah Grup
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [groupFormData, setGroupFormData] = useState({
    name: '',
    is_required: false,
    min_select: 0,
    max_select: 1,
  });

  // Modal Tambah Opsi
  const [isOptionModalOpen, setIsOptionModalOpen] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [optionFormData, setOptionFormData] = useState({
    name: '',
    price_delta: '',
    is_default: false,
  });

  const handleSaveGroup = () => {
    if (!groupFormData.name.trim()) {
      showToast('Nama grup modifier wajib diisi', 'error');
      return;
    }

    createModifierGroup({
      name: groupFormData.name.trim(),
      is_required: groupFormData.is_required,
      min_select: Number(groupFormData.min_select) || 0,
      max_select: Number(groupFormData.max_select) || 1,
    });

    showToast(`Grup modifier "${groupFormData.name}" berhasil dibuat`, 'success');
    setGroupFormData({ name: '', is_required: false, min_select: 0, max_select: 1 });
    setIsGroupModalOpen(false);
  };

  const handleOpenAddOption = (groupId) => {
    setSelectedGroupId(groupId);
    setOptionFormData({ name: '', price_delta: '0', is_default: false });
    setIsOptionModalOpen(true);
  };

  const handleSaveOption = () => {
    if (!optionFormData.name.trim()) {
      showToast('Nama opsi wajib diisi', 'error');
      return;
    }

    createModifierOption({
      group_id: selectedGroupId,
      name: optionFormData.name.trim(),
      price_delta: Number(optionFormData.price_delta) || 0,
      is_default: optionFormData.is_default,
    });

    showToast(`Opsi "${optionFormData.name}" berhasil ditambahkan`, 'success');
    setIsOptionModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header Halaman */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Manajemen Variasi & Modifier Menu</h1>
          <p className="text-sm text-muted-foreground">
            Atur pilihan kustomisasi pesanan seperti Tingkat Pedas, Topping, Ukuran, Level Es & Gula
          </p>
        </div>
        <Button onClick={() => setIsGroupModalOpen(true)} className="gap-2 shadow-sm font-bold">
          <Plus className="h-5 w-5" />
          <span>Tambah Grup Modifier</span>
        </Button>
      </div>

      {/* Grid Grup Modifier */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {modifierGroups.map((group) => {
          const options = modifierOptions.filter((opt) => opt.group_id === group.id);

          return (
            <Card key={group.id} className="flex flex-col justify-between shadow-sm border hover:border-primary/50 transition-colors">
              <CardHeader className="pb-3 border-b bg-muted/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sliders className="h-4 w-4 text-primary" />
                    <CardTitle className="text-base">{group.name}</CardTitle>
                  </div>
                  {group.is_required ? (
                    <Badge variant="destructive" className="text-[10px]">
                      Wajib (Min {group.min_select})
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-[10px]">
                      Opsional (Maks {group.max_select})
                    </Badge>
                  )}
                </div>
              </CardHeader>

              <CardContent className="p-4 flex-1">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground uppercase pb-1">
                    <span>Opsi Pilihan ({options.length})</span>
                    <span>Tambahan Harga</span>
                  </div>

                  {options.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-4 text-center">Belum ada opsi pilihan</p>
                  ) : (
                    options.map((opt) => (
                      <div
                        key={opt.id}
                        className="flex items-center justify-between p-2.5 rounded-xl border bg-card text-xs hover:bg-muted/40 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="font-medium text-foreground">{opt.name}</span>
                          {opt.is_default && (
                            <span className="text-[9px] bg-primary/10 text-primary font-bold px-1.5 py-0.5 rounded">
                              Default
                            </span>
                          )}
                        </div>
                        <span className="font-bold font-mono">
                          {Number(opt.price_delta) > 0 ? `+${formatRupiah(opt.price_delta)}` : 'Rp0'}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>

              {/* Card Footer */}
              <div className="p-3 border-t bg-muted/10">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleOpenAddOption(group.id)}
                  className="w-full text-xs font-semibold gap-1.5"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Tambah Opsi ke {group.name}</span>
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      {/* MODAL TAMBAH GRUP MODIFIER */}
      <Dialog open={isGroupModalOpen} onClose={() => setIsGroupModalOpen(false)} maxWidth="max-w-md">
        <DialogHeader>
          <DialogTitle>Buat Grup Modifier Baru</DialogTitle>
          <DialogDescription>
            Contoh: Tingkat Pedas, Pilihan Topping, Level Gula, Ukuran Cup
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 my-2">
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">
              Nama Grup *
            </label>
            <Input
              placeholder="Contoh: Tingkat Kemanisan"
              value={groupFormData.name}
              onChange={(e) => setGroupFormData({ ...groupFormData, name: e.target.value })}
            />
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl border bg-muted/20">
            <div>
              <p className="text-xs font-bold">Wajib Dipilih Tamu?</p>
              <p className="text-[11px] text-muted-foreground">Pesanan tidak bisa ditambah sebelum dipilih</p>
            </div>
            <Switch
              checked={groupFormData.is_required}
              onCheckedChange={(val) => setGroupFormData({ ...groupFormData, is_required: val })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">
                Min. Pilihan
              </label>
              <Input
                type="number"
                min="0"
                value={groupFormData.min_select}
                onChange={(e) => setGroupFormData({ ...groupFormData, min_select: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">
                Maks. Pilihan
              </label>
              <Input
                type="number"
                min="1"
                value={groupFormData.max_select}
                onChange={(e) => setGroupFormData({ ...groupFormData, max_select: e.target.value })}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsGroupModalOpen(false)}>
            Batal
          </Button>
          <Button onClick={handleSaveGroup} className="font-bold">
            Simpan Grup
          </Button>
        </DialogFooter>
      </Dialog>

      {/* MODAL TAMBAH OPSI MODIFIER */}
      <Dialog open={isOptionModalOpen} onClose={() => setIsOptionModalOpen(false)} maxWidth="max-w-md">
        <DialogHeader>
          <DialogTitle>Tambah Opsi Modifier</DialogTitle>
          <DialogDescription>
            Masukkan nama variasi dan tambahan harga jika ada
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 my-2">
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">
              Nama Opsi *
            </label>
            <Input
              placeholder="Contoh: Less Sugar (50%) atau Extra Cheese"
              value={optionFormData.name}
              onChange={(e) => setOptionFormData({ ...optionFormData, name: e.target.value })}
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">
              Tambahan Harga (Rp)
            </label>
            <Input
              type="number"
              placeholder="0 jika gratis"
              value={optionFormData.price_delta}
              onChange={(e) => setOptionFormData({ ...optionFormData, price_delta: e.target.value })}
            />
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl border bg-muted/20">
            <div>
              <p className="text-xs font-bold">Opsi Default?</p>
              <p className="text-[11px] text-muted-foreground">Otomatis tercentang saat membuka dialog</p>
            </div>
            <Switch
              checked={optionFormData.is_default}
              onCheckedChange={(val) => setOptionFormData({ ...optionFormData, is_default: val })}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOptionModalOpen(false)}>
            Batal
          </Button>
          <Button onClick={handleSaveOption} className="font-bold">
            Simpan Opsi
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
