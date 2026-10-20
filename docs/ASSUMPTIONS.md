# Dokumen Asumsi & Keputusan Desain (docs/ASSUMPTIONS.md)

Dokumen ini mencatat keputusan arsitektural dan asumsi bisnis/teknis yang diambil secara mandiri untuk memastikan POS F&B berjalan lengkap, stabil, dan siap produksi.

---

### 1. Multi-Outlet & Lingkup Outlet
- **Keputusan:** Data demo dan sistem default menyertakan 1 outlet utama ("Kopi Nusantara & Resto - Cabang Utama", ID UUID tetap: `00000000-0000-0000-0000-000000000001`).
- Semua tabel operasional memiliki kolom `outlet_id`. Akses dibatasi menggunakan Row Level Security (RLS) berdasarkan outlet aktif pengguna.
- Tarif PB1 / Pajak Restoran default adalah 10% dan Service Charge default adalah 5%, keduanya dapat diubah di Pengaturan Outlet.

### 2. Autentikasi Karyawan & Sesi Kasir
- **Keputusan:** Karyawan memiliki profil di tabel `profiles/users` dengan `role`: `owner`, `manager`, `cashier`, `waiter`, `kitchen`.
- Login cepat kasir dan otorisasi menggunakan PIN 4–6 digit yang di-hash dengan SHA-256 (di database/server action).
- Sesi idle otomatis terkunci setelah 15 menit tidak ada aktivitas sentuh/klik, meminta verifikasi PIN untuk membuka kembali. Layar publik QR self-order (`/t/[token]`) dikecualikan dari lock screen karyawan.
- Setiap aksi sensitif (void setelah dikirim ke dapur, refund, diskon > 10%, ubah harga) mewajibkan verifikasi PIN level Manajer/Owner dan mencatat `audit_logs`.

### 3. Pemotongan Stok Bahan Baku (Inventory & Recipes)
- **Keputusan:** Pengaturan default outlet adalah memotong stok saat pesanan **dikirim ke dapur** (`sent_to_kitchen`).
- Jika item di-void setelah dikirim, sistem secara otomatis melakukan *reversal* (pengembalian stok) dengan catatan `void_reversal` di `stock_movements`.
- Pengaturan toleransi stok minus aktif secara default dengan tanda peringatan (`warning_negative_stock`), sehingga operasional dapur tidak macet saat pencatatan opname tertunda.
- Bahan krusial (`is_critical = true`) dengan stok <= 0 akan otomatis menandai menu terkait sebagai **Habis** (`is_available = false`).

### 4. Split Bill & Pembulatan
- **Keputusan:** Split bill mendukung 3 metode:
  1. *Per Item* (bisa memecah kuantitas: misal 2 pizza dipecah jadi 1 dan 1).
  2. *Per Orang* (dibagi rata sejumlah N orang).
  3. *Per Nominal* (menentukan jumlah bayar per tagihan).
- Pajak, service charge, dan diskon dialokasikan proporsional terhadap subtotal masing-masing sub-tagihan.
- Selisih pembulatan uang pecahan kecil (maksimum Rp1 karena pembagian koma) dialokasikan otomatis ke sub-tagihan terakhir (*last bill adjustment*).
- Sub-tagihan yang sudah lunas tidak dapat diubah atau dipindahkan lagi.

### 5. Mock Adapters (QRIS & Platform Delivery)
- **Keputusan:** Seluruh integrasi eksternal memiliki adapter interface yang bersih:
  - **QRIS:** Adapter QRIS mock menghasilkan string QRIS standar (EMVCo mockup/QR canvas/SVG), status simulasi otomatis atau tombol trigger manual ("Simulasikan Pembayaran Pelanggan"), dan webhook idempotency key.
  - **Delivery (GoFood, GrabFood, ShopeeFood):** Adapter menyediakan fungsi `terimaPesanan`, `terimaTolak`, `updateStatus`, dan `sinkronMenu`. Terdapat antarmuka admin "Simulasi Pesanan Masuk" yang menembakkan payload webhook terstandar dengan signature verification.

### 6. QR Self-Ordering (`/t/[token]`)
- **Keputusan:** Halaman publik mobile-first tanpa login. Token divalidasi ke tabel `tables.qr_token`.
- Pelanggan dapat memesan makanan secara mandiri, melihat pesanan aktif meja yang sudah berjalan, serta memilih antara bayar di kasir atau langsung bayar via QRIS mandiri.
- Konfigurasi `qr_approval_required` di outlet menentukan apakah pesanan butuh persetujuan kasir terlebih dahulu atau langsung masuk antrean KDS dapur.

### 7. Main Dashboard API v1 & Keamanan
- **Keputusan:** Semua endpoint v1 (`/api/v1/summary`, `/api/v1/sales`, `/api/v1/inventory`, `/api/v1/shifts`) diproteksi dengan header `X-API-Key` yang memvalidasi `process.env.MAIN_DASHBOARD_API_KEY`.
- Format respons terstandarisasi JSON dengan paginasi, ringkasan metrik, dan penanganan error 401/500 yang jelas.

### 8. Mode Offline & PWA
- **Keputusan:** Service worker `public/sw.js` meng-cache aset statis dan rute utama.
- Web App Manifest `public/manifest.json` memungkinkan instalasi PWA pada perangkat Android/iOS/Windows (tablet kasir dan display dapur).

### 9. Printer Struk & Tiket
- **Keputusan:** Mendukung mode cetak browser standar (CSS `@media print`) dengan layout khusus ukuran thermal 58mm dan 80mm untuk struk kasir dan tiket pesanan dapur, dilengkapi tombol preview struk.

### 10. Stack Murni JavaScript
- **Keputusan:** Dilarang menggunakan TypeScript sesuai mandat. Tidak ada file `.ts`/`.tsx`, tidak ada `tsconfig.json`. Semua kode menggunakan ES Modules (`.js`, `.jsx`), JSDoc untuk dokumentasi tipe, dan Zod untuk validasi skema runtime di form, API, dan server action.
