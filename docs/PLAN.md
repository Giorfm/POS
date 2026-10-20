# Rencana Kerja Terstruktur (docs/PLAN.md)

Rencana pengembangan aplikasi POS F&B (Restoran & Kafe) berbasis Next.js App Router (JavaScript Murni), Supabase, Tailwind CSS, dan PWA.

---

### [SELESAI] Fase 0: Setup Fondasi, Skema Supabase, Auth PIN & Layout
- Inisialisasi Next.js (App Router, JS murni, ESLint, Tailwind CSS, jsconfig.json alias `@/*`).
- Konfigurasi Supabase lokal (inits, migrasi SQL lengkap dengan RLS dan tabel yang ditentukan di PRD, seed data demo).
- Struktur layout per peran (Owner, Manager, Cashier, Waiter, Kitchen) dengan proteksi sesi PIN cepat (auto-lock on idle).
- Akun demo & PIN siap pakai:
  - Owner: PIN `112233`
  - Manager: PIN `123456`
  - Cashier: PIN `654321`
  - Waiter: PIN `111111`
  - Kitchen: PIN `222222`
- Verifikasi build (`npm run lint`, `npm run build`): Berhasil 0 error.

### [SELESAI] Fase 1: Manajemen Menu, Kategori & Modifier
- CRUD Kategori dengan stasiun dapur (Bar, Grill, Dessert, Kitchen).
- CRUD Produk (nama, harga, kategori, gambar, ketersediaan, favorit).
- CRUD Grup Modifier (Tingkat Pedas, Topping, Sugar, Ice, Ukuran; aturan min/max, required, default, harga delta).
- Relasi produk & grup modifier, preset favorit.
- Halaman katalog menu di `/menu` dan grup modifier di `/modifiers`.
- Verifikasi build & lint: Berhasil 0 error.

### [SELESAI] Fase 2: Manajemen Meja, Order & Pembayaran
- Visual drag & drop floor plan editor di `/tables` (bentuk meja bulat/kotak, kapasitas, area Lantai 1/Lantai 2/Outdoor).
- Layar POS di `/pos` (tampilan denah meja dengan badge status Kosong/Terisi/Perlu Dibersihkan, timer durasi dan total sementara).
- Alur kasir: pilih meja, cari & filter menu, dialog kustomisasi modifier, catatan per item, keranjang belanja di panel kanan.
- Fitur "Kirim ke Dapur" (order aktif berstatus open/sent, item baru setelah kirim otomatis bertanda TAMBAHAN).
- Tipe order: Dine-in, Takeaway (nomor antrean), QR, Delivery.
- Layar pembayaran:
  - Tunai (hitung nominal cepat & kembalian).
  - QRIS (mock gateway, QR code SVG, timeout, verifikasi bayar, idempotency key).
  - Kartu debit/kredit (input referensi manual).
- Pratinjau struk cetak thermal 58mm / 80mm dan tiket dapur (`@media print`).
- Pindah meja untuk pesanan aktif.
- Verifikasi build & lint: Berhasil 0 error.

### [SELESAI] Fase 3: Kitchen Display System (KDS) Real-time
- Halaman `/kds` fullscreen layar dapur responsif.
- Kolom status tiket: Baru -> Diproses -> Siap -> Disajikan.
- Tiket FIFO berisi nomor meja/tipe order, item, qty, modifier, catatan, label sumber.
- Filter stasiun dapur (Bar, Grill, Dessert, Kitchen).
- Peringatan durasi tiket berwarna (Hijau: < 10 menit, Kuning: 10-15 menit, Merah: > 15 menit).
- Notifikasi audio saat tiket baru masuk (Web Audio API Synthesizer).
- Penanda TAMBAHAN (pesanan susulan) dan BATAL (merah) jika di-void.
- Fallback cetak tiket dapur.
- Notifikasi status Siap ke kasir & pelayan.
- Verifikasi build & lint: Berhasil 0 error.

### [SELESAI] Fase 4: Split & Merge Bill
- Modul Split Bill di layar kasir:
  - Split per item (termasuk split kuantitas: misal 2 porsi dibagi ke sub-tagihan 1 dan 2).
  - Split per orang (bagi rata total ke N orang).
  - Split per nominal.
- Perhitungan proporsional untuk Pajak (PB1), Service Charge, dan Diskon dengan pembulatan rupiah presisi (selisih <= Rp1 dialokasikan ke tagihan terakhir).
- Pembayaran sub-tagihan terpisah dengan metode berbeda (sebagian tunai, sebagian QRIS/kartu).
- Fitur Merge Meja (gabung 2 meja atau lebih ke dalam 1 order gabungan) dan Unmerge sebelum pembayaran dilakukan.
- Verifikasi build & lint: Berhasil 0 error.

### [SELESAI] Fase 5: Resep, Stok Otomatis, Low Stock Alert & Purchasing
- Master Bahan Baku di `/inventory` (satuan dasar, satuan beli, rasio konversi, harga beli, stok minimum, tanda bahan krusial).
- Manajemen Resep di `/recipes` (BOM per menu, variasi ukuran, relasi konsumsi bahan pada modifier).
- Pemotongan stok otomatis saat pesanan dikirim ke dapur / dibayar (sesuai konfigurasi outlet).
- Fitur stock movement log: penerimaan barang (PO), penyesuaian stok, stock opname (hitung fisik vs sistem), waste/spoilage.
- Pemulihan stok (reversal) saat item pesanan di-void.
- Low stock alert (indikator lonceng di header POS & panel dashboard).
- Auto out-of-stock: bahan krusial dengan stok 0 otomatis menonaktifkan menu terkait di POS & QR.
- Halaman `/purchasing`: daftar bahan perlu dipesan + generate draft Purchase Order (ekspor CSV/teks kirim WhatsApp).
- Laporan Food Cost (HPP) per produk.
- Verifikasi build & lint: Berhasil 0 error.

