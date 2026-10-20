# PRD — Aplikasi POS Restoran & Kafe (F&B)

Versi 1.0 · 18 Oktober 2026 · Penyusun: G

## 1. Ringkasan

Aplikasi POS berbasis web (PWA) untuk restoran, kafe, dan outlet F&B yang menyatukan operasional kasir, pelayan, dapur, gudang, dan pesanan online dalam satu sistem. Fokus utama: **kecepatan operasional**, **stok bahan baku yang akurat otomatis**, dan **satu pintu untuk semua pesanan** (dine-in, QR, take-away, delivery).

### Tujuan produk

- Mempercepat alur pesanan dari meja ke dapur ke pembayaran.
- Menghilangkan selisih stok bahan baku lewat pemotongan otomatis berbasis resep.
- Mengurangi kebocoran kas lewat hak akses, otorisasi manajer, dan manajemen shift.
- Menggabungkan pesanan GoFood, GrabFood, dan ShopeeFood ke satu layar.
- Terintegrasi dengan dashboard utama (laporan penjualan, stok, dan shift dikirim ke dashboard).

### Metrik keberhasilan

- Waktu dari input pesanan sampai tampil di KDS < 2 detik.
- Selisih stok bahan baku (teori vs fisik) < 3% per bulan.
- Waktu split bill < 30 detik untuk 4 orang.
- 0 void/diskon besar tanpa otorisasi manajer.

## 2. Pengguna & Peran

| Peran | Kebutuhan utama |
| --- | --- |
| Owner | Laporan lintas outlet, pengaturan harga, pengguna, integrasi |
| Manajer | Otorisasi void/diskon, tutup shift, kelola stok & menu |
| Kasir | Pembayaran, split/merge bill, buka/tutup shift |
| Pelayan | Input pesanan di meja, lihat status meja |
| Dapur (koki) | Melihat tiket pesanan di KDS, ubah status |
| Pelanggan | Scan QR, pesan, bayar sendiri |

## 3. Ruang Lingkup

**MVP (Fase 1):** menu & modifier, manajemen meja, order dine-in/take-away, pembayaran (tunai, QRIS), split & merge bill, KDS, resep & stok otomatis, low stock alert, hak akses & shift.

**Fase 2:** QR self-ordering, integrasi delivery online, mode offline penuh, multi-outlet.

**Di luar lingkup (sementara):** payroll, reservasi online, program loyalti, akuntansi penuh.

## 4. Arsitektur & Tech Stack

- **Frontend:** Next.js (App Router), Tailwind CSS, shadcn/ui, PWA (installable di tablet/HP).
- **Backend & DB:** Supabase (PostgreSQL, Auth, Row Level Security, Realtime, Storage).
- **Realtime:** Supabase Realtime untuk KDS, status meja, dan sinkronisasi antar perangkat.
- **Pembayaran:** payment gateway lokal untuk QRIS (mis. Midtrans atau Xendit); tunai dicatat manual.
- **Cetak:** struk & tiket via printer thermal (Web Bluetooth/WebUSB atau layanan print lokal).
- **Integrasi delivery:** layer *adapter* per platform + endpoint webhook (lihat F8).
- **Hosting:** Vercel (frontend) + Supabase (managed).
- **Multi-tenant:** semua tabel punya `outlet_id`; RLS membatasi akses per outlet dan peran.

```
[Tablet Kasir/Pelayan] --\
[HP Pelanggan (QR)]  -----+--> Next.js API / Server Actions --> Supabase (Postgres + Realtime)
[Layar KDS Dapur]  <------/                                        |
[Webhook GoFood/Grab/Shopee] --> Adapter Delivery -----------------/
                                                    --> Dashboard Utama (API/sync)
```

## 5. Spesifikasi Fitur

### F1. Manajemen Meja (Table Management)

**User story:** Sebagai kasir/pelayan, saya ingin melihat denah meja dan statusnya agar bisa menempatkan tamu dengan cepat.

**Kebutuhan:**

- Editor denah visual (drag & drop meja, bentuk bulat/persegi, kapasitas, area/lantai).
- Status meja: **Kosong** (hijau), **Terisi** (merah/oranye, dengan timer durasi dan total sementara), **Perlu Dibersihkan** (kuning). Opsional Fase 2: Reservasi.
- Status berubah otomatis: buka order → Terisi; bayar lunas → Perlu Dibersihkan; pelayan tekan "Sudah Bersih" → Kosong.
- Pindah meja: memindahkan order aktif ke meja lain.
- Update real-time di semua perangkat.

**Acceptance criteria:**

