'use client';

import React, { useState } from 'react';
import { usePosStore } from '@/lib/store/usePosStore';
import { Button } from '@/components/ui/Button';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/Dialog';
import { useToast } from '@/components/ui/Toaster';
import { Merge, Link2, Unlink } from 'lucide-react';

export function MergeTablesModal({ open, onClose, currentTableId }) {
  const { tables, orders, bills, updateTableStatus, logAudit } = usePosStore();
  const { showToast } = useToast();

  const [selectedSecondaryId, setSelectedSecondaryId] = useState('');

  const currentTable = tables.find((t) => t.id === currentTableId);
  const currentOrder = orders.find((o) => o.table_id === currentTableId && (o.status === 'open' || o.status === 'sent'));

  // Meja lain yang tersedia atau terisi tapi belum lunas
  const otherTables = tables.filter((t) => t.id !== currentTableId);

  const handleMerge = () => {
    if (!currentTableId || !selectedSecondaryId) return;

    const secondaryTable = tables.find((t) => t.id === selectedSecondaryId);
    if (!secondaryTable) return;

    // Tandai meja sekunder sebagai terisi
    updateTableStatus(selectedSecondaryId, 'occupied');
    logAudit('merge_tables', 'tables', currentTableId, `Gabung meja ${currentTable?.name} dengan ${secondaryTable.name}`);
    
    showToast(`Meja ${secondaryTable.name} berhasil digabungkan ke ${currentTable?.name}`, 'success');
    setSelectedSecondaryId('');
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="max-w-md">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Merge className="h-5 w-5 text-primary" />
          <span>Gabung Meja (Merge Tables)</span>
        </DialogTitle>
        <DialogDescription>
          Gabungkan meja lain ke <span className="font-bold text-foreground">{currentTable?.name}</span> untuk melayani rombongan besar dalam 1 tagihan.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 my-2">
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">
          Pilih Meja yang Akan Digabungkan:
        </label>

        <div className="grid grid-cols-3 gap-2">
          {otherTables.map((t) => {
            const isSelected = selectedSecondaryId === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setSelectedSecondaryId(t.id)}
                className={`p-3 rounded-xl border text-center font-bold text-xs transition-all ${
                  isSelected
                    ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                    : 'hover:bg-muted bg-card'
                }`}
              >
                <span>{t.name}</span>
                <span className="block text-[10px] font-normal opacity-75">
                  ({t.capacity} org)
                </span>
              </button>
            );
          })}
        </div>

        <p className="text-xs text-muted-foreground italic">
          * Saat tagihan dibayar lunas, seluruh meja yang digabungkan otomatis berubah ke status &quot;Perlu Dibersihkan&quot;.
        </p>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Batal
        </Button>
        <Button onClick={handleMerge} disabled={!selectedSecondaryId} className="font-bold">
          <Link2 className="mr-1.5 h-4 w-4" />
          Gabungkan Meja
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