### [SELESAI] Fase 6: Manajemen Shift, Hak Akses, Otorisasi Manajer & Audit Log
- Hak akses berbasis peran (RBAC) per halaman dan aksi:
  - Kasir, Pelayan, Manajer, Owner.
- Modal otorisasi PIN Manajer untuk aksi sensitif:
  - Void item setelah dikirim ke dapur.
  - Refund pembayaran.
  - Diskon > batas (misal > 10%).
  - Ubah harga manual.
- Modul Shift Kasir di `/shifts`:
  - Buka shift dengan modal awal (cash in drawer).
  - Catat kas masuk & keluar (petty cash) beserta alasan.
  - Tutup shift: hitung kas fisik aktual, bandingkan dengan kas sistem yang diharapkan (expected vs actual), hitung selisih (variance).
  - Approval manajer untuk selisih kas.
  - Cetak laporan Z-Report shift.
  - Saldo akhir otomatis menjadi modal awal shift berikutnya.
  - Validasi: order baru hanya bisa dibuat jika shift kasir sedang aktif.
- Catatan `audit_logs` tak dapat diubah/dihapus (who, when, what action, before, after, approver).
- Verifikasi build & lint: Berhasil 0 error.

### [SELESAI] Fase 7: QR Self-Ordering Halaman Publik Mobile-First
- Halaman publik `/t/[token]` untuk pelanggan scan di meja tanpa perlu install app atau login.
- Generate QR code per meja dengan token unik di admin/manajemen meja.
- Tampilan menu mobile-first responsif:
  - Ketersediaan menu real-time.
  - Pemilihan modifier dan catatan khusus.
  - Keranjang belanja mandiri.
  - Checkout mandiri: Bayar QRIS langsung (mock/sandbox) atau Bayar di Kasir.
  - Multi-pelanggan pada satu meja berbagi order yang sama.
- Konfigurasi outlet: mode approval pesanan oleh kasir vs langsung masuk dapur.
- Validasi keamanan token & proteksi rate limit sederhana.
- Verifikasi build & lint: Berhasil 0 error.

### [SELESAI] Fase 8: Integrasi Delivery Online & API Dashboard Utama
- Modul Delivery di `/delivery`:
  - Platform adapter (GoFood, GrabFood, ShopeeFood) dengan antarmuka seragam.
  - Mock generator / tombol "Simulasi Pesanan Masuk" untuk menguji pesanan online kapan saja tanpa API key resmi.
  - Webhook receiver dengan validasi signature (`/api/delivery/webhook`).
  - Webhook settlement QRIS (`/api/qris/webhook`).
  - Tabel pemetaan SKU produk (`sku_mappings`). Pesanan dengan SKU belum terdaftar masuk dengan status "Perlu Pemetaan" tanpa memblokir order.
  - Layar terima/tolak pesanan di POS dengan notifikasi.
  - Tiket delivery otomatis masuk ke KDS dengan label platform (GoFood/Grab/Shopee).
  - Pencatatan komisi platform untuk rekonsiliasi keuangan.
- Integrasi Dashboard Utama (v1 Read-Only API):
  - `/api/v1/summary` (ringkasan penjualan harian, pesanan, omset, komisi).
  - `/api/v1/sales` (detail transaksi per outlet, kanal penjualan, metode pembayaran).
  - `/api/v1/inventory` (status stok bahan baku, stok kritis, pergerakan stok).
  - `/api/v1/shifts` (riwayat shift, modal, kas aktual, selisih variance).
  - Autentikasi API Key via header `X-API-Key`.
  - Dokumentasi skema respons di `docs/API.md`.
- Verifikasi build & lint: Berhasil 0 error.

### [SELESAI] Fase 9: Laporan Lengkap, PWA, Dark Mode, Pengujian Unit & Dokumentasi
- Laporan penjualan komprehensif di `/reports`:
  - Penjualan harian, mingguan, bulanan.
  - Breakdown per kanal (Dine-in, Takeaway, QR, Delivery).
  - Produk terlaris & jam ramai (peak hours).
  - Analisis metode pembayaran, void & diskon, food cost HPP.
  - Grafik visual interaktif (Recharts) dan tombol Ekspor CSV.
- PWA manifest (`manifest.json`), service worker (`sw.js`), icon metadata (`icon.svg`).
- Mode terang/gelap (Dark/Light mode).
- Unit Tests dengan Vitest (`.test.js` murni):
  1. Perhitungan alokasi split bill & pembulatan rupiah (100% lulus).
  2. Perhitungan Pajak PB1 & Service Charge (100% lulus).
  3. Pemotongan stok bahan baku berdasarkan resep & modifier (100% lulus).
  4. Perhitungan selisih kas shift (variance) (100% lulus).
- Dokumentasi `README.md` lengkap: cara setup lokal, akun demo, panduan pengujian end-to-end, arsitektur, dan cara mengganti mock ke API nyata.
- Verifikasi akhir: `npm run lint`, `npm run build`, `npm run test` (Semua lulus 100% tanpa error).