- Perubahan status muncul di perangkat lain < 2 detik.
- Meja dengan order aktif tidak bisa dihapus.

### F2. Split & Merge Bill

**User story:** Sebagai kasir, saya ingin memisah atau menggabungkan tagihan agar pelanggan bisa membayar sesuai keinginan.

**Split bill:**

- Mode: per item (pilih item untuk tiap tagihan), per orang (bagi rata N orang), per nominal.
- Item dengan qty > 1 bisa dipecah (mis. 2 pizza → 1 ke tagihan A, 1 ke tagihan B).
- Tiap sub-tagihan dibayar terpisah dengan metode berbeda; pajak/service charge/diskon dialokasikan proporsional.
- Order induk baru berstatus lunas jika semua sub-tagihan lunas.

**Merge bill / gabung meja:**

- Pilih dua meja atau lebih → satu order gabungan (item tetap tercatat asal mejanya).
- Meja sekunder otomatis ditandai terhubung ke meja utama; saat lunas semua meja ke status Perlu Dibersihkan.
- Bisa di-unmerge selama belum dibayar.

**Acceptance criteria:** total semua sub-tagihan = total order (selisih pembulatan ≤ Rp1 dialokasikan ke tagihan terakhir); item yang sudah dibayar tidak bisa dipindahkan.

### F3. Pesanan Mandiri via QR (QR Self-Ordering) — Fase 2

**User story:** Sebagai pelanggan, saya ingin scan QR di meja, memesan, dan membayar tanpa antre.

**Alur:** scan QR meja → buka halaman menu web (tanpa instal/login) → pilih menu + modifier → keranjang → konfirmasi → bayar (QRIS) atau pilih "bayar di kasir" → pesanan masuk ke KDS dan tampil di POS.

**Kebutuhan:**

- QR unik per meja berisi token (bukan ID polos); sesi pelanggan dibuat saat scan dan kedaluwarsa setelah meja lunas.
- Beberapa pelanggan di satu meja bisa menambah pesanan ke order yang sama.
- Mode persetujuan (opsional): pesanan QR menunggu approval kasir sebelum masuk dapur, bisa diaktifkan per outlet.
- Menu menampilkan ketersediaan real-time (item habis otomatis disembunyikan/nonaktif).
- Perlindungan penyalahgunaan: rate limit, batas nilai pesanan tanpa pembayaran di muka, validasi token.
- Bahasa Indonesia (Inggris opsional).

**Acceptance criteria:** halaman menu termuat < 3 detik di jaringan 4G; pesanan QR tidak bisa dibuat untuk meja yang tokennya tidak valid.

### F4. Kitchen Display System (KDS)

**User story:** Sebagai koki, saya ingin melihat pesanan masuk secara real-time di layar agar tidak bergantung pada kertas.

**Kebutuhan:**

- Tiket tampil berurutan sesuai waktu masuk (FIFO), berisi: nomor meja/tipe order, item, qty, modifier, catatan, sumber (Dine-in / QR / GoFood / GrabFood / ShopeeFood).
- Status per tiket/item: **Baru → Diproses → Siap → Disajikan**; tombol sentuh besar.
- Timer per tiket dengan warna peringatan (hijau → kuning → merah sesuai target waktu).
- Filter per stasiun (Bar, Grill, Dessert) berdasarkan kategori produk.
- Notifikasi bunyi untuk tiket baru; saat "Siap" pelayan/kasir mendapat notifikasi.
- Tiket baru untuk meja yang sama (tambahan pesanan) ditandai "TAMBAHAN"; pembatalan item ditandai merah.
- Fallback: cetak tiket ke printer dapur jika KDS bermasalah.

### F5. Manajemen Variasi Menu (Product Modifiers)

**User story:** Sebagai pelayan, saya ingin mencatat permintaan khusus dengan cepat.

**Kebutuhan:**

- **Grup modifier** yang bisa dipasang ke banyak produk: mis. Tingkat Pedas (pilih 1), Topping (pilih banyak, maks 3), Sugar level & Ice level, Ukuran (S/M/L).
- Aturan grup: wajib/opsional, min/maks pilihan, pilihan default.
- Tiap opsi punya tambahan harga (bisa Rp0) dan bisa terhubung ke bahan resep (mis. extra shot → +espresso).
- Catatan bebas per item.
- Tampil ringkas di keranjang, struk, dan KDS.
- Preset "favorit" per produk agar input 1–2 ketukan.

### F6. Manajemen Resep & Inventaris Bahan Baku

**User story:** Sebagai manajer, saya ingin stok bahan baku berkurang otomatis setiap produk terjual.

**Kebutuhan:**

