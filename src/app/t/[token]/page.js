'use client';

/**
 * @file src/app/t/[token]/page.js
 * Halaman Publik Self-Ordering berbasis QR Meja untuk Pelanggan (Mobile-First).
 * Pelanggan dapat memindai QR di meja tanpa perlu registrasi atau login.
 * Menampilkan katalog menu real-time, kustomisasi modifier, keranjang mandiri,
 * serta opsi pembayaran langsung via QRIS atau bayar di kasir.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { usePosStore, notifyCrossTabSync } from '@/lib/store/usePosStore';
import { formatRupiah } from '@/lib/formatters';
import { generateQrisPayload, generateQrCodeDataUrl } from '@/lib/qris/mockQris';
import { useToast } from '@/components/ui/Toaster';
import {
  UtensilsCrossed,
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  QrCode,
  Coffee,
  ChefHat,
  Receipt,
  X,
  CreditCard,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

/**
 * @param {{ params: { token: string } }} props
 */
export default function QrSelfOrderPage({ params }) {
  const routeParams = useParams();

  // Support params unwrapping safely across Next.js 14 and 15:
  // In Next.js 15, params can be a Promise (thenable).
  // In Next.js 14, params is a plain object. Calling React.use on a plain object throws:
  // "Error: An unsupported type was passed to use(): [object Object]"
  let resolvedParams = params;
  if (params && typeof params.then === 'function' && typeof React.use === 'function') {
    resolvedParams = React.use(params);
  }
  const token = routeParams?.token || resolvedParams?.token;

  const {
    outlet,
    tables,
    areas,
    categories,
    products,
    modifierGroups,
    modifierOptions,
    orders,
    createOrder,
    addItemsToExistingOrder,
    sendOrderToKitchen,
    payBill,
    bills,
    addNotification,
  } = usePosStore();

  const { addToast } = useToast();

  const [mounted, setMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [activeModalProduct, setActiveModalProduct] = useState(null);
  const [selectedModifiers, setSelectedModifiers] = useState({});
  const [itemNote, setItemNote] = useState('');
  const [itemQty, setItemQty] = useState(1);
  const [modifierError, setModifierError] = useState('');

  // Payment state
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cashier'); // 'cashier' | 'qris'
  const [qrisQrUrl, setQrisQrUrl] = useState('');
  const [qrisTimer, setQrisTimer] = useState(300); // 5 menit
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(null);
  const [showActiveOrderDetails, setShowActiveOrderDetails] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Temukan meja berdasarkan qr_token
  const currentTable = useMemo(() => {
    if (!mounted || !token) return null;
    return tables.find((t) => t.qr_token === token);
  }, [mounted, token, tables]);

  // Jika meja tidak ditemukan di state lokal (misal perangkat baru/smartphone), coba ambil dari server
  useEffect(() => {
    if (mounted && token && !currentTable) {
      fetch('/api/orders')
        .then((res) => res.json())
        .then((data) => {
          if (data.tables && Array.isArray(data.tables) && data.tables.length > 0) {
            usePosStore.setState({ tables: data.tables });
          }
        })
        .catch(() => {});
    }
  }, [mounted, token, currentTable]);

  const currentArea = useMemo(() => {
    if (!currentTable) return null;
    return areas.find((a) => a.id === currentTable.area_id);
  }, [currentTable, areas]);

  // Cek apakah ada pesanan aktif di meja ini (dine-in / qr)
  const activeOrder = useMemo(() => {
    if (!currentTable) return null;
    return orders.find(
      (o) =>
        o.table_id === currentTable.id &&
        o.status !== 'completed' &&
        o.status !== 'cancelled'
    );
  }, [currentTable, orders]);

  // Filter produk berdasarkan kategori dan pencarian
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchCat =
        selectedCategory === 'all' || p.category_id === selectedCategory;
      const matchSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.description &&
          p.description.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchCat && matchSearch;
    });
  }, [products, selectedCategory, searchQuery]);

  // Kalkulasi total keranjang
  const cartTotals = useMemo(() => {
    const subtotal = cart.reduce((sum, item) => {
      const modSum = item.modifiers.reduce(
        (mAcc, m) => mAcc + (Number(m.priceDelta) || 0),
        0
      );
      return sum + (item.basePrice + modSum) * item.qty;
    }, 0);

    const taxRate = Number(outlet.tax_rate) || 0.1;
    const serviceRate = Number(outlet.service_charge_rate) || 0.05;

    const service = Math.round(subtotal * serviceRate);
    const tax = Math.round((subtotal + service) * taxRate);
    const total = subtotal + service + tax;

    return { subtotal, service, tax, total };
  }, [cart, outlet]);

  // Buka dialog kustomisasi modifier untuk produk
  const handleOpenModifierModal = (product) => {
    if (!product.is_available) return;

    setActiveModalProduct(product);
    setItemQty(1);
    setItemNote('');
    setModifierError('');

    // Pre-select default modifiers
    const initialMods = {};
    const prodModGroupIds = product.modifier_group_ids || [];

    prodModGroupIds.forEach((groupId) => {
      const group = modifierGroups.find((g) => g.id === groupId);
      if (!group) return;

      const options = modifierOptions.filter((o) => o.group_id === groupId);
      const defaultOpt = options.find((o) => o.is_default);

      if (group.max_select === 1) {
        if (defaultOpt) {
          initialMods[groupId] = [defaultOpt.id];
        } else if (group.is_required && options.length > 0) {
          initialMods[groupId] = [options[0].id];
        } else {
          initialMods[groupId] = [];
        }
      } else {
        initialMods[groupId] = defaultOpt ? [defaultOpt.id] : [];
      }
    });

    setSelectedModifiers(initialMods);
  };

  // Toggle pilihan modifier
  const handleToggleModifierOption = (group, option) => {
    const groupId = group.id;
    const current = selectedModifiers[groupId] || [];

    if (group.max_select === 1) {
      setSelectedModifiers((prev) => ({
        ...prev,
        [groupId]: [option.id],
      }));
    } else {
      if (current.includes(option.id)) {
        setSelectedModifiers((prev) => ({
          ...prev,
          [groupId]: current.filter((id) => id !== option.id),
        }));
      } else {
        if (current.length < group.max_select) {
          setSelectedModifiers((prev) => ({
            ...prev,
            [groupId]: [...current, option.id],
          }));
        } else {
          addToast(`Maksimal pilihan untuk ${group.name} adalah ${group.max_select}`, 'info');
        }
      }
    }
  };

  // Validasi dan masukkan ke keranjang
  const handleAddToCart = () => {
    if (!activeModalProduct) return;

    // Periksa aturan is_required dan min_select tiap grup
    const prodModGroupIds = activeModalProduct.modifier_group_ids || [];
    for (const groupId of prodModGroupIds) {
      const group = modifierGroups.find((g) => g.id === groupId);
      if (!group) continue;

      const selected = selectedModifiers[groupId] || [];
      if (group.is_required && selected.length < (group.min_select || 1)) {
        setModifierError(`Pilihan "${group.name}" wajib dipilih minimal ${group.min_select || 1} opsi.`);
        return;
      }
    }

    // Bangun daftar opsi modifier terpilih
    const chosenModifiers = [];
    Object.entries(selectedModifiers).forEach(([, optIds]) => {
      optIds.forEach((id) => {
        const opt = modifierOptions.find((o) => o.id === id);
        if (opt) {
          chosenModifiers.push({
            id: opt.id,
            optionId: opt.id,
            group_id: opt.group_id,
            name: opt.name,
            name_snapshot: opt.name,
            nameSnapshot: opt.name,
            price_delta: Number(opt.price_delta) || 0,
            priceDelta: Number(opt.price_delta) || 0,
          });
        }
      });
    });

    const cartItem = {
      cartItemId: crypto.randomUUID(),
      productId: activeModalProduct.id,
      name: activeModalProduct.name,
      basePrice: Number(activeModalProduct.price) || 0,
      qty: itemQty,
      notes: itemNote,
      modifiers: chosenModifiers,
      imageUrl: activeModalProduct.image_url,
    };

    setCart((prev) => [...prev, cartItem]);
    setActiveModalProduct(null);
    addToast(`${activeModalProduct.name} dimasukkan ke keranjang`, 'success');
  };

  // Ubah kuantitas item keranjang
  const handleUpdateCartQty = (cartItemId, delta) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.cartItemId === cartItemId) {
            const newQty = item.qty + delta;
            return newQty > 0 ? { ...item, qty: newQty } : null;
          }
          return item;
        })
        .filter(Boolean)
    );
  };

  // Hapus item keranjang
  const handleRemoveCartItem = (cartItemId) => {
    setCart((prev) => prev.filter((item) => item.cartItemId !== cartItemId));
  };

  // Buka modal pembayaran / checkout
  const handleInitiateCheckout = async (method) => {
    if (cart.length === 0) return;
    setPaymentMethod(method);

    if (method === 'qris') {
      const dummyOrderNum = `QR-${Date.now().toString().slice(-6)}`;
      const payload = generateQrisPayload(dummyOrderNum, cartTotals.total, outlet.name);
      const qrData = await generateQrCodeDataUrl(payload);
      setQrisQrUrl(qrData);
      setQrisTimer(300);
    }

    setIsPaymentModalOpen(true);
  };

  // Hitung mundur timer QRIS
  useEffect(() => {
    if (!isPaymentModalOpen || paymentMethod !== 'qris') return;

    const interval = setInterval(() => {
      setQrisTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isPaymentModalOpen, paymentMethod]);

  // Eksekusi pesanan final (Kirim ke Kasir atau Selesaikan Bayar QRIS)
  const handleFinalizeOrder = async (isPaidViaQris = false) => {
    if (!currentTable || cart.length === 0 || isSubmitting) return;

    setIsSubmitting(true);

    try {
      // Siapkan payload items
      const orderItemsPayload = cart.map((c) => ({
        productId: c.productId,
        name: c.name,
        qty: c.qty,
        notes: c.notes,
        modifiers: c.modifiers,
      }));

      let targetOrder = null;

      // Skenario A: Jika sudah ada pesanan aktif di meja ini -> Tambahkan item (TAMBAHAN)
      if (activeOrder && !isPaidViaQris) {
        addItemsToExistingOrder(activeOrder.id, orderItemsPayload);
        targetOrder = activeOrder;

        if (!outlet.qr_approval_required) {
          sendOrderToKitchen(activeOrder.id);
        } else {
          addNotification(
            'qr_order',
            'Pesanan QR Tambahan',
            `Meja ${currentTable.name} menambahkan ${cart.length} item ke pesanan #${activeOrder.order_number}`,
            '/orders'
          );
        }
      } else {
        // Skenario B: Buat pesanan baru tipe 'qr'
        targetOrder = createOrder({
          type: 'qr',
          source: 'qr',
          tableId: currentTable.id,
          customerName: `Tamu ${currentTable.name}`,
          items: orderItemsPayload,
        });

        if (isPaidViaQris) {
          // Bayar langsung via QRIS
          const latestBills = usePosStore.getState().bills;
          const orderBill = latestBills.find((b) => b.order_id === targetOrder.id);
          if (orderBill) {
            payBill(orderBill.id, {
              method: 'qris',
              tenderedAmount: cartTotals.total,
              reference: `QRIS-${Date.now().toString().slice(-8)}`,
            });
          }
          // Langsung teruskan ke dapur karena sudah lunas
          sendOrderToKitchen(targetOrder.id);
        } else {
          // Bayar di kasir nanti
          if (!outlet.qr_approval_required) {
            sendOrderToKitchen(targetOrder.id);
          } else {
            addNotification(
              'qr_order',
              'Pesanan QR Baru',
              `Pesanan baru dari Meja ${currentTable.name} senilai ${formatRupiah(cartTotals.total)} menunggu persetujuan kasir.`,
              '/orders'
            );
          }
        }
      }

      // Ambil data order & bill termutakhir dari store
      const latestOrder = usePosStore.getState().orders.find((o) => o.id === targetOrder.id) || targetOrder;
      const latestBill = usePosStore.getState().bills.find((b) => b.order_id === targetOrder.id);

      // Sinkronisasikan ke server API agar semua tab / layar kasir / layar KDS langsung menerima
      try {
        await fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'create_order',
            order: latestOrder,
            bill: latestBill,
            tableId: currentTable.id,
          }),
        });
      } catch (e) {
        console.warn('Gagal sync pesanan ke server API:', e);
      }

      // Beritahu tab lain di browser secara instan
      notifyCrossTabSync();

      setOrderSuccess({
        orderNumber: latestOrder.order_number || `ORD-${Date.now().toString().slice(-6)}`,
        tableName: currentTable.name,
        itemCount: cart.reduce((sum, item) => sum + item.qty, 0),
        total: cartTotals.total,
        isPaid: isPaidViaQris,
      });

      setCart([]);
      setIsCartOpen(false);
      setIsPaymentModalOpen(false);
      addToast('Pesanan Anda berhasil dikirim!', 'success');
    } catch (err) {
      console.error('Gagal mengirim pesanan QR:', err);
      addToast(err.message || 'Terjadi kesalahan saat memproses pesanan', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground font-medium">Memuat menu meja...</p>
        </div>
      </div>
    );
  }

  // Tampilan jika QR Token tidak ditemukan / salah
  if (!currentTable) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-6">
        <div className="max-w-md w-full bg-card border rounded-3xl p-8 shadow-xl text-center space-y-4">
          <div className="h-20 w-20 mx-auto rounded-3xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
            <AlertTriangle className="h-10 w-10" />
          </div>
          <h2 className="text-2xl font-black tracking-tight">Meja Tidak Ditemukan</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Kode QR pada URL ini tidak terdaftar atau sudah kedaluwarsa. Pastikan Anda
            memindai kode QR fisik yang menempel pada meja restoran Anda.
          </p>
          <div className="pt-4 border-t">
            <p className="text-xs text-muted-foreground">
              Butuh bantuan? Silakan panggil pelayan kami untuk melayani pesanan Anda.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-28 text-foreground selection:bg-primary/20">
      {/* HEADER RESTORAN & INFORMASI MEJA */}
      <header className="sticky top-0 z-30 bg-card/95 backdrop-blur-md border-b px-4 py-3 shadow-sm">
        <div className="max-w-md mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="h-10 w-10 shrink-0 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-black">
              <UtensilsCrossed className="h-5 w-5" />
            </div>
            <div className="truncate">
              <h1 className="text-sm font-black tracking-tight truncate">{outlet.name}</h1>
              <p className="text-xs text-muted-foreground truncate">
                {currentTable.name} • {currentArea?.name || 'Area Tamu'}
              </p>
            </div>
          </div>

          <div className="shrink-0 flex items-center gap-1.5">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Aktif
            </span>
          </div>
        </div>
      </header>

      {/* BANNER JIKA ADA PESANAN AKTIF BERJALAN DI MEJA INI */}
      {activeOrder && (
        <div className="max-w-md mx-auto px-4 pt-3">
          <div className="bg-gradient-to-r from-amber-500/15 to-orange-500/15 border border-amber-500/30 rounded-2xl p-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="h-8 w-8 shrink-0 rounded-xl bg-amber-500/20 text-amber-600 flex items-center justify-center">
                <Receipt className="h-4 w-4" />
              </div>
              <div className="truncate">
                <p className="text-xs font-bold text-amber-900 dark:text-amber-200 truncate">
                  Pesanan Aktif: #{activeOrder.order_number}
                </p>
                <p className="text-[11px] text-amber-700/80 dark:text-amber-300/80">
                  Total saat ini: {formatRupiah(activeOrder.total)} ({activeOrder.items.length} item)
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowActiveOrderDetails(true)}
              className="shrink-0 text-xs font-bold text-amber-700 dark:text-amber-300 underline hover:opacity-80"
            >
              Lihat Status
            </button>
          </div>
        </div>
      )}

      {/* HERO & PENCARIAN */}
      <div className="max-w-md mx-auto px-4 pt-4 space-y-3">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari makanan atau minuman..."
            className="w-full h-11 pl-10 pr-10 rounded-2xl border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary shadow-sm"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* KATEGORI HORIZONTAL PILLS */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all shadow-sm ${selectedCategory === 'all'
                ? 'bg-primary text-primary-foreground shadow-primary/20'
                : 'bg-card border text-muted-foreground hover:text-foreground'
              }`}
          >
            Semua Menu
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all shadow-sm ${selectedCategory === cat.id
                  ? 'bg-primary text-primary-foreground shadow-primary/20'
                  : 'bg-card border text-muted-foreground hover:text-foreground'
                }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* DAFTAR MENU KATALOG */}
      <main className="max-w-md mx-auto px-4 pt-4 space-y-3">
        {filteredProducts.length === 0 ? (
          <div className="text-center py-16 bg-card border rounded-3xl p-6">
            <Coffee className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
            <h3 className="font-bold text-base">Tidak ada menu ditemukan</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Coba gunakan kata kunci pencarian lain atau pilih kategori lain.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {filteredProducts.map((product) => {
              const hasModifiers =
                product.modifier_group_ids && product.modifier_group_ids.length > 0;
              const isAvailable = product.is_available;

              return (
                <div
                  key={product.id}
                  className={`bg-card border rounded-2xl p-3.5 shadow-sm flex items-center justify-between gap-3 transition-all ${!isAvailable ? 'opacity-50 grayscale' : 'hover:border-primary/40'
                    }`}
                >
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-sm tracking-tight truncate">{product.name}</h3>
                      {product.is_favorite && (
                        <span className="shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-600">
                          Favorit
                        </span>
                      )}
                    </div>
                    {product.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                        {product.description}
                      </p>
                    )}
                    <div className="pt-1 flex items-center gap-2">
                      <span className="font-black text-sm text-primary">
                        {formatRupiah(product.price)}
                      </span>
                      {hasModifiers && (
                        <span className="text-[10px] text-muted-foreground">
                          • Opsi Tambahan
                        </span>
                      )}
                    </div>
                  </div>

                  {/* TOMBOL AKSI */}
                  <div className="shrink-0">
                    {!isAvailable ? (
                      <span className="text-xs font-bold text-destructive px-2 py-1 bg-destructive/10 rounded-xl">
                        Habis
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleOpenModifierModal(product)}
                        className="h-9 px-3 rounded-xl bg-primary text-primary-foreground text-xs font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Tambah
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* FLOATING BOTTOM CART BAR */}
      {cart.length > 0 && (
        <div className="fixed bottom-4 inset-x-0 z-40 px-4 pointer-events-none">
          <div className="max-w-md mx-auto pointer-events-auto">
            <button
              type="button"
              onClick={() => setIsCartOpen(true)}
              className="w-full bg-primary text-primary-foreground rounded-2xl p-3.5 shadow-2xl flex items-center justify-between gap-3 active:scale-[0.99] transition-transform animate-in slide-in-from-bottom-3"
            >
              <div className="flex items-center gap-3">
                <div className="relative h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center">
                  <ShoppingCart className="h-5 w-5" />
                  <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-[10px] font-black h-5 w-5 rounded-full flex items-center justify-center border-2 border-primary">
                    {cart.reduce((sum, item) => sum + item.qty, 0)}
                  </span>
                </div>
                <div className="text-left">
                  <p className="text-xs font-bold text-white/90">Keranjang Pesanan</p>
                  <p className="text-sm font-black">{formatRupiah(cartTotals.total)}</p>
                </div>
              </div>

              <div className="flex items-center gap-1 text-xs font-bold bg-white/20 px-3 py-1.5 rounded-xl">
                <span>Lihat Pesanan</span>
                <ChevronRight className="h-4 w-4" />
              </div>
            </button>
          </div>
        </div>
      )}

      {/* MODAL KUSTOMISASI MODIFIER PRODUK */}
      {activeModalProduct && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
          <div className="w-full max-w-md bg-card rounded-t-3xl sm:rounded-3xl border shadow-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom-5">
            {/* Header Modal */}
            <div className="p-4 border-b flex items-center justify-between shrink-0">
              <div>
                <h3 className="font-black text-base">{activeModalProduct.name}</h3>
                <p className="text-xs text-primary font-bold">
                  Harga dasar: {formatRupiah(activeModalProduct.price)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveModalProduct(null)}
                className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Isi Pilihan Modifier */}
            <div className="p-4 overflow-y-auto space-y-4 flex-1">
              {modifierError && (
                <div className="p-2.5 rounded-xl bg-destructive/10 text-destructive text-xs font-semibold flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  {modifierError}
                </div>
              )}

              {(activeModalProduct.modifier_group_ids || []).map((groupId) => {
                const group = modifierGroups.find((g) => g.id === groupId);
                if (!group) return null;
                const options = modifierOptions.filter((o) => o.group_id === groupId);
                const selected = selectedModifiers[groupId] || [];

                return (
                  <div key={group.id} className="space-y-2 border-b pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs">{group.name}</span>
                        {group.is_required ? (
                          <span className="text-[10px] font-bold text-destructive bg-destructive/10 px-1.5 py-0.5 rounded">
                            Wajib
                          </span>
                        ) : (
                          <span className="text-[10px] text-muted-foreground">Opsional</span>
                        )}
                      </div>
                      <span className="text-[10px] text-muted-foreground">
                        {group.max_select === 1
                          ? 'Pilih 1'
                          : `Pilih maks ${group.max_select}`}
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      {options.map((option) => {
                        const isChecked = selected.includes(option.id);
                        return (
                          <button
                            key={option.id}
                            type="button"
                            onClick={() => handleToggleModifierOption(group, option)}
                            className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs transition-all ${isChecked
                                ? 'bg-primary/10 border border-primary text-primary font-bold'
                                : 'bg-muted/40 border border-transparent hover:bg-muted'
                              }`}
                          >
                            <span>{option.name}</span>
                            <span className="font-semibold">
                              {option.price_delta > 0
                                ? `+${formatRupiah(option.price_delta)}`
                                : 'Gratis'}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {/* Catatan Khusus */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold">Catatan Khusus (Opsional)</label>
                <textarea
                  value={itemNote}
                  onChange={(e) => setItemNote(e.target.value)}
                  placeholder="Contoh: jangan terlalu manis, pisahkan saus sambal..."
                  rows={2}
                  className="w-full p-2.5 rounded-xl border bg-card text-xs focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>

              {/* Kuantitas Stepper */}
              <div className="flex items-center justify-between pt-2">
                <span className="text-xs font-bold">Jumlah Porsi</span>
                <div className="flex items-center gap-3 bg-muted/60 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setItemQty((prev) => Math.max(1, prev - 1))}
                    className="h-8 w-8 rounded-lg bg-card shadow-sm flex items-center justify-center hover:bg-muted"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="font-black text-sm w-6 text-center">{itemQty}</span>
                  <button
                    type="button"
                    onClick={() => setItemQty((prev) => prev + 1)}
                    className="h-8 w-8 rounded-lg bg-card shadow-sm flex items-center justify-center hover:bg-muted"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Footer Tambah */}
            <div className="p-4 border-t bg-card shrink-0">
              <button
                type="button"
                onClick={handleAddToCart}
                className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-black text-sm flex items-center justify-center gap-2 shadow-lg active:scale-98"
              >
                <span>Masukkan ke Pesanan</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DRAWER / MODAL KERANJANG PESANAN */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
          <div className="w-full max-w-md bg-card rounded-t-3xl sm:rounded-3xl border shadow-2xl max-h-[92vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom-5">
            {/* Header Keranjang */}
            <div className="p-4 border-b flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-primary" />
                <h3 className="font-black text-base">Keranjang Meja ({currentTable.name})</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCartOpen(false)}
                className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* List Item Keranjang */}
            <div className="p-4 overflow-y-auto space-y-3 flex-1 divide-y">
              {cart.map((item) => {
                const itemModTotal = item.modifiers.reduce(
                  (acc, m) => acc + (Number(m.priceDelta) || 0),
                  0
                );
                const itemUnitPrice = item.basePrice + itemModTotal;

                return (
                  <div key={item.cartItemId} className="pt-3 first:pt-0 flex items-start justify-between gap-3">
                    <div className="space-y-1 flex-1">
                      <h4 className="font-bold text-xs">{item.name}</h4>
                      <p className="text-xs font-semibold text-primary">
                        {formatRupiah(itemUnitPrice)} x {item.qty} = {formatRupiah(itemUnitPrice * item.qty)}
                      </p>
                      {item.modifiers.length > 0 && (
                        <p className="text-[11px] text-muted-foreground">
                          {item.modifiers.map((m) => m.nameSnapshot).join(', ')}
                        </p>
                      )}
                      {item.notes && (
                        <p className="text-[10px] text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded inline-block">
                          Catatan: {item.notes}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleUpdateCartQty(item.cartItemId, -1)}
                        className="h-7 w-7 rounded-lg bg-muted flex items-center justify-center hover:bg-muted/80"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="font-bold text-xs w-5 text-center">{item.qty}</span>
                      <button
                        type="button"
                        onClick={() => handleUpdateCartQty(item.cartItemId, 1)}
                        className="h-7 w-7 rounded-lg bg-muted flex items-center justify-center hover:bg-muted/80"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveCartItem(item.cartItemId)}
                        className="h-7 w-7 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center hover:bg-destructive/20 ml-1"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Rincian Harga & Tombol Checkout */}
            <div className="p-4 border-t bg-muted/20 shrink-0 space-y-3">
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span>{formatRupiah(cartTotals.subtotal)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Service Charge ({outlet.service_charge_rate * 100}%)</span>
                  <span>{formatRupiah(cartTotals.service)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Pajak Restoran PB1 ({outlet.tax_rate * 100}%)</span>
                  <span>{formatRupiah(cartTotals.tax)}</span>
                </div>
                <div className="flex justify-between font-black text-sm pt-2 border-t text-foreground">
                  <span>Total Tagihan</span>
                  <span className="text-primary">{formatRupiah(cartTotals.total)}</span>
                </div>
              </div>

              {/* Opsi Checkout */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleInitiateCheckout('cashier')}
                  className="h-12 px-3 rounded-xl border-2 border-primary bg-primary/10 text-primary font-bold text-xs flex flex-col items-center justify-center active:scale-95 transition-all"
                >
                  <span>Pesan Sekarang</span>
                  <span className="text-[10px] font-normal text-muted-foreground">Bayar di Kasir</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleInitiateCheckout('qris')}
                  className="h-12 px-3 rounded-xl bg-primary text-primary-foreground font-bold text-xs flex flex-col items-center justify-center shadow-lg active:scale-95 transition-all"
                >
                  <span className="flex items-center gap-1">
                    <QrCode className="h-3.5 w-3.5" />
                    Bayar QRIS
                  </span>
                  <span className="text-[10px] font-normal opacity-90">Langsung Lunas</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PEMBAYARAN & KONFIRMASI */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-sm bg-card rounded-3xl border shadow-2xl p-5 space-y-4 text-center animate-in zoom-in-95">
            {paymentMethod === 'cashier' ? (
              <>
                <div className="h-16 w-16 mx-auto rounded-3xl bg-primary/10 text-primary flex items-center justify-center">
                  <ChefHat className="h-8 w-8" />
                </div>
                <h3 className="font-black text-lg">Konfirmasi Pesanan Meja</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Pesanan Anda akan langsung diteruskan ke dapur dan ditagihkan ke meja Anda ({currentTable.name}). Anda dapat membayar tunai atau kartu di kasir setelah selesai makan.
                </p>
                <div className="p-3 rounded-2xl bg-muted/40 text-left text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Jumlah Item:</span>
                    <span className="font-bold">{cart.reduce((s, i) => s + i.qty, 0)} item</span>
                  </div>
                  <div className="flex justify-between font-black text-sm text-primary pt-1 border-t">
                    <span>Total Pembayaran:</span>
                    <span>{formatRupiah(cartTotals.total)}</span>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsPaymentModalOpen(false)}
                    className="flex-1 h-11 rounded-xl border text-xs font-bold hover:bg-muted"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => handleFinalizeOrder(false)}
                    className="flex-1 h-11 rounded-xl bg-primary text-primary-foreground text-xs font-black shadow-md flex items-center justify-center gap-1.5"
                  >
                    {isSubmitting ? 'Memproses...' : 'Kirim Pesanan'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-1">
                  <h3 className="font-black text-base">Pembayaran QRIS Mandiri</h3>
                  <p className="text-[11px] text-muted-foreground">
                    Scan menggunakan GoPay, OVO, Dana, BCA, Livin, atau m-Banking apa saja
                  </p>
                </div>

                <div className="p-3 bg-white rounded-2xl border shadow-inner inline-block">
                  {qrisQrUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={qrisQrUrl} alt="QRIS Code" className="w-56 h-56 mx-auto object-contain" />
                  ) : (
                    <div className="w-56 h-56 flex items-center justify-center text-xs text-muted-foreground">
                      Membuat QR...
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-center gap-1 text-xs font-bold text-amber-600">
                    <Clock className="h-3.5 w-3.5" />
                    <span>
                      Sisa waktu: {Math.floor(qrisTimer / 60)}:{(qrisTimer % 60).toString().padStart(2, '0')}
                    </span>
                  </div>
                  <p className="font-black text-base text-primary">
                    {formatRupiah(cartTotals.total)}
                  </p>
                </div>

                <div className="space-y-2 pt-2">
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => handleFinalizeOrder(true)}
                    className="w-full h-11 rounded-xl bg-emerald-600 text-white font-black text-xs shadow-md flex items-center justify-center gap-1.5 hover:bg-emerald-700 active:scale-98 transition-all"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Simulasi Pembayaran QRIS Sukses
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsPaymentModalOpen(false)}
                    className="w-full h-9 rounded-xl border text-xs text-muted-foreground hover:text-foreground"
                  >
                    Tutup / Ubah Metode
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* MODAL SUKSES PESANAN */}
      {orderSuccess && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-sm bg-card rounded-3xl border shadow-2xl p-6 text-center space-y-4 animate-in zoom-in-95">
            <div className="h-16 w-16 mx-auto rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="h-10 w-10" />
            </div>

            <div className="space-y-1">
              <h3 className="font-black text-xl">Pesanan Berhasil Dikirim!</h3>
              <p className="text-xs text-muted-foreground">
                Pesanan Anda sedang dipersiapkan oleh tim dapur kami.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-muted/40 text-left text-xs space-y-2 border">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Nomor Pesanan:</span>
                <span className="font-black">#{orderSuccess.orderNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Nomor Meja:</span>
                <span className="font-bold">{orderSuccess.tableName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status Pembayaran:</span>
                <span className={`font-bold ${orderSuccess.isPaid ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {orderSuccess.isPaid ? 'Lunas (QRIS)' : 'Belum Dibayar (Kasir)'}
                </span>
              </div>
              <div className="flex justify-between font-black pt-1 border-t text-sm">
                <span>Total:</span>
                <span className="text-primary">{formatRupiah(orderSuccess.total)}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setOrderSuccess(null);
                setShowActiveOrderDetails(true);
              }}
              className="w-full h-11 rounded-xl bg-primary text-primary-foreground font-black text-xs shadow-md"
            >
              Lihat Status Meja
            </button>
          </div>
        </div>
      )}

      {/* MODAL STATUS PESANAN MEJA BERJALAN */}
      {showActiveOrderDetails && activeOrder && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
          <div className="w-full max-w-md bg-card rounded-t-3xl sm:rounded-3xl border shadow-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom-5">
            <div className="p-4 border-b flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Receipt className="h-5 w-5 text-primary" />
                <div>
                  <h3 className="font-black text-sm">Status Pesanan #{activeOrder.order_number}</h3>
                  <p className="text-[11px] text-muted-foreground">{currentTable.name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowActiveOrderDetails(false)}
                className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-3 flex-1 divide-y">
              {activeOrder.items.map((item, idx) => {
                const statusLabels = {
                  new: { label: 'Baru', color: 'bg-blue-500/10 text-blue-600' },
                  preparing: { label: 'Sedang Dimasak', color: 'bg-amber-500/10 text-amber-600' },
                  ready: { label: 'Siap Disajikan', color: 'bg-emerald-500/10 text-emerald-600' },
                  served: { label: 'Telah Disajikan', color: 'bg-slate-500/10 text-slate-600' },
                  void: { label: 'Batal', color: 'bg-destructive/10 text-destructive' },
                };
                const st = statusLabels[item.status] || statusLabels.new;

                return (
                  <div key={item.id || idx} className="pt-2.5 first:pt-0 flex items-start justify-between gap-2">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs">{item.qty}x</span>
                        <span className="font-bold text-xs">{item.name_snapshot}</span>
                        {item.is_additional && (
                          <span className="text-[9px] font-bold bg-amber-500/15 text-amber-700 px-1 rounded">
                            TAMBAHAN
                          </span>
                        )}
                      </div>
                      {item.modifiers && item.modifiers.length > 0 && (
                        <p className="text-[10px] text-muted-foreground">
                          {item.modifiers.map((m) => m.nameSnapshot || m.name).join(', ')}
                        </p>
                      )}
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${st.color}`}>
                      {st.label}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="p-4 border-t bg-muted/20 shrink-0 space-y-2">
              <div className="flex justify-between font-black text-sm">
                <span>Total Pesanan Meja:</span>
                <span className="text-primary">{formatRupiah(activeOrder.total)}</span>
              </div>
              <button
                type="button"
                onClick={() => setShowActiveOrderDetails(false)}
                className="w-full h-11 rounded-xl bg-primary text-primary-foreground font-black text-xs shadow-md"
              >
                Kembali ke Menu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
