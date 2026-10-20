/* eslint-disable @next/next/no-img-element */
'use client';

import React, { useState, useRef } from 'react';
import { usePosStore } from '@/lib/store/usePosStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/Dialog';
import { Select } from '@/components/ui/Select';
import { useToast } from '@/components/ui/Toaster';
import { 
  Plus, 
  Move, 
  Trash2, 
  Edit2, 
  Users, 
  QrCode, 
  CheckCircle, 
  Layers,
  Sparkles
} from 'lucide-react';
import QRCode from 'qrcode';

export default function TablesFloorPlanEditor() {
  const { 
    tables, 
    areas, 
    activeAreaId, 
    setActiveArea, 
    updateTablePosition, 
    addTable, 
    editTable, 
    deleteTable, 
    orders, 
    cleanTable 
  } = usePosStore();
  const { showToast } = useToast();

  const [selectedTableId, setSelectedTableId] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [qrModalData, setQrModalData] = useState(null); // { table, qrDataUrl }
  const [draggedTableId, setDraggedTableId] = useState(null);

  const [tableForm, setTableForm] = useState({
    name: '',
    capacity: 4,
    shape: 'square',
    area_id: activeAreaId || areas[0]?.id,
  });

  const canvasRef = useRef(null);

  const currentAreaTables = tables.filter((t) => t.area_id === activeAreaId);
  const selectedTable = tables.find((t) => t.id === selectedTableId);
  const activeOrder = orders.find((o) => o.table_id === selectedTableId && (o.status === 'open' || o.status === 'sent'));

  // Drag & drop meja di denah visual
  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (!draggedTableId || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = Math.max(20, Math.min(Math.round(e.clientX - rect.left - 45), rect.width - 100));
    const y = Math.max(20, Math.min(Math.round(e.clientY - rect.top - 45), rect.height - 100));

    updateTablePosition(draggedTableId, x, y);
    setDraggedTableId(null);
  };

  const handleSaveAddTable = () => {
    if (!tableForm.name.trim()) {
      showToast('Nomor/nama meja wajib diisi', 'error');
      return;
    }

    const newTable = addTable({
      name: tableForm.name.trim(),
      capacity: Number(tableForm.capacity) || 4,
      shape: tableForm.shape,
      area_id: activeAreaId || areas[0]?.id,
      pos_x: 60 + (currentAreaTables.length % 4) * 110,
      pos_y: 60 + Math.floor(currentAreaTables.length / 4) * 110,
    });

    showToast(`Meja "${newTable.name}" berhasil ditambahkan ke denah`, 'success');
    setIsAddModalOpen(false);
  };

  const handleSaveEditTable = () => {
    if (!tableForm.name.trim() || !selectedTableId) return;

    editTable(selectedTableId, {
      name: tableForm.name.trim(),
      capacity: Number(tableForm.capacity) || 4,
      shape: tableForm.shape,
    });

    showToast('Data meja berhasil diperbarui', 'success');
    setIsEditModalOpen(false);
  };

  const handleDeleteTable = (tableId) => {
    try {
      deleteTable(tableId);
      setSelectedTableId(null);
      showToast('Meja berhasil dihapus dari denah', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleShowQr = async (table) => {
    try {
      const publicUrl = `${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}/t/${table.qr_token}`;
      const qrDataUrl = await QRCode.toDataURL(publicUrl, {
        width: 320,
        margin: 2,
        color: { dark: '#0f172a', light: '#ffffff' },
      });
      setQrModalData({ table, qrDataUrl, publicUrl });
    } catch (err) {
      showToast('Gagal generate QR Meja', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Halaman */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Editor Denah Visual Meja</h1>
          <p className="text-sm text-muted-foreground">
            Atur tata letak meja fisik dengan drag & drop, bentuk meja, kapasitas, dan QR code mandiri
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => {
              setTableForm({
                name: `Meja ${(tables.length + 1).toString().padStart(2, '0')}`,
                capacity: 4,
                shape: 'square',
                area_id: activeAreaId,
              });
              setIsAddModalOpen(true);
            }}
            className="gap-2 shadow-sm font-bold"
          >
            <Plus className="h-5 w-5" />
            <span>Tambah Meja</span>
          </Button>
        </div>
      </div>

      {/* Area Selector Tabs & Legenda */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        {/* Area Tabs */}
        <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-muted/60 border w-full md:w-auto overflow-x-auto">
          {areas.map((area) => (
            <button
              key={area.id}
              onClick={() => {
                setActiveArea(area.id);
                setSelectedTableId(null);
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all select-none whitespace-nowrap flex items-center gap-2 ${
                activeAreaId === area.id
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Layers className="h-4 w-4" />
              <span>{area.name}</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-muted font-mono">
                {tables.filter((t) => t.area_id === area.id).length}
              </span>
            </button>
          ))}
        </div>

        {/* Status Legend */}
        <div className="flex items-center gap-4 text-xs font-medium">
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full bg-emerald-500 shadow-sm" />
            <span>Kosong</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full bg-amber-500 shadow-sm" />
            <span>Terisi (Aktif)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full bg-yellow-500 shadow-sm" />
            <span>Perlu Dibersihkan</span>
          </div>
        </div>
      </div>

      {/* Canvas Denah Meja & Panel Kontrol Kanan */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Visual Floor Plan Canvas (Drag & Drop) */}
        <div className="lg:col-span-3">
          <Card className="overflow-hidden border-2 border-dashed border-border/80">
            <div
              ref={canvasRef}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              className="relative w-full h-[580px] bg-gradient-to-br from-card to-muted/20 select-none overflow-hidden"
              style={{
                backgroundImage: 'radial-gradient(circle, var(--border) 1px, transparent 1px)',
                backgroundSize: '24px 24px',
              }}
            >
              {currentAreaTables.length === 0 ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
                  <Move className="h-10 w-10 mb-2 opacity-40 animate-pulse" />
                  <p className="text-sm font-semibold">Area ini belum memiliki meja</p>
                  <p className="text-xs">Klik tombol &quot;Tambah Meja&quot; untuk menempatkan meja pertama</p>
                </div>
              ) : (
                currentAreaTables.map((table) => {
                  const isSelected = selectedTableId === table.id;
                  const isOccupied = table.status === 'occupied';
                  const needsCleaning = table.status === 'needs_cleaning';

                  // Styling status meja
                  let statusBg = 'bg-emerald-600 text-white border-emerald-500';
                  if (isOccupied) statusBg = 'bg-amber-600 text-white border-amber-500 animate-pulse';
                  if (needsCleaning) statusBg = 'bg-yellow-500 text-slate-950 border-yellow-400';

                  // Bentuk Meja (bulat, persegi, persegi panjang)
                  const shapeStyles = {
                    square: 'w-24 h-24 rounded-2xl',
                    round: 'w-24 h-24 rounded-full',
                    rectangle: 'w-36 h-24 rounded-2xl',
                  };

                  return (
                    <div
                      key={table.id}
                      draggable
                      onDragStart={() => setDraggedTableId(table.id)}
                      onClick={() => setSelectedTableId(table.id)}
                      className={`absolute cursor-move flex flex-col items-center justify-center p-2 border-2 shadow-lg transition-transform active:scale-95 ${shapeStyles[table.shape] || shapeStyles.square} ${statusBg} ${
                        isSelected ? 'ring-4 ring-primary ring-offset-2 scale-105 z-20' : 'hover:scale-102 z-10'
                      }`}
                      style={{
                        left: `${table.pos_x}px`,
                        top: `${table.pos_y}px`,
                      }}
                    >
                      <span className="font-black text-sm tracking-tight text-center leading-tight">
                        {table.name}
                      </span>
                      <div className="flex items-center gap-1 text-[10px] opacity-90 mt-1">
                        <Users className="h-3 w-3" />
                        <span>{table.capacity} org</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </Card>
          <p className="text-xs text-muted-foreground mt-2 italic">
            * Geser dan lepas (drag & drop) meja ke posisi yang diinginkan di dalam denah. Posisi tersimpan otomatis.
          </p>
        </div>

        {/* Panel Informasi Meja Terpilih */}
        <div className="space-y-4">
          <Card className="p-4 shadow-sm">
            <h3 className="font-bold text-sm mb-3 pb-2 border-b">Detail Meja Terpilih</h3>

            {selectedTable ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-lg font-black">{selectedTable.name}</span>
                  <Badge
                    variant={
                      selectedTable.status === 'available'
                        ? 'success'
                        : selectedTable.status === 'occupied'
                        ? 'destructive'
                        : 'warning'
                    }
                  >
                    {selectedTable.status === 'available'
                      ? 'Kosong'
                      : selectedTable.status === 'occupied'
                      ? 'Terisi'
                      : 'Perlu Dibersihkan'}
                  </Badge>
                </div>

                <div className="space-y-1.5 text-xs text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Kapasitas:</span>
                    <span className="font-bold text-foreground">{selectedTable.capacity} Orang</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Bentuk:</span>
                    <span className="capitalize font-semibold text-foreground">{selectedTable.shape}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Posisi X, Y:</span>
                    <span className="font-mono text-foreground">{selectedTable.pos_x}px, {selectedTable.pos_y}px</span>
                  </div>
                </div>

                {/* Pesanan Aktif jika meja Terisi */}
                {activeOrder && (
                  <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-xs space-y-1">
                    <p className="font-bold text-amber-800 dark:text-amber-300">Pesanan Aktif: {activeOrder.order_number}</p>
                    <p className="text-muted-foreground">{activeOrder.items.length} item · Total: Rp{activeOrder.total.toLocaleString('id-ID')}</p>
                  </div>
                )}

                {/* Tombol Bersihkan jika status 'needs_cleaning' */}
                {selectedTable.status === 'needs_cleaning' && (
                  <Button
                    onClick={() => {
                      cleanTable(selectedTable.id);
                      showToast(`Meja ${selectedTable.name} telah dibersihkan dan siap dipakai`, 'success');
                    }}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Tandai Sudah Bersih
                  </Button>
                )}

                {/* Aksi Meja */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setTableForm({
                        name: selectedTable.name,
                        capacity: selectedTable.capacity,
                        shape: selectedTable.shape,
                        area_id: selectedTable.area_id,
                      });
                      setIsEditModalOpen(true);
                    }}
                    className="text-xs"
                  >
                    <Edit2 className="mr-1.5 h-3.5 w-3.5" />
                    Edit
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleShowQr(selectedTable)}
                    className="text-xs text-primary hover:text-primary font-semibold"
                  >
                    <QrCode className="mr-1.5 h-3.5 w-3.5" />
                    QR Meja
                  </Button>
                </div>

                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleDeleteTable(selectedTable.id)}
                  disabled={!!activeOrder}
                  className="w-full text-xs"
                >
                  <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                  Hapus Meja
                </Button>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground py-6 text-center">
                Pilih meja pada denah untuk melihat informasi dan mengedit pengaturan meja.
              </p>
            )}
          </Card>
        </div>

      </div>

      {/* MODAL TAMBAH MEJA */}
      <Dialog open={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} maxWidth="max-w-md">
        <DialogHeader>
          <DialogTitle>Tambah Meja ke Denah</DialogTitle>
          <DialogDescription>Tentukan nomor meja, kapasitas tempat duduk, dan bentuk visual.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 my-2">
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">
              Nomor / Nama Meja *
            </label>
            <Input
              placeholder="Contoh: Meja 06"
              value={tableForm.name}
              onChange={(e) => setTableForm({ ...tableForm, name: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">
                Kapasitas (Orang)
              </label>
              <Input
                type="number"
                min="1"
                max="20"
                value={tableForm.capacity}
                onChange={(e) => setTableForm({ ...tableForm, capacity: e.target.value })}
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">
                Bentuk Meja
              </label>
              <Select
                value={tableForm.shape}
                onChange={(e) => setTableForm({ ...tableForm, shape: e.target.value })}
              >
                <option value="square">Persegi (Kotak)</option>
                <option value="round">Bulat</option>
                <option value="rectangle">Persegi Panjang</option>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>
            Batal
          </Button>
          <Button onClick={handleSaveAddTable} className="font-bold">
            Simpan Meja
          </Button>
        </DialogFooter>
      </Dialog>

      {/* MODAL EDIT MEJA */}
      <Dialog open={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} maxWidth="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Data Meja</DialogTitle>
          <DialogDescription>Perbarui nama, kapasitas atau bentuk meja terpilih.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 my-2">
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">
              Nama Meja *
            </label>
            <Input
              value={tableForm.name}
              onChange={(e) => setTableForm({ ...tableForm, name: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">
                Kapasitas
              </label>
              <Input
                type="number"
                value={tableForm.capacity}
                onChange={(e) => setTableForm({ ...tableForm, capacity: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">
                Bentuk
              </label>
              <Select
                value={tableForm.shape}
                onChange={(e) => setTableForm({ ...tableForm, shape: e.target.value })}
              >
                <option value="square">Persegi</option>
                <option value="round">Bulat</option>
                <option value="rectangle">Persegi Panjang</option>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
            Batal
          </Button>
          <Button onClick={handleSaveEditTable} className="font-bold">
            Simpan Perubahan
          </Button>
        </DialogFooter>
      </Dialog>

      {/* MODAL QR CODE MEJA (UNTUK CETAK / SELF-ORDERING) */}
      <Dialog open={!!qrModalData} onClose={() => setQrModalData(null)} maxWidth="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-center">{qrModalData?.table?.name}</DialogTitle>
          <DialogDescription className="text-center">
            Scan untuk pesan langsung dari HP tanpa instal aplikasi
          </DialogDescription>
        </DialogHeader>

        {qrModalData && (
          <div className="flex flex-col items-center justify-center p-4 bg-white rounded-2xl shadow-inner border my-2">
            <img src={qrModalData.qrDataUrl} alt="QR Meja" className="w-56 h-56" />
            <p className="text-[10px] text-gray-500 font-mono mt-2 break-all text-center">
              {qrModalData.publicUrl}
            </p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => setQrModalData(null)} className="w-full">
            Tutup
          </Button>
          <Button
            onClick={() => {
              window.open(qrModalData?.publicUrl, '_blank');
            }}
            className="w-full font-bold"
          >
            Buka Halaman Tamu
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