- Master bahan baku: nama, satuan dasar (gram, ml, pcs), satuan beli (kg, liter, dus) beserta konversi, harga beli terakhir, stok minimum.
- Resep per produk (BOM): daftar bahan + takaran. Mendukung sub-resep (mis. sirup buatan sendiri) dan resep per varian ukuran.
- Modifier dapat menambah/mengganti bahan (mis. oat milk menggantikan susu sapi).
- **Pemotongan stok otomatis** dicatat sebagai pergerakan stok (*stock movement*) — pengaturan: dipotong saat pesanan dikirim ke dapur (rekomendasi) atau saat dibayar. Void/batal mengembalikan stok.
- Fitur stok: penerimaan barang (pembelian), penyesuaian manual, *stock opname*, pencatatan waste/spoilage; semuanya dengan alasan dan nama pengguna.
- Laporan: stok saat ini, pergerakan stok, selisih teori vs opname, HPP (food cost) per produk.
- Produk tanpa resep tetap bisa dijual (stok produk jadi sederhana).

### F7. Pemberitahuan Stok Menipis (Low Stock Alert)

- Ambang batas per bahan (`min_stock`); opsional ambang kritis.
- Peringatan di dasbor, ikon lonceng di POS, dan daftar "Perlu Dipesan" yang bisa diekspor/dikirim ke supplier (draft purchase order).
- Fase 2: notifikasi WhatsApp/email ke manajer.
- Bahan krusial bisa ditandai; jika stok = 0, produk terkait otomatis ditandai **Habis** di POS dan menu QR.
- Peringatan tidak diulang-ulang: satu notifikasi per bahan sampai stok dipulihkan.

### F8. Integrasi Pesan Antar Online — Fase 2

**Tujuan:** pesanan GoFood, GrabFood, ShopeeFood masuk ke satu layar tanpa banyak gawai.

**Kebutuhan:**

- Pola **adapter**: satu antarmuka internal (`terima pesanan`, `terima/tolak`, `update status`, `sinkron menu & ketersediaan`) dengan implementasi terpisah per platform.
- Pesanan masuk lewat webhook/polling → dipetakan ke produk internal lewat tabel *mapping SKU* → muncul di POS dengan notifikasi dan di KDS dengan label sumber.
- Terima/tolak pesanan dari POS; status (diproses, siap diambil driver) disinkronkan balik ke platform.
- Sinkronisasi menu, harga, dan status habis ke platform.
- Rekonsiliasi: komisi/fee platform dicatat terpisah per pesanan untuk laporan.
- **Catatan penting:** akses API resmi tiap platform umumnya memerlukan persetujuan kemitraan/merchant dan syarat teknis masing-masing; ketersediaan dan syaratnya perlu diverifikasi langsung ke platform sebelum pengembangan. Opsi cadangan: lewat penyedia agregator, atau input manual terstruktur sementara.

### F9. Hak Akses & Manajemen Shift

**Hak akses (RBAC):**

| Aksi | Kasir | Pelayan | Manajer | Owner |
| --- | --- | --- | --- | --- |
| Buat/ubah pesanan | ✔ | ✔ | ✔ | ✔ |
| Terima pembayaran | ✔ | — | ✔ | ✔ |
| Void item sebelum dikirim | ✔ | ✔ | ✔ | ✔ |
| Void setelah dikirim / refund | PIN manajer | — | ✔ | ✔ |
| Diskon kecil (≤ batas) | ✔ | — | ✔ | ✔ |
| Diskon besar / ubah harga | PIN manajer | — | ✔ | ✔ |
| Kelola stok & resep | — | — | ✔ | ✔ |
| Laporan & pengaturan | — | — | terbatas | ✔ |

- Login cepat dengan PIN 4–6 digit per karyawan; sesi otomatis terkunci saat idle.
- **Otorisasi manajer:** aksi sensitif memunculkan dialog PIN manajer; semua tercatat di *audit log* (siapa, kapan, alasan, nilai sebelum/sesudah).

**Shift:**

- Buka shift: input modal awal laci kas.
- Selama shift: catat kas masuk/keluar (mis. beli es batu) dengan alasan.
- Tutup shift: kasir menghitung uang fisik → sistem menampilkan **ekspektasi vs aktual** dan selisih; manajer menyetujui; laporan shift (Z-report) dicetak/disimpan.
- Serah terima shift: shift berikutnya otomatis mewarisi saldo akhir yang disetujui.
- Satu laci kas hanya boleh punya satu shift aktif.

## 6. Skema Database (ringkas)

Semua tabel memiliki `id (uuid)`, `outlet_id`, `created_at`, `updated_at` kecuali dinyatakan lain.

