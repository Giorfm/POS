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
import { PinPadDialog } from '@/components/auth/PinPadDialog';
import { useToast } from '@/components/ui/Toaster';
import { 
  DollarSign, 
  Clock, 
  ArrowDownCircle, 
  ArrowUpCircle, 
  Printer, 
  Lock, 
  AlertCircle, 
  CheckCircle2, 
  History, 
  FileText 
} from 'lucide-react';

export default function ShiftsManagementPage() {
  const {
    currentShift,
    shifts,
    cashMovements,
    payments,
    currentUser,
    openShift,
    addCashMovement,
    closeShift,
    outlet,
  } = usePosStore();

  const { showToast } = useToast();

  // Modal Buka Shift
  const [isOpenShiftModalOpen, setIsOpenShiftModalOpen] = useState(false);
  const [openingCashInput, setOpeningCashInput] = useState('500000');
  const [openingNotes, setOpeningNotes] = useState('Modal awal uang kembalian');

  // Modal Kas Masuk / Keluar (Petty Cash)
  const [isCashMovementModalOpen, setIsCashMovementModalOpen] = useState(false);
  const [cashMovementType, setCashMovementType] = useState('out'); // 'in' | 'out'
  const [cashMovementAmount, setCashMovementAmount] = useState('');
  const [cashMovementReason, setCashMovementReason] = useState('');

  // Modal Tutup Shift (Z-Report)
  const [isCloseShiftModalOpen, setIsCloseShiftModalOpen] = useState(false);
  const [actualCashInput, setActualCashInput] = useState('');
  const [closeNotes, setCloseNotes] = useState('');
  const [isManagerAuthOpen, setIsManagerAuthOpen] = useState(false);
  const [pendingCloseData, setPendingCloseData] = useState(null);

  // Modal Print Z-Report
  const [selectedZReport, setSelectedZReport] = useState(null);

  // Perhitungan Keuangan Shift Aktif Saat Ini
  const shiftCashPayments = currentShift
    ? payments.filter((p) => p.method === 'cash' && new Date(p.paid_at) >= new Date(currentShift.opened_at))
    : [];
  const totalCashSales = shiftCashPayments.reduce((acc, p) => acc + p.amount, 0);

  const shiftMovements = currentShift
    ? cashMovements.filter((m) => m.shift_id === currentShift.id)
    : [];
  const totalCashIn = shiftMovements.filter((m) => m.type === 'in').reduce((s, m) => s + m.amount, 0);
  const totalCashOut = shiftMovements.filter((m) => m.type === 'out').reduce((s, m) => s + m.amount, 0);

  const expectedCashNow = currentShift
    ? currentShift.opening_cash + totalCashSales + totalCashIn - totalCashOut
    : 0;

  // Buka Shift Handler
  const handleConfirmOpenShift = () => {
    const val = Number(openingCashInput);
    if (isNaN(val) || val < 0) {
      showToast('Modal awal kas tidak valid', 'error');
      return;
    }

    try {
      openShift(val, openingNotes);
      showToast('Shift kasir berhasil dibuka!', 'success');
      setIsOpenShiftModalOpen(false);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Catat Kas Masuk / Keluar
  const handleConfirmCashMovement = () => {
    const amt = Number(cashMovementAmount);
    if (isNaN(amt) || amt <= 0) {
      showToast('Nominal kas harus lebih dari 0', 'error');
      return;
    }
    if (!cashMovementReason.trim()) {
      showToast('Alasan kas wajib diisi', 'error');
      return;
    }

    try {
      addCashMovement(cashMovementType, amt, cashMovementReason.trim());
      showToast(`Kas ${cashMovementType === 'in' ? 'Masuk' : 'Keluar'} sebesar ${formatRupiah(amt)} dicatat`, 'success');
      setIsCashMovementModalOpen(false);
      setCashMovementAmount('');
      setCashMovementReason('');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Tutup Shift Handler
  const handleInitiateCloseShift = () => {
    const actual = Number(actualCashInput);
    if (isNaN(actual) || actual < 0) {
      showToast('Masukkan jumlah kas fisik yang dihitung', 'error');
      return;
    }

    const variance = actual - expectedCashNow;

    // Jika ada selisih kas fisik vs ekspektasi sistem, wajib PIN Manajer!
    if (Math.abs(variance) > 0) {
      setPendingCloseData({ actual, notes: closeNotes, variance });
      setIsManagerAuthOpen(true);
    } else {
      executeClose(actual, closeNotes, null);
    }
  };

  const handleManagerAuthSuccess = async (managerPin, reason) => {
    if (!pendingCloseData) return;
    await executeClose(pendingCloseData.actual, `${pendingCloseData.notes} (Disetujui Manajer: ${reason})`, managerPin);
    setIsManagerAuthOpen(false);
    setPendingCloseData(null);
  };

  const executeClose = async (actual, notes, managerPin) => {
    try {
      const closed = await closeShift(actual, notes, managerPin);
      showToast('Shift berhasil ditutup! Laporan Z-Report tersimpan.', 'success');
      setIsCloseShiftModalOpen(false);
      setActualCashInput('');
      setCloseNotes('');
      setSelectedZReport(closed);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Halaman */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Manajemen Shift & Laci Kasir</h1>
          <p className="text-sm text-muted-foreground">
            Buka laci kas dengan modal awal, pantau petty cash keluar/masuk, hitung selisih fisik, dan cetak Z-Report
          </p>
        </div>

        <div>
          {currentShift ? (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => setIsCashMovementModalOpen(true)}
                className="text-xs font-bold gap-1.5"
              >
                <DollarSign className="h-4 w-4" />
                <span>Kas Masuk / Keluar</span>
              </Button>

              <Button
                onClick={() => {
                  setActualCashInput(String(expectedCashNow));
                  setIsCloseShiftModalOpen(true);
                }}
                className="text-xs font-bold gap-1.5 bg-rose-600 hover:bg-rose-700 text-white shadow-md"
              >
                <Lock className="h-4 w-4" />
                <span>Tutup Shift Kasir</span>
              </Button>
            </div>
          ) : (
            <Button
              onClick={() => setIsOpenShiftModalOpen(true)}
              className="text-xs font-bold gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-md animate-pulse"
            >
              <Clock className="h-4 w-4" />
              <span>Buka Shift Baru Sekarang</span>
            </Button>
          )}
        </div>
      </div>

      {/* STATUS SHIFT AKTIF ATAU BANNER KOSONG */}
      {currentShift ? (
        <div className="space-y-4">
          <Card className="p-6 border-2 border-emerald-500/40 bg-gradient-to-br from-card via-emerald-50/10 to-card shadow-md">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center font-bold shadow-sm">
                  <Clock className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-black text-foreground">Shift Kasir Sedang Berjalan</h2>
                    <Badge variant="success">AKTIF</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Dibuka pada: {formatDateTime(currentShift.opened_at)} · Kasir: {currentUser?.name}
                  </p>
                </div>
              </div>

              <div className="text-right">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                  Estimasi Uang Fisik di Laci Kas:
                </span>
                <span className="text-2xl font-black text-emerald-600 font-mono">
                  {formatRupiah(expectedCashNow)}
                </span>
              </div>
            </div>

            {/* Breakdown Angka Keuangan Shift */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 text-xs">
              <div className="p-3 rounded-xl bg-muted/40 border">
                <span className="text-muted-foreground block">Modal Awal Kas</span>
                <span className="text-base font-black font-mono mt-1 block">
                  {formatRupiah(currentShift.opening_cash)}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
                <span className="text-emerald-800 dark:text-emerald-300 block">Penjualan Tunai</span>
                <span className="text-base font-black font-mono text-emerald-700 dark:text-emerald-400 mt-1 block">
                  +{formatRupiah(totalCashSales)}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800">
                <span className="text-sky-800 dark:text-sky-300 block">Kas Masuk (Petty Cash)</span>
                <span className="text-base font-black font-mono text-sky-700 dark:text-sky-400 mt-1 block">
                  +{formatRupiah(totalCashIn)}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800">
                <span className="text-rose-800 dark:text-rose-300 block">Kas Keluar (Operasional)</span>
                <span className="text-base font-black font-mono text-rose-700 dark:text-rose-400 mt-1 block">
                  -{formatRupiah(totalCashOut)}
                </span>
              </div>
            </div>
          </Card>

          {/* Tabel Petty Cash Movement Shift Ini */}
          <Card className="shadow-sm border">
            <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
              <CardTitle className="text-sm">Riwayat Kas Masuk & Keluar Shift Ini</CardTitle>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsCashMovementModalOpen(true)}
                className="h-8 text-xs font-bold gap-1"
              >
                <DollarSign className="h-3.5 w-3.5" />
                <span>+ Catat Kas</span>
              </Button>
            </CardHeader>

            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/30 border-b text-muted-foreground font-semibold uppercase tracking-wider">
                    <tr>
                      <th className="p-3.5">Waktu</th>
                      <th className="p-3.5">Jenis</th>
                      <th className="p-3.5">Nominal</th>
                      <th className="p-3.5">Alasan / Keterangan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {shiftMovements.length === 0 ? (
                      <tr>
                        <td colSpan="4" className="p-6 text-center text-muted-foreground">
                          Belum ada pengeluaran atau penambahan kas kecil selama shift ini.
                        </td>
                      </tr>
                    ) : (
                      shiftMovements.map((m) => (
                        <tr key={m.id} className="hover:bg-muted/20 transition-colors">
                          <td className="p-3.5 font-mono text-muted-foreground">
                            {formatDateTime(m.created_at)}
                          </td>
                          <td className="p-3.5 font-bold uppercase">
                            <Badge variant={m.type === 'in' ? 'success' : 'destructive'}>
                              {m.type === 'in' ? 'Kas Masuk' : 'Kas Keluar'}
                            </Badge>
                          </td>
                          <td className="p-3.5 font-mono font-bold">
                            {formatRupiah(m.amount)}
                          </td>
                          <td className="p-3.5 font-medium">{m.reason}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card className="p-12 text-center border-dashed border-2 bg-muted/20">
          <Clock className="h-12 w-12 mx-auto mb-3 text-muted-foreground/40 animate-pulse" />
          <h3 className="text-lg font-black text-foreground">Shift Kasir Sedang Tutup</h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto mt-1 mb-4">
            Sebelum memulai transaksi penjualan di kasir, silakan buka shift dan masukkan modal awal di laci kas.
          </p>
          <Button
            onClick={() => setIsOpenShiftModalOpen(true)}
            className="font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md text-xs"
          >
            Buka Shift Sekarang
          </Button>
        </Card>
      )}

      {/* RIWAYAT SHIFT TERDAHULU (Z-REPORT) */}
      <div className="space-y-4 pt-4">
        <h3 className="text-lg font-black tracking-tight">Riwayat Dokumen Shift & Z-Report</h3>

        <div className="rounded-2xl border bg-card overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/40 border-b text-muted-foreground font-semibold uppercase tracking-wider">
                <tr>
                  <th className="p-4">Waktu Buka / Tutup</th>
                  <th className="p-4">Modal Awal</th>
                  <th className="p-4">Ekspektasi Sistem</th>
                  <th className="p-4">Fisik Aktual</th>
                  <th className="p-4">Selisih (Variance)</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Z-Report</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border font-mono">
                {shifts.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="p-8 text-center text-muted-foreground font-sans">
                      Belum ada riwayat shift yang tersimpan.
                    </td>
                  </tr>
                ) : (
                  shifts.map((s) => {
                    const isClosed = s.status === 'closed';
                    const hasVariance = s.variance !== 0;

                    return (
                      <tr key={s.id} className="hover:bg-muted/20 transition-colors">
                        <td className="p-4 text-foreground font-sans">
                          <p className="font-bold">{formatDateTime(s.opened_at)}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {isClosed ? `s/d ${formatDateTime(s.closed_at)}` : 'Sedang berjalan'}
                          </p>
                        </td>
                        <td className="p-4 font-bold">{formatRupiah(s.opening_cash)}</td>
                        <td className="p-4 text-muted-foreground">{formatRupiah(s.expected_cash)}</td>
                        <td className="p-4 font-bold text-foreground">
                          {isClosed ? formatRupiah(s.actual_cash) : '-'}
                        </td>
                        <td className="p-4 font-bold">
                          {isClosed ? (
                            <span className={s.variance === 0 ? 'text-emerald-600' : 'text-rose-600'}>
                              {s.variance > 0 ? `+${formatRupiah(s.variance)}` : formatRupiah(s.variance)}
                            </span>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="p-4 font-sans">
                          <Badge variant={isClosed ? 'success' : 'warning'}>
                            {isClosed ? 'Selesai' : 'Aktif'}
                          </Badge>
                        </td>
                        <td className="p-4 text-right font-sans">
                          {isClosed && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSelectedZReport(s)}
                              className="text-xs font-semibold gap-1 h-8"
                            >
                              <FileText className="h-3.5 w-3.5" />
                              <span>Lihat Z-Report</span>
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* DIALOG BUKA SHIFT */}
      <Dialog open={isOpenShiftModalOpen} onClose={() => setIsOpenShiftModalOpen(false)} maxWidth="max-w-md">
        <DialogHeader>
          <DialogTitle>Buka Shift Kasir Baru</DialogTitle>
          <DialogDescription>
            Masukkan jumlah modal awal uang fisik yang ada di laci kasir saat ini.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 my-2">
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">
              Modal Awal Laci Kas (Rp) *
            </label>
            <Input
              type="number"
              value={openingCashInput}
              onChange={(e) => setOpeningCashInput(e.target.value)}
              className="text-lg font-mono font-bold"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">
              Catatan Buka Shift
            </label>
            <Input
              value={openingNotes}
              onChange={(e) => setOpeningNotes(e.target.value)}
              placeholder="Contoh: Pecahan 50rb (5), 20rb (10)..."
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpenShiftModalOpen(false)}>
            Batal
          </Button>
          <Button onClick={handleConfirmOpenShift} className="font-bold bg-emerald-600 hover:bg-emerald-700 text-white">
            Konfirmasi Buka Shift
          </Button>
        </DialogFooter>
      </Dialog>

      {/* DIALOG CATAT KAS MASUK / KELUAR (PETTY CASH) */}
      <Dialog open={isCashMovementModalOpen} onClose={() => setIsCashMovementModalOpen(false)} maxWidth="max-w-md">
        <DialogHeader>
          <DialogTitle>Catat Kas Masuk / Keluar (Petty Cash)</DialogTitle>
          <DialogDescription>
            Catat arus uang tunai di luar penjualan tiket (misal: beli es batu, tambah uang kecil).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 my-2">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setCashMovementType('out')}
              className={`p-3 rounded-xl border text-xs font-bold transition-all ${
                cashMovementType === 'out'
                  ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                  : 'bg-card hover:bg-muted'
              }`}
            >
              Kas Keluar (Biaya)
            </button>
            <button
              type="button"
              onClick={() => setCashMovementType('in')}
              className={`p-3 rounded-xl border text-xs font-bold transition-all ${
                cashMovementType === 'in'
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                  : 'bg-card hover:bg-muted'
              }`}
            >
              Kas Masuk (Tambah Modal)
            </button>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">
              Nominal Uang (Rp) *
            </label>
            <Input
              type="number"
              placeholder="Contoh: 25000"
              value={cashMovementAmount}
              onChange={(e) => setCashMovementAmount(e.target.value)}
              className="text-lg font-mono font-bold"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">
              Alasan / Keterangan *
            </label>
            <Input
              placeholder="Contoh: Beli es batu kristal 2 karung..."
              value={cashMovementReason}
              onChange={(e) => setCashMovementReason(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsCashMovementModalOpen(false)}>
            Batal
          </Button>
          <Button onClick={handleConfirmCashMovement} className="font-bold">
            Simpan Arus Kas
          </Button>
        </DialogFooter>
      </Dialog>

      {/* DIALOG TUTUP SHIFT & HITUNG KAS FISIK */}
      <Dialog open={isCloseShiftModalOpen} onClose={() => setIsCloseShiftModalOpen(false)} maxWidth="max-w-md">
        <DialogHeader>
          <DialogTitle>Tutup Shift Kasir (Close Shift)</DialogTitle>
          <DialogDescription>
            Hitung seluruh uang fisik di laci kas dan bandingkan dengan catatan sistem.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 my-2">
          {/* Perbandingan Ekspektasi vs Aktual */}
          <div className="p-3.5 rounded-2xl bg-muted/40 border space-y-1.5 text-xs">
            <div className="flex justify-between text-muted-foreground">
              <span>Modal Awal:</span>
              <span className="font-mono">{formatRupiah(currentShift?.opening_cash)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Penjualan Tunai:</span>
              <span className="font-mono text-emerald-600">+{formatRupiah(totalCashSales)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Kas Masuk / Keluar:</span>
              <span className="font-mono">
                {totalCashIn - totalCashOut >= 0 ? `+${formatRupiah(totalCashIn - totalCashOut)}` : formatRupiah(totalCashIn - totalCashOut)}
              </span>
            </div>
            <div className="flex justify-between font-bold text-sm pt-2 border-t">
              <span>Ekspektasi Kas Sistem:</span>
              <span className="font-mono text-primary font-black">{formatRupiah(expectedCashNow)}</span>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">
              Hitungan Uang Fisik Aktual (Rp) *
            </label>
            <Input
              type="number"
              value={actualCashInput}
              onChange={(e) => setActualCashInput(e.target.value)}
              className="text-lg font-mono font-bold"
            />
          </div>

          {/* Indikator Selisih Kas */}
          <div className="p-3 rounded-xl border flex items-center justify-between text-xs font-bold">
            <span>Selisih (Variance):</span>
            <span className={`font-mono text-sm ${
              Number(actualCashInput) - expectedCashNow === 0
                ? 'text-emerald-600'
                : 'text-rose-600'
            }`}>
              {formatRupiah(Number(actualCashInput) - expectedCashNow)}
            </span>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">
              Catatan Penutupan Shift
            </label>
            <Input
              placeholder="Catatan kendala atau serah terima kasir..."
              value={closeNotes}
              onChange={(e) => setCloseNotes(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsCloseShiftModalOpen(false)}>
            Batal
          </Button>
          <Button onClick={handleInitiateCloseShift} className="font-bold bg-rose-600 hover:bg-rose-700 text-white">
            Konfirmasi Tutup Shift
          </Button>
        </DialogFooter>
      </Dialog>

      {/* MODAL OTORISASI MANAJER JIKA ADA SELISIH VARIANCE KAS */}
      <PinPadDialog
        open={isManagerAuthOpen}
        onClose={() => setIsManagerAuthOpen(false)}
        onSuccess={handleManagerAuthSuccess}
        title="Otorisasi Selisih Kas Shift"
        description={`Terdapat selisih kas sebesar ${formatRupiah(pendingCloseData?.variance || 0)}. Memerlukan otorisasi PIN Manajer untuk menutup shift.`}
        requireReason={true}
      />

      {/* MODAL PRATINJAU Z-REPORT UNTUK DICETAK */}
      <Dialog open={!!selectedZReport} onClose={() => setSelectedZReport(null)} maxWidth="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center uppercase font-mono">LAPORAN SHIFT (Z-REPORT)</DialogTitle>
          <DialogDescription className="text-center font-mono text-xs">
            {outlet.name}
          </DialogDescription>
        </DialogHeader>

        {selectedZReport && (
          <div className="bg-white text-black p-4 font-mono text-xs rounded-xl border space-y-3 my-2 shadow-inner">
            <div className="text-center border-b pb-2 space-y-0.5">
              <h3 className="font-bold text-sm">{outlet.name}</h3>
              <p className="text-[10px] text-gray-600">{outlet.address}</p>
            </div>

            <div className="space-y-1 text-[11px] border-b pb-2">
              <div className="flex justify-between">
                <span>Waktu Buka:</span>
                <span>{formatDateTime(selectedZReport.opened_at)}</span>
              </div>
              <div className="flex justify-between">
                <span>Waktu Tutup:</span>
                <span>{formatDateTime(selectedZReport.closed_at)}</span>
              </div>
              <div className="flex justify-between">
                <span>Kasir Bertugas:</span>
                <span className="font-bold">{currentUser?.name}</span>
              </div>
            </div>

            <div className="space-y-1 text-[11px] border-b pb-2">
              <div className="flex justify-between">
                <span>Modal Awal:</span>
                <span>{formatRupiah(selectedZReport.opening_cash)}</span>
              </div>
              <div className="flex justify-between">
                <span>Kas Fisik Aktual:</span>
                <span className="font-bold">{formatRupiah(selectedZReport.actual_cash)}</span>
              </div>
              <div className="flex justify-between">
                <span>Ekspektasi Sistem:</span>
                <span>{formatRupiah(selectedZReport.expected_cash)}</span>
              </div>
              <div className="flex justify-between font-bold pt-1 border-t">
                <span>Selisih (Variance):</span>
                <span>{formatRupiah(selectedZReport.variance)}</span>
              </div>
            </div>

            <div className="text-center text-[10px] text-gray-500 pt-1">
              *** AKHIR DARI LAPORAN Z-REPORT ***
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => setSelectedZReport(null)}>
            Tutup
          </Button>
          <Button onClick={() => window.print()} className="font-bold gap-1.5">
            <Printer className="h-4 w-4" />
            Cetak Z-Report
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
