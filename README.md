# Kopi & Resto Nusantara - Sistem POS F&B Lengkap

Aplikasi Point of Sale (POS) dan Operasional Restoran/Kafe (F&B) modern, multi-outlet, dan siap pakai. Dibangun dengan **Next.js (App Router)** menggunakan **JavaScript Murni**, **Tailwind CSS**, **shadcn/ui (varian JSX)**, **Zustand**, dan **Supabase**. Seluruh antarmuka berbahasa Indonesia, mendukung PWA (tablet 10", mobile, dan layar dapur fullscreen), kalkulasi Rupiah presisi, serta simulasi mock terintegrasi untuk QRIS dan pengantaran makanan online (GoFood, GrabFood, ShopeeFood).

---

## 🚀 Fitur Utama

### 1. Manajemen Meja & Denah Visual (`/tables`)
- Editor denah interaktif drag & drop dengan koordinat posisi (`pos_x`, `pos_y`), kapasitas kursi, dan bentuk meja (kotak, persegi panjang, bulat).
- Multi-area/lantai (Lantai 1 - Dining Utama, Lantai 2 - VIP & Rooftop, Area Outdoor - Smoking).
- Status meja real-time dengan warna indikatif:
  - **Kosong** (Hijau)
  - **Terisi** (Oranye + timer durasi bersantap + total tagihan sementara)
  - **Perlu Dibersihkan** (Kuning + tombol 1-ketuk "Selesai Bersih" menjadi Kosong).
- Fitur pindah meja untuk pesanan yang sedang berjalan.
- Pembuat kode QR dan token acak unik per meja untuk pemesanan mandiri pelanggan.

### 2. Layar Kasir & Kasir Cepat (`/pos`)
- Katalog menu dengan pencarian cepat, filter kategori stasiun dapur, gambar produk, dan penanda favorit (maksimal 3 ketukan untuk tambah item).
- Panel keranjang kanan dengan kuantitas, kustomisasi modifier dinamis, dan catatan khusus per item.
- Tombol **"Kirim ke Dapur"** dengan penanda otomatis **`TAMBAHAN`** untuk item yang dipesan susulan.
- Multi-tipe pesanan: **Dine-in**, **Takeaway** (nomor antrean otomatis), **QR Self-Order**, dan **Delivery Online**.
- Modal pembayaran lengkap:
  - **Tunai (Cash):** Tombol pecahan cepat (Rp20rb, Rp50rb, Rp100rb, Uang Pas) dan kalkulasi kembalian otomatis.
  - **QRIS:** Generator QRIS EMVCo standar Bank Indonesia, countdown timer, dan tombol simulasi pembayaran instan.
  - **Kartu Debit/Kredit:** Input nomor referensi EDC manual.
- Pratinjau struk thermal 58mm / 80mm dan tiket pesanan dapur siap cetak (`@media print`).

### 3. Split & Merge Bill
- **Split Per Item:** Membagi item ke beberapa sub-tagihan, termasuk memecah kuantitas (misal 2 porsi pizza dibagi ke sub-tagihan 1 dan 2).
- **Split Bagi Rata (N Orang):** Membagi rata total tagihan secara proporsional.
- Alokasi proporsional Pajak PB1 (10%), Service Charge (5%), dan Diskon dengan pembulatan rupiah presisi (**selisih pembulatan <= Rp1 otomatis diserap oleh tagihan terakhir**).
- Pembayaran sub-tagihan secara terpisah dengan metode berbeda (sebagian tunai, sebagian QRIS/kartu).
- **Merge Meja:** Menggabungkan 2 meja atau lebih ke dalam 1 pesanan bersama dengan opsi unmerge sebelum pembayaran.

### 4. Kitchen Display System - Layar Dapur Fullscreen (`/kds`)
- Tiket pesanan real-time berurutan FIFO (First In, First Out).
- Tombol status besar ramah sentuh: **Baru** ➔ **Diproses** ➔ **Siap** ➔ **Disajikan**.
- Filter stasiun dapur berdasarkan kategori: **Bar**, **Grill**, **Dessert**, atau **Kitchen (Dapur Utama)**.
- Timer durasi tiket dengan warna otomatis:
  - **Hijau:** < 10 menit
  - **Kuning:** 10 - 15 menit
  - **Merah:** > 15 menit
- Efek audio chime lonceng dapur Web Audio API saat pesanan baru masuk dan nada alert saat pesanan siap disajikan.
- Penanda jelas untuk pesanan **`TAMBAHAN`** dan tanda **`BATAL`** merah jika pesanan di-void.

### 5. QR Self-Ordering Pelanggan Publik (`/t/[token]`)
- Halaman publik mobile-first tanpa login di URL `/t/[token]` dengan validasi token meja unik.
- Katalog menu real-time (otomatis menyembunyikan atau menonaktifkan menu yang stok bahan bakunya habis).
- Pemilihan modifier dan catatan khusus porsi makanan/minuman.
- Mode Checkout Mandiri:
  - **Pesan & Bayar di Kasir:** Pesanan langsung masuk ke KDS atau menunggu konfirmasi kasir (sesuai konfigurasi outlet).
  - **Bayar Mandiri via QRIS:** Scan QRIS dan simulasi pembayaran lunas langsung dari smartphone pelanggan.
- Multi-pelanggan pada satu meja berbagi pesanan meja yang sama dan dapat memantau status pesanan mereka secara langsung.

### 6. Resep, Master Bahan Baku & Stok Otomatis (`/inventory` & `/recipes`)
- Master bahan baku dengan satuan dasar, satuan beli, rasio konversi (misal: 1 kg = 1000 gram), harga beli, stok minimum, dan penanda bahan krusial.
- Bill of Materials (BOM) resep per menu dan modifier (misal: Extra shot menambah +18g biji kopi; oat milk menggantikan susu murni).
- Pemotongan stok otomatis saat pesanan dikirim ke dapur atau saat dibayar (konfigurasi per outlet).
- Pemulihan stok (stock reversal) otomatis saat item di-void.
- Log pergerakan stok lengkap: Penjualan, Pembelian, Penyesuaian, Stock Opname (fisik vs teori), dan Waste/Kerusakan.
- **Low Stock Alert:** Peringatan lonceng di POS saat stok <= min_stock. Bahan krusial dengan stok 0 otomatis menandai menu terkait Habis.
- Modul Pembelian (`/purchasing`): Generate draft Purchase Order (PO), ekspor CSV, format salin WhatsApp untuk supplier, dan tombol penerimaan barang yang menambah stok otomatis.
- Laporan kalkulasi HPP (Food Cost) dan persentase gross margin per produk.

### 7. Manajemen Shift & Otorisasi Manajer (`/shifts`)
- Pembukaan shift kasir dengan modal awal (*cash in drawer*).
- Validasi: pesanan kasir baru hanya dapat dibuat jika ada shift aktif.
- Pencatatan kas masuk dan kas keluar (*petty cash*) beserta alasan transaksi.
- Penutupan shift: kasir menghitung fisik kas laci, sistem membandingkan dengan kas sistem yang diharapkan (*expected cash*), dan menghitung selisih (*variance*).
- Otorisasi PIN manajer wajib untuk selisih kas tidak seimbang (*variance != 0*), void setelah pesanan dikirim ke dapur, diskon di atas batas wewenang (> 10%), atau perubahan harga manual.
- Cetak laporan Z-Report penutupan kasir.
- Kas akhir aktual otomatis menjadi modal awal shift kasir berikutnya.

### 8. Integrasi Delivery Online & Simulasi Mock (`/delivery`)
- Dashboard terpusat untuk pesanan GoFood, GrabFood, dan ShopeeFood.
- Status alur: Perlu Konfirmasi ➔ Diterima / Dimasak ➔ Menunggu Driver ➔ Selesai Diambil.
- Tabel pemetaan SKU eksternal (`sku_mappings`). Pesanan dengan SKU yang belum terdaftar tetap diproses dengan status "Perlu Pemetaan" tanpa memblokir operasional.
- Perhitungan komisi platform (20%) dan rekonsiliasi pendapatan bersih restoran.
- **Simulator Pesanan Masuk (Mock Sandbox):** Tombol 1-ketuk untuk mensimulasikan pesanan GoFood/Grab/Shopee masuk kapan saja tanpa memerlukan API key mitra resmi.

### 9. Laporan Penjualan & Grafik Visual (`/reports`)
- Grafik performa interaktif (Recharts): tren omset, distribusi kanal penjualan (Dine-in, Takeaway, QR, Delivery), dan komposisi metode pembayaran (QRIS, Tunai, Kartu).
- Analisis jam ramai restoran (*peak hours*).
- Daftar 5 produk terlaris (*best-seller*).
- Tombol ekspor data penjualan ke format CSV.

### 10. Dashboard API v1 & Webhooks (Headless / ERP Integration)
- Endpoints JSON read-only berkeamanan header `X-API-Key`:
  - `GET /api/v1/summary`: Ringkasan omset harian, metrik, kanal, dan shift.
  - `GET /api/v1/sales`: Riwayat transaksi penjualan dengan filter & pagination.
  - `GET /api/v1/inventory`: Status stok, bahan kritis menipis, dan valuasi aset persediaan.
  - `GET /api/v1/shifts`: Riwayat pembukaan/penutupan shift kasir dan selisih kas.
- Webhook endpoints:
  - `POST /api/delivery/webhook`: Menerima callback pesanan ojek online.
  - `POST /api/qris/webhook`: Menerima callback settlement pembayaran QRIS.
- Dokumentasi lengkap tersedia di [docs/API.md](docs/API.md).

---

## 🛠️ Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Bahasa:** **JavaScript Murni (ES Modules)** — Bebas dari TypeScript (tidak ada file `.ts`/`.tsx`, tidak ada `@types/*`, menggunakan `jsconfig.json`).
- **Styling & UI:** Tailwind CSS, shadcn/ui (varian JSX), Lucide React.
- **State Management:** Zustand dengan persistensi lokal `localStorage`.
- **Form & Validasi:** React Hook Form & Zod runtime validation.
- **Database & Auth:** Supabase (PostgreSQL, Row Level Security, Realtime, Storage).
- **Pengujian:** Vitest (unit test matematika kritis dan logika bisnis).
- **PWA:** Web App Manifest, Service Worker offline caching, mobile-first responsive.

---

## 📦 Akun Karyawan & PIN Demo Cepat

Sistem dilengkapi tombol pemilihan karyawan cepat di halaman login `/login`:

| Nama Karyawan | Peran (Role) | PIN Cepat | Akses Halaman |
| :--- | :--- | :--- | :--- |
| **Budi Santoso** | `owner` | `112233` | Akses Penuh (Semua Modul & Pengaturan Outlet) |
| **Siti Rahma** | `manager` | `123456` | Kasir, Dapur, Stok, Resep, PO, Shift, Laporan, Otorisasi PIN |
| **Rian Pratama** | `cashier` | `654321` | Kasir POS, Denah Meja, Riwayat Pesanan, Buka/Tutup Shift |
| **Dika Putra** | `waiter` | `111111` | Denah Meja, Kasir POS (Pencatatan Pesanan Pelayan) |
| **Chef Joko** | `kitchen` | `222222` | Kitchen Display System (KDS) & Riwayat Pesanan |

> **Auto-Lock:** Sesi karyawan akan terkunci otomatis jika tidak ada aktivitas selama 15 menit. Masukkan kembali PIN untuk melanjutkan.

---

## 💻 Panduan Menjalankan Aplikasi

### 1. Prasyarat
- Node.js versi 18+ atau 20+ (didukung juga di Node 24).
- Supabase CLI (opsional jika ingin menjalankan PostgreSQL Supabase lokal).

### 2. Instalasi Dependensi
```bash
# Masuk ke direktori proyek
cd "D:/Nived/POS F&B"

# Install dependensi (sudah terkonfigurasi dengan Rollup wasm untuk kompatibilitas lintas Node)
npm install
```

### 3. Konfigurasi Environment Variable
Salin file `.env.example` menjadi `.env.local`:
```bash
cp .env.example .env.local
```

Isi file `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
MAIN_DASHBOARD_API_KEY=ag_live_pos_dashboard_secret_key_2026
```

### 4. Setup Supabase Lokal (Opsional untuk Database Cloud/Local)
Jika menggunakan Supabase CLI:
```bash
# Inisialisasi dan start container Supabase
supabase start

# Jalankan migrasi skema lengkap (24 tabel + RLS)
supabase migration up

# Jalankan seed data awal
supabase db reset
```
> *Catatan:* Aplikasi POS ini juga memiliki fallback Zustand state yang telah di-seed dengan outlet, profil, meja, kategori, produk, modifier, bahan, dan resep lengkap. Anda dapat langsung menjalankan `npm run dev` untuk mencoba seluruh aplikasi tanpa perlu menyalakan database eksternal!

### 5. Menjalankan Server Development
```bash
npm run dev
```
Buka browser di:
- **Terminal POS Kasir:** [http://localhost:3000/pos](http://localhost:3000/pos)
- **Halaman Login Karyawan:** [http://localhost:3000/login](http://localhost:3000/login)
- **Denah Meja Visual:** [http://localhost:3000/tables](http://localhost:3000/tables)
- **Kitchen Display System (KDS):** [http://localhost:3000/kds](http://localhost:3000/kds)
- **Delivery Online & Simulator:** [http://localhost:3000/delivery](http://localhost:3000/delivery)
- **Stok Bahan Baku:** [http://localhost:3000/inventory](http://localhost:3000/inventory)
- **Resep & HPP:** [http://localhost:3000/recipes](http://localhost:3000/recipes)
- **Manajemen Shift:** [http://localhost:3000/shifts](http://localhost:3000/shifts)
- **Laporan Penjualan:** [http://localhost:3000/reports](http://localhost:3000/reports)
- **QR Self-Order Meja 01:** [http://localhost:3000/t/token_meja_01_a9f82c](http://localhost:3000/t/token_meja_01_a9f82c)

### 6. Menjalankan Pengujian Unit (Unit Test)
```bash
npm run test
```
Menjalankan pengujian Vitest untuk:
1. Alokasi split bill & pembulatan rupiah presisi.
2. Perhitungan Pajak PB1 & Service Charge.
3. Pemotongan stok resep & modifier beserta pembatalan void.
4. Perhitungan selisih kas shift (*variance*).

### 7. Linting & Build Produksi
```bash
# Jalankan ESLint (0 errors)
npm run lint

# Jalankan Next.js Production Build (24 routes static & API)
npm run build
```

---

## 🔌 Cara Mengganti Mock ke Gateway Produksi

Aplikasi menggunakan pola desain adapter terisolasi:

1. **Gateway QRIS (Midtrans / Xendit / Bank):**
   - File adapter: `src/lib/qris/mockQris.js`
   - Ganti fungsi `generateQrisPayload` dengan panggilan API resmi Midtrans Core API (`/v2/charge` dengan `payment_type: "qris"`) atau Xendit QR Codes API.
   - Sambungkan webhook URL penyedia gateway ke endpoint `POST /api/qris/webhook`.

2. **Integrasi Delivery Online (GoFood, GrabFood, ShopeeFood):**
   - File adapter: `src/lib/delivery/adapters.js`
   - Ganti kelas `GoFoodAdapter`, `GrabFoodAdapter`, dan `ShopeeFoodAdapter` dengan REST API resmi mitra (misal: GrabFood Merchant Integration API atau GoBiz Partner API).
   - Sambungkan callback URL ke `POST /api/delivery/webhook`.

---

## 📂 Struktur Direktori Proyek

```text
├── docs/
│   ├── API.md                  # Dokumentasi teknis Dashboard API v1 & Webhooks
│   ├── ASSUMPTIONS.md          # Keputusan desain arsitektur & asumsi teknis
│   └── PLAN.md                 # Rencana kerja pengembangan bertahap
├── public/
│   ├── icon.svg                # Ikon vektor aplikasi & PWA
│   ├── manifest.json           # Web App Manifest PWA
│   └── sw.js                   # Service Worker offline caching
├── src/
│   ├── app/                    # Next.js App Router (JavaScript Murni)
│   │   ├── api/                # API Routes & Webhook endpoints
│   │   ├── delivery/           # Modul Pesanan Online & Pemetaan SKU
│   │   ├── inventory/          # Modul Stok Bahan Baku & Stock Movements
│   │   ├── kds/                # Modul Kitchen Display System (Fullscreen)
│   │   ├── login/              # Halaman Login PIN Karyawan
│   │   ├── menu/               # Katalog Produk & Kategori
│   │   ├── modifiers/          # Manajemen Grup Modifier & Opsi
│   │   ├── orders/             # Riwayat Pesanan & Otorisasi Void
│   │   ├── pos/                # Layar Kasir, Keranjang, & Pembayaran
│   │   ├── purchasing/         # Purchase Order (PO) & Rekomendasi Beli
│   │   ├── recipes/            # Resep, Bill of Materials, & HPP
│   │   ├── reports/            # Laporan Penjualan & Grafik Visual
│   │   ├── settings/           # Pengaturan Outlet & Pajak
│   │   ├── shifts/             # Manajemen Shift Kasir & Z-Report
│   │   ├── t/[token]/          # Halaman Publik QR Self-Ordering Meja
│   │   └── tables/             # Visual Floor Plan Editor Denah Meja
│   ├── components/             # Komponen UI Reusable
│   │   ├── auth/               # Lock Screen & PIN Keypad
│   │   ├── layout/             # Header, Sidebar, & AppShell
│   │   ├── pos/                # Modal Split Bill, Merge Table, dll.
│   │   ├── receipt/            # Thermal Receipt Modal 58mm/80mm
│   │   └── ui/                 # Button, Input, Card, Modal, Dialog, Toaster
│   ├── lib/                    # Logika Bisnis & Utilitas
│   │   ├── api/                # Verifikasi API Key
│   │   ├── delivery/           # Adapter GoFood, GrabFood, ShopeeFood
│   │   ├── qris/               # Payload QRIS & QR Code generator
│   │   ├── store/              # Zustand Store Terpadu (usePosStore.js)
│   │   ├── supabase/           # Klien Supabase
│   │   ├── audio.js            # Efek Suara Web Audio API
│   │   ├── crypto.js           # SHA-256 PIN Hashing
│   │   ├── formatters.js       # Format Rupiah & Tanggal Indonesia
│   │   └── validators.js       # Runtime Validation Zod
│   └── test/                   # Unit Tests Vitest (.test.js)
├── supabase/
│   ├── migrations/             # Skema DDL SQL Lengkap (24 Tabel & RLS)
│   └── seed.sql                # Data Awal Demo Realistis
├── jsconfig.json               # Path alias @/* -> ./src/*
├── package.json
└── tailwind.config.js
```

---

## 📜 Lisensi & Kepatuhan

Dikembangkan untuk operasional restoran dan kafe F&B Indonesia. Mengikuti standar akuntansi ritel, format mata uang Rupiah (`Rp10.000`), zona waktu `Asia/Jakarta`, serta regulasi Pajak Barang dan Jasa Tertentu (PB1).