| Tabel | Kolom penting |
| --- | --- |
| `outlets` | name, address, tax\_rate, service\_charge\_rate |
| `users` | auth\_id, name, role, pin\_hash, is\_active |
| `areas` / `tables` | area\_id, name, capacity, shape, pos\_x, pos\_y, status, qr\_token |
| `categories` | name, station (bar/grill/dll), sort\_order |
| `products` | category\_id, name, price, is\_available, image\_url |
| `modifier_groups` | name, is\_required, min\_select, max\_select |
| `modifier_options` | group\_id, name, price\_delta, is\_default |
| `product_modifier_groups` | product\_id, group\_id |
| `ingredients` | name, base\_unit, purchase\_unit, conversion, cost, current\_stock, min\_stock |
| `recipes` / `recipe_items` | product\_id (atau option\_id), ingredient\_id, qty, variant |
| `stock_movements` | ingredient\_id, type (sale/purchase/adjust/waste/opname), qty, ref\_id, user\_id, note |
| `orders` | table\_id, type (dine\_in/takeaway/qr/delivery), source, status, subtotal, tax, service, discount, total, shift\_id, parent\_order\_id |
| `order_items` | order\_id, product\_id, qty, price, notes, status, sent\_at, ready\_at |
| `order_item_modifiers` | order\_item\_id, option\_id, price\_delta |
| `bills` / `bill_items` | order\_id, split\_group, amount, status |
| `payments` | bill\_id, method (cash/qris/card), amount, reference, status |
| `table_merges` | primary\_table\_id, merged\_table\_id, order\_id |
| `shifts` | user\_id, opened\_at, closed\_at, opening\_cash, expected\_cash, actual\_cash, variance, approved\_by |
| `cash_movements` | shift\_id, type (in/out), amount, reason |
| `delivery_orders` | order\_id, platform, external\_id, commission, raw\_payload |
| `sku_mappings` | platform, external\_sku, product\_id |
| `audit_logs` | user\_id, action, entity, before, after, approved\_by |

**Aturan RLS:** setiap query dibatasi `outlet_id` pengguna; peran menentukan tabel/aksi yang boleh diakses; halaman QR publik hanya mengakses lewat fungsi server dengan token meja.

## 7. Alur Utama

1. **Dine-in:** pelayan pilih meja → tambah item + modifier → kirim ke dapur → KDS menerima → koki set Siap → pelayan menyajikan → kasir tagih (split/merge jika perlu) → bayar → stok terpotong → meja "Perlu Dibersihkan".
2. **QR:** pelanggan scan → pesan → (approval opsional) → bayar QRIS → tiket ke KDS → disajikan.
3. **Delivery:** webhook platform → tampil di POS (terima/tolak) → KDS → status Siap disinkron → driver mengambil.
4. **Shift:** buka shift → transaksi → tutup shift → hitung kas → persetujuan manajer → laporan.

## 8. Edge Cases

