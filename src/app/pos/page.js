/* eslint-disable @next/next/no-img-element */
'use client';

import React, { useState, useEffect } from 'react';
import { usePosStore } from '@/lib/store/usePosStore';
import { formatRupiah, formatDuration, getDurationMinutes } from '@/lib/formatters';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/Dialog';
import { useToast } from '@/components/ui/Toaster';
import { PinPadDialog } from '@/components/auth/PinPadDialog';
import { generateQrisPayload, generateQrCodeDataUrl } from '@/lib/qris/mockQris';
import { SplitBillModal } from '@/components/pos/SplitBillModal';
import { MergeTablesModal } from '@/components/pos/MergeTablesModal';
import {
  Search,
  ShoppingCart,
  Send,
  CreditCard,
  QrCode,
  Banknote,
  Plus,
  Minus,
  Trash2,
  Users,
  Clock,
  Sparkles,
  ArrowRightLeft,
  Divide,
  Percent,
  Check,
  AlertCircle,
  Coffee,
  Utensils
} from 'lucide-react';

export default function PosTerminalPage() {
  const {
    outlet,
    currentUser,
    currentShift,
    tables,
    areas,
    activeAreaId,
    setActiveArea,
    categories,
    products,
    modifierGroups,
    modifierOptions,
    cartItems,
    addToCart,
    updateCartQty,
    removeFromCart,
    clearCart,
    orders,
    createOrder,
    sendOrderToKitchen,
    addItemsToExistingOrder,
    payBill,
    bills,
    cleanTable,
    moveTable,
    activeTableId,
    setActiveTable,
  } = usePosStore();

  const { showToast } = useToast();

  // Mode & Filter
  const [orderType, setOrderType] = useState('dine_in'); // 'dine_in' | 'takeaway'
  const [selectedCategoryId, setSelectedCategoryId] = useState('all');
  const [search, setSearch] = useState('');
  const [showTableSelector, setShowTableSelector] = useState(true);

  // Modifier Customization Dialog
  const [customizingProduct, setCustomizingProduct] = useState(null);
  const [selectedModifiers, setSelectedModifiers] = useState([]);
  const [itemNotes, setItemNotes] = useState('');

  // Payment Modal
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cash'); // 'cash' | 'qris' | 'card'
  const [tenderedCash, setTenderedCash] = useState('');
  const [cardReference, setCardReference] = useState('');
  const [qrisDataUrl, setQrisDataUrl] = useState('');
  const [qrisTimer, setQrisTimer] = useState(120);

  // Move, Split & Merge Table Modals
  const [isMoveTableModalOpen, setIsMoveTableModalOpen] = useState(false);
  const [targetMoveTableId, setTargetMoveTableId] = useState('');
  const [isSplitModalOpen, setIsSplitModalOpen] = useState(false);
  const [isMergeModalOpen, setIsMergeModalOpen] = useState(false);

  // Discount Modal & Manager PIN
  const [isDiscountModalOpen, setIsDiscountModalOpen] = useState(false);
  const [discountPercent, setDiscountPercent] = useState('');
  const [discountReason, setDiscountReason] = useState('');
  const [isManagerAuthOpen, setIsManagerAuthOpen] = useState(false);

  // Pesanan aktif di meja terpilih
  const selectedTable = tables.find((t) => t.id === activeTableId);
  const activeOrder = orders.find(
    (o) => o.table_id === activeTableId && (o.status === 'open' || o.status === 'sent')
  );
  const activeBill = activeOrder ? bills.find((b) => b.order_id === activeOrder.id && b.status === 'pending') : null;

  // Filter Produk
  const filteredProducts = products.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchesCat = selectedCategoryId === 'all' || p.category_id === selectedCategoryId;
    return matchesSearch && matchesCat && p.is_available;
  });

  // Dialog Kustomisasi Modifier
  const handleOpenCustomize = (product) => {
    // Cari grup modifier yang terkait dengan produk
    const productGroups = modifierGroups.filter((g) => (product.modifier_group_ids || []).includes(g.id));

    // Jika produk tidak punya modifier, langsung tambah ke keranjang (1 ketukan)
    if (productGroups.length === 0) {
      addToCart(product, [], '');
      showToast(`${product.name} ditambahkan`, 'info', 1500);
      return;
    }

    // Default modifier options
    const defaults = [];
    productGroups.forEach((g) => {
      const defaultOption = modifierOptions.find((opt) => opt.group_id === g.id && opt.is_default);
      if (defaultOption) {
        defaults.push(defaultOption);
      }
    });

    setCustomizingProduct(product);
    setSelectedModifiers(defaults);
    setItemNotes('');
  };

  const handleToggleModifierOption = (group, option) => {
    setSelectedModifiers((prev) => {
      const isAlreadySelected = prev.some((o) => o.id === option.id);
      if (isAlreadySelected) {
        return prev.filter((o) => o.id !== option.id);
      }

      // Aturan Single Select (Radio) vs Multi Select
      if (group.max_select === 1) {
        const withoutCurrentGroup = prev.filter((o) => o.group_id !== group.id);
        return [...withoutCurrentGroup, option];
      }

      // Multi Select dengan batas max
      const currentGroupCount = prev.filter((o) => o.group_id === group.id).length;
      if (currentGroupCount >= group.max_select) {
        showToast(`Maksimal ${group.max_select} pilihan untuk ${group.name}`, 'warning');
        return prev;
      }

      return [...prev, option];
    });
  };

  const handleConfirmCustomize = () => {
    if (!customizingProduct) return;

    // Validasi required modifier groups
    const productGroups = modifierGroups.filter((g) => (customizingProduct.modifier_group_ids || []).includes(g.id));
    for (const g of productGroups) {
      if (g.is_required) {
        const selectedCount = selectedModifiers.filter((o) => o.group_id === g.id).length;
        if (selectedCount < g.min_select) {
          showToast(`Wajib memilih "${g.name}" minimal ${g.min_select}`, 'error');
          return;
        }
      }
    }

    addToCart(customizingProduct, selectedModifiers, itemNotes);
    setCustomizingProduct(null);
    showToast(`${customizingProduct.name} ditambahkan`, 'info', 1500);
  };

  // Simpan Pesanan / Kirim ke Dapur
  const handleSendToKitchen = () => {
    if (!currentShift) {
      showToast('Buka shift kasir terlebih dahulu sebelum membuat pesanan!', 'error');
      return;
    }

    try {
      if (activeOrder) {
        // Tambah item ke pesanan yang sudah ada
        if (cartItems.length === 0) {
          // Hanya trigger kirim ke dapur ulang jika ada item baru
          sendOrderToKitchen(activeOrder.id);
          showToast(`Pesanan ${activeOrder.order_number} dikirim ke dapur!`, 'success');
          return;
        }
        addItemsToExistingOrder(activeOrder.id, cartItems);
        sendOrderToKitchen(activeOrder.id);
        showToast(`Item tambahan pesanan ${activeOrder.order_number} berhasil dikirim ke dapur!`, 'success');
      } else {
        // Buat order baru
        if (orderType === 'dine_in' && !activeTableId) {
          showToast('Pilih meja terlebih dahulu untuk Dine-in', 'error');
          return;
        }
        if (cartItems.length === 0) {
          showToast('Keranjang masih kosong', 'error');
          return;
        }

        const newOrder = createOrder({
          tableId: orderType === 'dine_in' ? activeTableId : null,
          type: orderType,
          customerName: orderType === 'dine_in' ? selectedTable?.name : 'Tamu Takeaway',
          items: cartItems,
        });

        sendOrderToKitchen(newOrder.id);
        showToast(`Pesanan ${newOrder.order_number} berhasil dikirim ke dapur!`, 'success');
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Buka Dialog Pembayaran
  const handleOpenPayment = async () => {
    if (!activeOrder && cartItems.length === 0) {
      showToast('Tidak ada pesanan aktif atau item untuk dibayar', 'error');
      return;
    }

    // Jika belum tersimpan, buat pesanan dulu
    let orderToPay = activeOrder;
    if (!orderToPay && cartItems.length > 0) {
      try {
        orderToPay = createOrder({
          tableId: orderType === 'dine_in' ? activeTableId : null,
          type: orderType,
          customerName: orderType === 'dine_in' ? selectedTable?.name : 'Tamu Takeaway',
          items: cartItems,
        });
      } catch (err) {
        showToast(err.message, 'error');
        return;
      }
    }

    const bill = bills.find((b) => b.order_id === orderToPay.id && b.status === 'pending');
    if (!bill) {
      showToast('Tagihan pesanan ini sudah lunas', 'info');
      return;
    }

    // Generate QRIS Data URL
    const qrisPayload = generateQrisPayload(orderToPay.order_number, bill.amount, outlet.name);
    const qrisUrl = await generateQrCodeDataUrl(qrisPayload);
    setQrisDataUrl(qrisUrl);

    setPaymentMethod('cash');
    setTenderedCash(String(bill.amount));
    setIsPaymentModalOpen(true);
  };

  // Eksekusi Pembayaran Sukses
  const handleProcessPayment = () => {
    if (!activeBill) return;

    try {
      const amount = activeBill.amount;
      const tendered = paymentMethod === 'cash' ? Number(tenderedCash) : amount;

      if (paymentMethod === 'cash' && tendered < amount) {
        showToast('Nominal uang tunai kurang dari total tagihan', 'error');
        return;
      }

      payBill(activeBill.id, {
        method: paymentMethod,
        amount,
        tenderedAmount: tendered,
        reference: paymentMethod === 'card' ? cardReference : undefined,
      });

      setIsPaymentModalOpen(false);
      showToast('Pembayaran berhasil! Struk siap dicetak.', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Pindah Meja
  const handleExecuteMoveTable = () => {
    if (!activeOrder || !targetMoveTableId) return;
    try {
      moveTable(activeOrder.id, targetMoveTableId);
      setActiveTable(targetMoveTableId);
      setIsMoveTableModalOpen(false);
      showToast('Pesanan berhasil dipindahkan ke meja baru', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Hitung Nilai Sementara Keranjang + Aktif
  const currentItems = activeOrder
    ? [...activeOrder.items, ...cartItems.map(c => ({
        ...c,
        name_snapshot: c.name,
        price_snapshot: c.unitPrice,
        is_additional: true,
      }))]
    : cartItems.map(c => ({
        ...c,
        name_snapshot: c.name,
        price_snapshot: c.unitPrice,
      }));

  const subtotal = currentItems.reduce((acc, it) => acc + (it.price_snapshot * it.qty), 0);
  const service = Math.round(subtotal * (outlet.service_charge_rate || 0.05));
  const tax = Math.round((subtotal + service) * (outlet.tax_rate || 0.10));
  const grandTotal = subtotal + service + tax;

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-5.5rem)] gap-4 select-none">
      
      {/* SISI KIRI: PEMILIHAN MEJA & KATALOG MENU (70%) */}
      <div className="flex-1 flex flex-col min-w-0 bg-card rounded-2xl border shadow-sm overflow-hidden">
        
        {/* BAR ATAS: TIPE ORDER & PILIHAN MEJA CEPAT */}
        <div className="p-3 border-b bg-muted/20 flex flex-wrap items-center justify-between gap-3">
          
          {/* Tipe Order Switcher */}
          <div className="flex items-center gap-1 p-1 bg-muted rounded-xl">
            <button
              type="button"
              onClick={() => {
                setOrderType('dine_in');
                setShowTableSelector(true);
              }}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                orderType === 'dine_in' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'
              }`}
            >
              Dine-In (Makan di Tempat)
            </button>
            <button
              type="button"
              onClick={() => {
                setOrderType('takeaway');
                setShowTableSelector(false);
                setActiveTable(null);
              }}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                orderType === 'takeaway' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'
              }`}
            >
              Takeaway (Bungkus)
            </button>
          </div>

          {/* Toggle Denah Meja */}
          {orderType === 'dine_in' && (
            <Button
              size="sm"
              variant={showTableSelector ? 'default' : 'outline'}
              onClick={() => setShowTableSelector(!showTableSelector)}
              className="text-xs font-bold gap-1.5"
            >
              <Users className="h-4 w-4" />
              <span>{showTableSelector ? 'Sembunyikan Meja' : 'Pilih Meja'}</span>
              {selectedTable && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full bg-white/20 text-white font-mono text-[10px]">
                  {selectedTable.name}
                </span>
              )}
            </Button>
          )}
        </div>

        {/* PEMILIH MEJA DENGAN STATUS WARNA (ACCORDION / BAR) */}
        {orderType === 'dine_in' && showTableSelector && (
          <div className="p-3 border-b bg-muted/30 transition-all">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Area:</span>
                <div className="flex gap-1">
                  {areas.map((a) => (
                    <button
                      key={a.id}
                      onClick={() => setActiveArea(a.id)}
                      className={`text-[11px] px-2.5 py-1 rounded-md font-semibold transition-colors ${
                        activeAreaId === a.id ? 'bg-primary text-primary-foreground font-bold' : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {a.name}
                    </button>
                  ))}
                </div>
              </div>

              {selectedTable?.status === 'needs_cleaning' && (
                <Button
                  size="sm"
                  onClick={() => {
                    cleanTable(selectedTable.id);
                    showToast(`Meja ${selectedTable.name} siap digunakan kembali`, 'success');
                  }}
                  className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                >
                  <Check className="mr-1 h-3.5 w-3.5" />
                  Selesai Dibersihkan
                </Button>
              )}
            </div>

            {/* Grid Meja */}
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 max-h-36 overflow-y-auto">
              {tables
                .filter((t) => t.area_id === activeAreaId)
                .map((t) => {
                  const isSelected = activeTableId === t.id;
                  const isOccupied = t.status === 'occupied';
                  const needsCleaning = t.status === 'needs_cleaning';

                  // Temukan order aktif di meja ini untuk menampilkan timer dan total
                  const tableOrder = orders.find((o) => o.table_id === t.id && (o.status === 'open' || o.status === 'sent'));
                  const minutesActive = tableOrder ? getDurationMinutes(tableOrder.created_at) : 0;

                  let badgeColor = 'bg-emerald-500 text-white';
                  if (isOccupied) badgeColor = 'bg-amber-500 text-white';
                  if (needsCleaning) badgeColor = 'bg-yellow-500 text-slate-900';

                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setActiveTable(t.id)}
                      className={`p-2 rounded-xl text-left border-2 transition-all flex flex-col justify-between h-20 ${
                        isSelected
                          ? 'border-primary ring-2 ring-primary/40 bg-accent/40 font-bold scale-[1.02]'
                          : 'border-border/60 hover:border-muted-foreground/40 bg-card'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="font-extrabold text-xs">{t.name}</span>
                        <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold ${badgeColor}`}>
                          {isOccupied ? 'Terisi' : needsCleaning ? 'Bersih' : 'Kosong'}
                        </span>
                      </div>

                      {tableOrder ? (
                        <div className="text-[10px] space-y-0.5">
                          <div className="flex items-center gap-1 text-muted-foreground font-mono">
                            <Clock className="h-3 w-3" />
                            <span>{formatDuration(minutesActive)}</span>
                          </div>
                          <div className="font-bold text-primary font-mono truncate">
                            {formatRupiah(tableOrder.total)}
                          </div>
                        </div>
                      ) : (
                        <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          <span>{t.capacity} org</span>
                        </div>
                      )}
                    </button>
                  );
                })}
            </div>
          </div>
        )}

        {/* PENCARIAN & TAB KATEGORI MENU */}
        <div className="p-3 border-b flex flex-col sm:flex-row items-center gap-3">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari menu..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-10 text-xs"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto w-full pb-1">
            <Button
              size="sm"
              variant={selectedCategoryId === 'all' ? 'default' : 'outline'}
              onClick={() => setSelectedCategoryId('all')}
              className="h-9 px-3 rounded-full text-xs shrink-0 font-bold"
            >
              Semua Menu
            </Button>
            {categories.map((c) => (
              <Button
                key={c.id}
                size="sm"
                variant={selectedCategoryId === c.id ? 'default' : 'outline'}
                onClick={() => setSelectedCategoryId(c.id)}
                className="h-9 px-3 rounded-full text-xs shrink-0 font-semibold"
              >
                {c.name}
              </Button>
            ))}
          </div>
        </div>

        {/* GRID KATALOG PRODUK (RAMAH SENTUH) */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3">
            {filteredProducts.map((p) => {
              const hasModifiers = (p.modifier_group_ids || []).length > 0;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleOpenCustomize(p)}
                  className="flex flex-col text-left p-3 rounded-2xl border bg-card hover:border-primary hover:shadow-md transition-all active:scale-[0.98] group relative overflow-hidden"
                >
                  {p.is_favorite && (
                    <span className="absolute top-2 right-2 p-1 rounded-full bg-amber-400 text-amber-950 shadow-sm z-10">
                      <Sparkles className="h-3 w-3 fill-current" />
                    </span>
                  )}

                  <div className="h-20 bg-muted rounded-xl flex items-center justify-center text-muted-foreground/30 mb-2 group-hover:scale-105 transition-transform overflow-hidden relative">
                    <Coffee className="h-8 w-8" />
                  </div>

                  <h4 className="font-bold text-xs leading-snug line-clamp-2 h-8 text-foreground">
                    {p.name}
                  </h4>

                  <div className="flex items-center justify-between mt-2 pt-2 border-t w-full">
                    <span className="font-black text-xs text-primary font-mono">
                      {formatRupiah(p.price)}
                    </span>
                    {hasModifiers && (
                      <span className="text-[10px] text-muted-foreground font-semibold px-1 rounded bg-muted">
                        +Varian
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* SISI KANAN: KERANJANG PESANAN & PEMBAYARAN (30%) */}
      <div className="w-full lg:w-96 flex flex-col bg-card rounded-2xl border shadow-sm overflow-hidden shrink-0">
        
        {/* Header Keranjang */}
        <div className="p-4 border-b bg-muted/20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-primary" />
            <div>
              <h3 className="font-black text-sm leading-tight">
                {orderType === 'dine_in' ? (selectedTable ? selectedTable.name : 'Pilih Meja') : 'Takeaway'}
              </h3>
              <p className="text-[11px] text-muted-foreground">
                {activeOrder ? `Pesanan Aktif: ${activeOrder.order_number}` : 'Pesanan Baru'}
              </p>
            </div>
          </div>

          {orderType === 'dine_in' && activeTableId && (
            <div className="flex items-center gap-1">
              {activeOrder && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsSplitModalOpen(true)}
                    className="h-8 text-[11px] font-bold px-2 text-primary"
                    title="Split Bill"
                  >
                    <Divide className="h-3.5 w-3.5 mr-0.5" />
                    Split
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsMoveTableModalOpen(true)}
                    className="h-8 text-[11px] font-semibold px-2"
                    title="Pindah Meja"
                  >
                    <ArrowRightLeft className="h-3.5 w-3.5 mr-0.5" />
                    Pindah
                  </Button>
                </>
              )}

              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsMergeModalOpen(true)}
                className="h-8 text-[11px] font-semibold px-2"
                title="Gabung Meja"
              >
                Gabung
              </Button>
            </div>
          )}
        </div>

        {/* Daftar Item Keranjang */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 divide-y">
          {currentItems.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground py-16">
              <ShoppingCart className="h-10 w-10 mb-2 opacity-30" />
              <p className="text-sm font-semibold">Keranjang Masih Kosong</p>
              <p className="text-xs">Ketuk menu di sebelah kiri untuk menambahkan pesanan</p>
            </div>
          ) : (
            currentItems.map((item, idx) => {
              const isCartUnsaved = cartItems.some((ci) => ci.id === item.id);

              return (
                <div key={idx} className="pt-2 first:pt-0 space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs">{item.name_snapshot}</span>
                        {item.is_additional && (
                          <Badge variant="warning" className="text-[9px] px-1 py-0 font-bold">
                            TAMBAHAN
                          </Badge>
                        )}
                      </div>
                      <div className="font-mono text-xs text-muted-foreground">
                        {formatRupiah(item.price_snapshot)}
                      </div>
                    </div>

                    {/* Qty Controls */}
                    {isCartUnsaved ? (
                      <div className="flex items-center gap-2 bg-muted/60 p-1 rounded-lg">
                        <button
                          type="button"
                          onClick={() => updateCartQty(item.id, -1)}
                          className="h-6 w-6 rounded bg-card flex items-center justify-center hover:bg-background text-foreground"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="font-bold font-mono text-xs w-4 text-center">{item.qty}</span>
                        <button
                          type="button"
                          onClick={() => updateCartQty(item.id, 1)}
                          className="h-6 w-6 rounded bg-card flex items-center justify-center hover:bg-background text-foreground"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <span className="font-bold font-mono text-xs px-2 py-1 rounded bg-muted">
                        x{item.qty}
                      </span>
                    )}
                  </div>

                  {/* Modifiers List */}
                  {item.modifiers && item.modifiers.length > 0 && (
                    <div className="text-[10px] text-muted-foreground pl-2 space-y-0.5">
                      {item.modifiers.map((m, mIdx) => (
                        <div key={mIdx}>+ {m.name || m.nameSnapshot}</div>
                      ))}
                    </div>
                  )}

                  {/* Item Notes */}
                  {item.notes && (
                    <p className="text-[10px] italic text-amber-700 dark:text-amber-400 pl-2">
                      *{item.notes}
                    </p>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Ringkasan Biaya & Pajak */}
        <div className="p-4 border-t bg-muted/10 space-y-2 text-xs">
          <div className="flex justify-between text-muted-foreground">
            <span>Subtotal</span>
            <span className="font-mono font-semibold">{formatRupiah(subtotal)}</span>
          </div>

          <div className="flex justify-between text-muted-foreground">
            <span>Service Charge (5%)</span>
            <span className="font-mono">{formatRupiah(service)}</span>
          </div>

          <div className="flex justify-between text-muted-foreground">
            <span>PB1 / Pajak Resto (10%)</span>
            <span className="font-mono">{formatRupiah(tax)}</span>
          </div>

          <div className="flex justify-between items-center pt-2 border-t text-sm font-black text-foreground">
            <span>TOTAL PEMBAYARAN</span>
            <span className="text-base text-primary font-mono">{formatRupiah(grandTotal)}</span>
          </div>
        </div>

        {/* Tombol Aksi Kasir */}
        <div className="p-4 border-t bg-card grid grid-cols-2 gap-2">
          {/* Kirim ke Dapur */}
          <Button
            onClick={handleSendToKitchen}
            disabled={currentItems.length === 0}
            variant="outline"
            className="h-14 rounded-xl text-xs font-bold gap-2 flex-col justify-center"
          >
            <Send className="h-4 w-4 text-primary" />
            <span>Kirim Dapur</span>
          </Button>

          {/* Bayar / Tagihan */}
          <Button
            onClick={handleOpenPayment}
            disabled={currentItems.length === 0}
            className="h-14 rounded-xl text-xs font-bold gap-2 flex-col justify-center bg-emerald-600 hover:bg-emerald-700 text-white shadow-md"
          >
            <CreditCard className="h-4 w-4" />
            <span>Bayar (Rp)</span>
          </Button>
        </div>

      </div>

      {/* DIALOG KUSTOMISASI MODIFIER PRODUK */}
      <Dialog
        open={!!customizingProduct}
        onClose={() => setCustomizingProduct(null)}
        maxWidth="max-w-lg"
      >
        <DialogHeader>
          <DialogTitle>{customizingProduct?.name}</DialogTitle>
          <DialogDescription>Pilih variasi rasa, ukuran, dan tambahan sesuai pesanan tamu.</DialogDescription>
        </DialogHeader>

        {customizingProduct && (
          <div className="space-y-4 my-2 max-h-[60vh] overflow-y-auto pr-1">
            {modifierGroups
              .filter((g) => (customizingProduct.modifier_group_ids || []).includes(g.id))
              .map((group) => {
                const options = modifierOptions.filter((o) => o.group_id === group.id);

                return (
                  <div key={group.id} className="space-y-2 p-3 rounded-xl border bg-muted/20">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs">{group.name}</span>
                      {group.is_required ? (
                        <Badge variant="destructive" className="text-[10px]">Wajib (Pilih 1)</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[10px]">Opsional (Maks {group.max_select})</Badge>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      {options.map((opt) => {
                        const isChecked = selectedModifiers.some((m) => m.id === opt.id);
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => handleToggleModifierOption(group, opt)}
                            className={`p-2.5 rounded-xl border text-left text-xs transition-all flex items-center justify-between ${
                              isChecked
                                ? 'bg-primary text-primary-foreground font-bold shadow-sm'
                                : 'hover:bg-muted bg-card text-foreground'
                            }`}
                          >
                            <span>{opt.name}</span>
                            <span className="font-mono text-[10px]">
                              {Number(opt.price_delta) > 0 ? `+${formatRupiah(opt.price_delta)}` : ''}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">
                Catatan Khusus Tamu
              </label>
              <Input
                placeholder="Contoh: Pisahkan sambal, es batu sedikit..."
                value={itemNotes}
                onChange={(e) => setItemNotes(e.target.value)}
                className="text-xs"
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => setCustomizingProduct(null)}>
            Batal
          </Button>
          <Button onClick={handleConfirmCustomize} className="font-bold">
            Tambahkan ke Keranjang
          </Button>
        </DialogFooter>
      </Dialog>

      {/* DIALOG PEMBAYARAN KASIR (CASH, QRIS MOCK, KARTU) */}
      <Dialog
        open={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        maxWidth="max-w-xl"
      >
        <DialogHeader>
          <DialogTitle>Pembayaran Kasir</DialogTitle>
          <DialogDescription>
            Pilih metode pembayaran pelanggan dan lakukan rekonsiliasi kas.
          </DialogDescription>
        </DialogHeader>

        {activeBill && (
          <div className="space-y-4 my-2">
            {/* Total Display */}
            <div className="p-4 rounded-2xl bg-primary/10 border border-primary/20 text-center">
              <span className="text-xs font-semibold text-primary uppercase tracking-wider block">
                Total Tagihan Yang Harus Dibayar
              </span>
              <span className="text-3xl font-black text-primary font-mono mt-1 block">
                {formatRupiah(activeBill.amount)}
              </span>
            </div>

            {/* Metode Bayar Tabs */}
            <div className="grid grid-cols-3 gap-2 p-1 bg-muted rounded-xl">
              <button
                type="button"
                onClick={() => setPaymentMethod('cash')}
                className={`py-3 rounded-lg text-xs font-bold transition-all flex flex-col items-center gap-1 ${
                  paymentMethod === 'cash' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'
                }`}
              >
                <Banknote className="h-5 w-5 text-emerald-600" />
                <span>Tunai (Cash)</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('qris')}
                className={`py-3 rounded-lg text-xs font-bold transition-all flex flex-col items-center gap-1 ${
                  paymentMethod === 'qris' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'
                }`}
              >
                <QrCode className="h-5 w-5 text-sky-600" />
                <span>QRIS Dinamis</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('card')}
                className={`py-3 rounded-lg text-xs font-bold transition-all flex flex-col items-center gap-1 ${
                  paymentMethod === 'card' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'
                }`}
              >
                <CreditCard className="h-5 w-5 text-purple-600" />
                <span>Kartu / EDC</span>
              </button>
            </div>

            {/* TUNAI PANEL */}
            {paymentMethod === 'cash' && (
              <div className="space-y-3 p-4 rounded-2xl border bg-card">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">
                    Uang Tunai Diterima (Rp)
                  </label>
                  <Input
                    type="number"
                    value={tenderedCash}
                    onChange={(e) => setTenderedCash(e.target.value)}
                    className="h-12 text-lg font-mono font-bold"
                  />
                </div>

                {/* Tombol Pecahan Cepat */}
                <div className="grid grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => setTenderedCash(String(activeBill.amount))}
                    className="p-2 rounded-xl border text-xs font-bold hover:bg-muted font-mono"
                  >
                    Uang Pas
                  </button>
                  {[50000, 100000, 200000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setTenderedCash(String(amt))}
                      className="p-2 rounded-xl border text-xs font-bold hover:bg-muted font-mono"
                    >
                      {formatRupiah(amt)}
                    </button>
                  ))}
                </div>

                {/* Kembalian */}
                <div className="flex justify-between items-center p-3 rounded-xl bg-muted/40 font-bold text-sm">
                  <span>Kembalian:</span>
                  <span className="text-base text-emerald-600 font-mono">
                    {formatRupiah(Math.max(0, Number(tenderedCash) - activeBill.amount))}
                  </span>
                </div>
              </div>
            )}

            {/* QRIS PANEL (MOCK GATEWAY) */}
            {paymentMethod === 'qris' && (
              <div className="flex flex-col items-center justify-center p-4 rounded-2xl border bg-card space-y-3">
                {qrisDataUrl && (
                  <img src={qrisDataUrl} alt="QRIS" className="w-56 h-56 rounded-xl border shadow-sm" />
                )}
                <div className="text-center space-y-1">
                  <Badge variant="warning" className="animate-pulse">
                    Menunggu Pembayaran Tamu (Scan QRIS)...
                  </Badge>
                  <p className="text-xs text-muted-foreground">
                    Standar QRIS BI · Berlaku untuk GoPay, OVO, Dana, BCA, Mandiri
                  </p>
                </div>
                <Button
                  onClick={handleProcessPayment}
                  className="bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs"
                >
                  <Sparkles className="mr-2 h-4 w-4" />
                  Simulasikan Pelanggan Sukses Bayar QRIS
                </Button>
              </div>
            )}

            {/* KARTU PANEL */}
            {paymentMethod === 'card' && (
              <div className="space-y-3 p-4 rounded-2xl border bg-card">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">
                    Nomor Approval / Referensi EDC (Opsional)
                  </label>
                  <Input
                    placeholder="Contoh: BCA-984729"
                    value={cardReference}
                    onChange={(e) => setCardReference(e.target.value)}
                  />
                </div>
                <p className="text-xs text-muted-foreground italic">
                  * Gesek kartu di mesin EDC fisik Anda, lalu masukkan kode approval di atas sebagai bukti rekonsiliasi.
                </p>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsPaymentModalOpen(false)}>
            Batal
          </Button>
          <Button
            onClick={handleProcessPayment}
            className="font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md"
          >
            Selesaikan & Cetak Struk
          </Button>
        </DialogFooter>
      </Dialog>

      {/* DIALOG PINDAH MEJA */}
      <Dialog
        open={isMoveTableModalOpen}
        onClose={() => setIsMoveTableModalOpen(false)}
        maxWidth="max-w-md"
      >
        <DialogHeader>
          <DialogTitle>Pindah Meja Pesanan</DialogTitle>
          <DialogDescription>
            Pindahkan pesanan aktif meja {selectedTable?.name} ke meja kosong lain.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 my-2">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">
            Pilih Meja Tujuan (Kosong)
          </label>
          <div className="grid grid-cols-3 gap-2">
            {tables
              .filter((t) => t.status === 'available')
              .map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTargetMoveTableId(t.id)}
                  className={`p-3 rounded-xl border text-center font-bold text-xs transition-all ${
                    targetMoveTableId === t.id
                      ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                      : 'hover:bg-muted bg-card'
                  }`}
                >
                  {t.name}
                </button>
              ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsMoveTableModalOpen(false)}>
            Batal
          </Button>
          <Button
            onClick={handleExecuteMoveTable}
            disabled={!targetMoveTableId}
            className="font-bold"
          >
            Pindahkan Sekarang
          </Button>
        </DialogFooter>
      </Dialog>

      {/* MODAL SPLIT BILL */}
      <SplitBillModal
        open={isSplitModalOpen}
        onClose={() => setIsSplitModalOpen(false)}
        order={activeOrder}
      />

      {/* MODAL MERGE TABLES */}
      <MergeTablesModal
        open={isMergeModalOpen}
        onClose={() => setIsMergeModalOpen(false)}
        currentTableId={activeTableId}
      />
    </div>
  );
}