- Item dibatalkan setelah masuk dapur: tiket ditandai batal di KDS, stok dikembalikan, wajib PIN manajer + alasan.
- Dua perangkat mengedit order yang sama: gunakan versi/*optimistic locking*; tampilkan peringatan konflik.
- Pembayaran QRIS terlambat/gagal/dobel: status *pending* dengan timeout, rekonsiliasi lewat webhook gateway, idempotency key.
- Split bill dengan diskon/pajak: alokasi proporsional dan penanganan pembulatan.
- Bahan habis saat pesanan sudah masuk: tetap bisa diproses, stok boleh minus dengan penanda peringatan (konfigurasi per outlet).
- Merge meja lalu salah satu sudah membayar sebagian: unmerge diblokir.
- Internet putus: Fase 1 menampilkan banner offline dan antrean transaksi lokal; Fase 2 mode offline penuh dengan sinkronisasi.
- Item delivery tanpa mapping SKU: pesanan masuk dengan status "Perlu Pemetaan" dan tidak diblokir.
- Shift tidak ditutup: peringatan di hari berikutnya; pesanan baru butuh shift aktif.
- Pelanggan QR meninggalkan keranjang: sesi kedaluwarsa otomatis.
- Perubahan harga/resep: tidak mengubah transaksi lama (snapshot harga di `order_items`).

## 9. Kebutuhan Non-Fungsional

- **UX:** tombol besar ramah sentuh, maks 3 ketukan untuk tambah item favorit, mode gelap, Bahasa Indonesia.
- **Performa:** respons UI < 200 ms untuk aksi umum; KDS update < 2 detik.
- **Keamanan:** RLS, PIN ter-hash, audit log tak bisa dihapus, HTTPS, validasi webhook (signature).
- **Ketersediaan:** target 99,5%; backup harian database.
- **Perangkat:** tablet 10", HP, layar dapur 15–24"; browser Chrome/Edge/Safari terbaru.
- **Kepatuhan:** pajak (PB1/PPN) dan service charge dapat dikonfigurasi; ikuti ketentuan perlindungan data pribadi untuk data pelanggan.

## 10. Integrasi dengan Dashboard Utama

- Sinkronisasi ringkasan: penjualan harian per outlet/kanal, produk terlaris, food cost, stok kritis, laporan shift.
- Mekanisme: endpoint API read-only atau *view* Supabase terpisah dengan kunci khusus; data transaksi mentah tidak dibagikan tanpa otorisasi.
- Format: JSON dengan skema versi (`v1`) agar dashboard tidak rusak saat POS diperbarui.

## 11. Roadmap & Urutan Pembangunan

| Tahap | Modul | Estimasi |
| --- | --- | --- |
| 0 | Setup proyek, auth, RBAC dasar, skema DB | 1 minggu |
| 1 | Menu, kategori, modifier | 1 minggu |
| 2 | Order + meja + pembayaran tunai/QRIS | 2 minggu |
| 3 | KDS realtime | 1 minggu |
| 4 | Split & merge bill | 1 minggu |
| 5 | Resep, stok otomatis, low stock alert | 2 minggu |
| 6 | Shift, otorisasi manajer, audit log, laporan | 1–2 minggu |
| 7 | QR self-ordering | 1–2 minggu |
| 8 | Integrasi delivery + sinkron dashboard utama | 2+ minggu |

Estimasi kasar untuk satu pengembang dengan bantuan AI; sesuaikan setelah Tahap 2.

## 12. Prompt Vibe Coding per Modul

Gunakan berurutan; tempel satu per satu ke Antigravity/Cursor. Selalu awali dengan konteks: *"Proyek: POS F&B, Next.js App Router + TypeScript, Tailwind, shadcn/ui, Supabase. Ikuti skema DB dan RLS di PRD ini."*

1. **Fondasi:** "Buat struktur proyek, koneksi Supabase, migrasi SQL untuk seluruh tabel di bagian 6 beserta RLS per `outlet_id` dan peran, login PIN, dan layout aplikasi dengan sidebar per peran."
2. **Menu & modifier:** "Buat CRUD kategori, produk, grup modifier, opsi modifier, dan relasi produk-grup. Halaman daftar dengan pencarian, unggah gambar, toggle ketersediaan."
3. **Meja & order:** "Buat editor denah meja drag & drop dan layar POS: denah di kiri, keranjang di kanan, dialog pilih modifier, kirim ke dapur. Status meja real-time via Supabase Realtime."
4. **Pembayaran:** "Tambahkan layar bayar: tunai (hitung kembalian), QRIS lewat gateway (webhook + idempotency), cetak struk 58/80 mm."
5. **KDS:** "Buat halaman /kds fullscreen: kolom Baru/Diproses/Siap, timer berwarna, filter stasiun, bunyi notifikasi, tandai TAMBAHAN dan BATAL."
6. **Split & merge:** "Implementasikan split per item/per orang/per nominal dan merge/unmerge meja dengan alokasi pajak-diskon proporsional dan aturan di bagian F2."
7. **Resep & stok:** "Buat master bahan baku, resep + sub-resep, pemotongan stok otomatis via fungsi database (transaksional), stock opname, waste, laporan HPP, dan low stock alert."
8. **Shift & akses:** "Buat buka/tutup shift, kas masuk/keluar, hitung selisih, dialog PIN manajer untuk aksi sensitif, dan audit log."
9. **QR order:** "Buat halaman publik /t/\[token\] mobile-first untuk memesan dan membayar, sesi pelanggan, rate limit, mode approval."
10. **Delivery & dashboard:** "Buat layer adapter delivery dengan satu platform dummy dulu, mapping SKU, terima/tolak order, dan endpoint ringkasan `v1` untuk dashboard utama."

## 13. Risiko & Pertanyaan Terbuka

- **Akses API platform delivery** bisa lambat atau berbayar; siapkan rencana cadangan.
- **Printer thermal di browser** sering rumit (Bluetooth/USB); pertimbangkan aplikasi pendamping kecil.
- **Mode offline** menambah kompleksitas besar; tentukan apakah wajib di MVP.
- **Pertanyaan:** satu outlet atau multi-outlet sejak awal? Bayar QRIS lewat gateway mana? Pemotongan stok saat kirim ke dapur atau saat bayar? Apakah ada kebutuhan reservasi meja?
