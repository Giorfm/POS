-- ==============================================================================
-- SUPABASE SEED DATA: supabase/seed.sql
-- POS F&B Restoran & Kafe (Lengkap, 30 Menu, 12 Meja, Resep, Bahan, SKU)
-- ==============================================================================

-- 1. OUTLET UTAMA
INSERT INTO outlets (id, name, address, phone, tax_rate, service_charge_rate, stock_deduct_trigger, allow_negative_stock, qr_approval_required, max_discount_without_manager)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'Kopi & Resto Nusantara - Cabang Utama',
    'Jl. Senopati No. 45, Kebayoran Baru, Jakarta Selatan',
    '0812-9876-5432',
    0.1000, -- 10% PB1
    0.0500, -- 5% Service Charge
    'on_send',
    true,
    false,
    10.00
) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- 2. USERS / PROFILES (5 Akun Demo dengan PIN Resmi)
-- Owner: PIN 112233
-- Manager: PIN 123456
-- Cashier: PIN 654321
-- Waiter: PIN 111111
-- Kitchen: PIN 222222
INSERT INTO profiles (id, outlet_id, name, role, pin_hash, is_active)
VALUES 
    ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Budi Santoso (Owner)', 'owner', 'e0bc60c82713f64ef8a57c0c40d02ce24fd0141d5cc3086259c19b1e62a62bea', true),
    ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Siti Rahma (Manager)', 'manager', '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92', true),
    ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'Rian Pratama (Kasir)', 'cashier', '481f6cc0511143ccdd7e2d1b1b94faf0a700a8b49cd13922a70b5ae28acaa8c5', true),
    ('10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'Dika Putra (Pelayan)', 'waiter', 'bcb15f821479b4d5772bd0ca866c00ad5f926e3580720659cc80d39c9d09802a', true),
    ('10000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'Chef Joko (Dapur)', 'kitchen', '4cc8f4d609b717356701c57a03e737e5ac8fe885da8c7163d3de47e01849c635', true)
ON CONFLICT (id) DO NOTHING;

-- 3. AREAS
INSERT INTO areas (id, outlet_id, name, floor_order)
VALUES
    ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Lantai 1 - Dining Utama', 1),
    ('20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Lantai 2 - VIP & Rooftop', 2),
    ('20000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'Area Outdoor - Smoking', 3)
ON CONFLICT (id) DO NOTHING;

-- 4. 12 TABLES
INSERT INTO tables (id, outlet_id, area_id, name, capacity, shape, pos_x, pos_y, status, qr_token)
VALUES
    -- Lantai 1 (5 Meja)
    ('30000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Meja 01', 2, 'square', 60, 60, 'available', 'token_meja_01_a9f82c'),
    ('30000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Meja 02', 4, 'square', 200, 60, 'available', 'token_meja_02_b7d31e'),
    ('30000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Meja 03', 4, 'square', 340, 60, 'available', 'token_meja_03_c4e85a'),
    ('30000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Meja 04', 6, 'rectangle', 60, 200, 'available', 'token_meja_04_d2f96b'),
    ('30000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Meja 05', 8, 'rectangle', 240, 200, 'available', 'token_meja_05_e1a47c'),

    -- Lantai 2 (4 Meja)
    ('30000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002', 'Meja VIP 1', 6, 'round', 80, 80, 'available', 'token_meja_06_f5b28d'),
    ('30000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002', 'Meja VIP 2', 6, 'round', 260, 80, 'available', 'token_meja_07_a3c19e'),
    ('30000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002', 'Meja Rooftop 1', 4, 'square', 80, 240, 'available', 'token_meja_08_b6d40f'),
    ('30000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002', 'Meja Rooftop 2', 4, 'square', 240, 240, 'available', 'token_meja_09_c7e51a'),

    -- Outdoor (3 Meja)
    ('30000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000003', 'Outdoor 01', 4, 'round', 60, 60, 'available', 'token_meja_10_d8f62b'),
    ('30000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000003', 'Outdoor 02', 4, 'round', 220, 60, 'available', 'token_meja_11_e9a73c'),
    ('30000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000003', 'Outdoor 03', 2, 'square', 380, 60, 'available', 'token_meja_12_fa84d')
ON CONFLICT (id) DO NOTHING;

-- 5. CATEGORIES DENGAN STASIUN DAPUR
INSERT INTO categories (id, outlet_id, name, station, sort_order)
VALUES
    ('40000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Kopi Spesialti', 'Bar', 1),
    ('40000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Minuman Segar & Teh', 'Bar', 2),
    ('40000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'Makanan Utama Nusantara', 'Kitchen', 3),
    ('40000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'Grill & Western', 'Grill', 4),
    ('40000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'Camilan & Dessert', 'Dessert', 5)
ON CONFLICT (id) DO NOTHING;

-- 6. MODIFIER GROUPS
INSERT INTO modifier_groups (id, outlet_id, name, is_required, min_select, max_select)
VALUES
    ('50000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Tingkat Pedas', true, 1, 1),
    ('50000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Pilihan Topping', false, 0, 3),
    ('50000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'Tingkat Gula (Sugar Level)', false, 0, 1),
    ('50000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'Es Batu (Ice Level)', false, 0, 1),
    ('50000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'Ukuran Cup (Size)', false, 0, 1),
    ('50000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000001', 'Pilihan Susu', false, 0, 1),
    ('50000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000001', 'Extra Shot Espresso', false, 0, 2)
ON CONFLICT (id) DO NOTHING;

-- MODIFIER OPTIONS
INSERT INTO modifier_options (id, group_id, name, price_delta, is_default)
VALUES
    -- Tingkat Pedas
    ('51000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', 'Tidak Pedas (Level 0)', 0, true),
    ('51000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000001', 'Sedang (Level 1)', 0, false),
    ('51000000-0000-0000-0000-000000000003', '50000000-0000-0000-0000-000000000001', 'Pedas (Level 2)', 2000, false),
    ('51000000-0000-0000-0000-000000000004', '50000000-0000-0000-0000-000000000001', 'Extra Pedas (Level 3)', 4000, false),

    -- Topping
    ('51000000-0000-0000-0000-000000000005', '50000000-0000-0000-0000-000000000002', 'Telur Mata Sapi', 5000, false),
    ('51000000-0000-0000-0000-000000000006', '50000000-0000-0000-0000-000000000002', 'Keju Mozzarella', 7000, false),
    ('51000000-0000-0000-0000-000000000007', '50000000-0000-0000-0000-000000000002', 'Sambal Matah Bali', 4000, false),
    ('51000000-0000-0000-0000-000000000008', '50000000-0000-0000-0000-000000000002', 'Kerupuk Kulit Ekstra', 3000, false),

    -- Sugar
    ('51000000-0000-0000-0000-000000000009', '50000000-0000-0000-0000-000000000003', 'Normal Sugar (100%)', 0, true),
    ('51000000-0000-0000-0000-000000000010', '50000000-0000-0000-0000-000000000003', 'Less Sugar (50%)', 0, false),
    ('51000000-0000-0000-0000-000000000011', '50000000-0000-0000-0000-000000000003', 'No Sugar (0%)', 0, false),

    -- Ice
    ('51000000-0000-0000-0000-000000000012', '50000000-0000-0000-0000-000000000004', 'Normal Ice', 0, true),
    ('51000000-0000-0000-0000-000000000013', '50000000-0000-0000-0000-000000000004', 'Less Ice', 0, false),
    ('51000000-0000-0000-0000-000000000014', '50000000-0000-0000-0000-000000000004', 'No Ice', 0, false),

    -- Size
    ('51000000-0000-0000-0000-000000000015', '50000000-0000-0000-0000-000000000005', 'Regular', 0, true),
    ('51000000-0000-0000-0000-000000000016', '50000000-0000-0000-0000-000000000005', 'Large (+50% volume)', 6000, false),

    -- Milk
    ('51000000-0000-0000-0000-000000000017', '50000000-0000-0000-0000-000000000006', 'Fresh Dairy Milk', 0, true),
    ('51000000-0000-0000-0000-000000000018', '50000000-0000-0000-0000-000000000006', 'Oat Milk (Plant-based)', 8000, false),

    -- Extra Shot
    ('51000000-0000-0000-0000-000000000019', '50000000-0000-0000-0000-000000000007', '+1 Shot Espresso', 6000, false)
ON CONFLICT (id) DO NOTHING;

-- 7. 30 MENU PRODUCTS
INSERT INTO products (id, outlet_id, category_id, name, description, price, is_available, is_favorite, image_url)
VALUES
    -- Kategori 1: Kopi Spesialti (Bar)
    ('60000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', 'Kopi Susu Gula Aren', 'Espresso arabika, susu segar, dan sirup gula aren murni.', 24000, true, true, '/menu/kopi-susu.jpg'),
    ('60000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', 'Espresso Double Shot', 'Ekstraksi 36ml kopi single origin Mandheling.', 18000, true, false, '/menu/espresso.jpg'),
    ('60000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'Americano Dingin', 'Double espresso dengan air mineral dingin dan es batu kristal.', 22000, true, true, '/menu/americano.jpg'),
    ('60000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'Caffe Latte Hangat', 'Espresso dengan steamed fresh milk dan microfoam lembut.', 28000, true, true, '/menu/latte.jpg'),
    ('60000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'Cappuccino Klasik', 'Keseimbangan espresso, steamed milk, dan busa tebal bertabur kayu manis.', 28000, true, false, '/menu/cappuccino.jpg'),
    ('60000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000001', 'Caramel Macchiato', 'Espresso bertumpuk sirup vanila, susu, dan drizzle saus karamel.', 34000, true, true, '/menu/macchiato.jpg'),
    ('60000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000001', 'Manual Brew V60 Gayo', 'Pour over kopi arabika Aceh Gayo dengan notes floral & fruitty.', 32000, true, false, '/menu/v60.jpg'),

    -- Kategori 2: Minuman Segar & Teh (Bar)
    ('60000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000002', 'Es Teh Manis Melati', 'Seduhan teh melati wangi khas Jawa dengan gula tebu.', 10000, true, true, '/menu/es-teh.jpg'),
    ('60000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000002', 'Lemon Tea Segar', 'Teh hitam berpadu perasan jeruk lemon asli dan mint.', 18000, true, false, '/menu/lemon-tea.jpg'),
    ('60000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000002', 'Matcha Latte Dingin', 'Bubuk matcha Uji Jepang premium dengan susu segar.', 32000, true, true, '/menu/matcha.jpg'),
    ('60000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000002', 'Cokelat Belgia Panas', 'Dark cocoa premium dipadukan susu hangat kental gurih.', 30000, true, false, '/menu/chocolate.jpg'),
    ('60000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000002', 'Jus Alpukat Kocok', 'Alpukat mentega matang dengan sirup cokelat dan kental manis.', 26000, true, true, '/menu/alpukat.jpg'),
    ('60000000-0000-0000-0000-000000000013', '00000000-0000-0000-0000-000000000002', 'Air Mineral 600ml', 'Air mineral pegunungan dalam kemasan botol.', 8000, true, false, '/menu/mineral.jpg'),

    -- Kategori 3: Makanan Utama Nusantara (Kitchen)
    ('60000000-0000-0000-0000-000000000014', '00000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000003', 'Nasi Goreng Kampung Spesial', 'Nasi goreng bumbu rempah dengan suwiran ayam, telur, dan kerupuk.', 36000, true, true, '/menu/nasgor.jpg'),
    ('60000000-0000-0000-0000-000000000015', '00000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000003', 'Ayam Bakar Taliwang', 'Ayam kampung bakar bumbu pedas khas Lombok dengan plecing kangkung.', 48000, true, true, '/menu/ayam-taliwang.jpg'),
    ('60000000-0000-0000-0000-000000000016', '00000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000003', 'Soto Betawi Daging Sapi', 'Soto kuah santan dan susu rempah dengan irisan daging sapi empuk.', 45000, true, false, '/menu/soto-betawi.jpg'),
    ('60000000-0000-0000-0000-000000000017', '00000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000003', 'Mie Goreng Jawa Nyemek', 'Mie kuning tumis kecap manis kental, sayuran segar, dan telur orak-arik.', 32000, true, false, '/menu/mie-jawa.jpg'),
    ('60000000-0000-0000-0000-000000000018', '00000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000003', 'Sop Buntut Sapi Kuah', 'Buntut sapi empuk dalam kuah kaldu rempah bening gurih bergizi.', 75000, true, true, '/menu/sop-buntut.jpg'),
    ('60000000-0000-0000-0000-000000000019', '00000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000003', 'Bebek Goreng Sambal Korek', 'Bebek ungkep bumbu kuning goreng garing dengan lalapan & sambal pedas.', 52000, true, false, '/menu/bebek-goreng.jpg'),

    -- Kategori 4: Grill & Western (Grill)
    ('60000000-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000004', 'Wagyu Ribeye Steak 200g', 'Daging wagyu meltique panggang disajikan dengan kentang dan mushroom sauce.', 125000, true, true, '/menu/wagyu-steak.jpg'),
    ('60000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000004', 'Classic Beef Cheese Burger', 'Patty daging sapi 150g, keju melted, acar, selada, dan french fries.', 58000, true, true, '/menu/burger.jpg'),
    ('60000000-0000-0000-0000-000000000022', '00000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000004', 'Grilled Chicken Steak', 'Dada ayam panggang saus black pepper dengan tumis buncis & jagung.', 48000, true, false, '/menu/chicken-steak.jpg'),
    ('60000000-0000-0000-0000-000000000023', '00000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000004', 'Fish and Chips Tartar', 'Fillet dory goreng tepung renyah berpadu saus tartar gurih segar.', 46000, true, false, '/menu/fish-chips.jpg'),
    ('60000000-0000-0000-0000-000000000024', '00000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000004', 'Spaghetti Carbonara Smoked Beef', 'Pasta creamy dengan keju parmesan, telur, dan irisan daging asap.', 45000, true, true, '/menu/carbonara.jpg'),

    -- Kategori 5: Camilan & Dessert (Dessert)
    ('60000000-0000-0000-0000-000000000025', '00000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000005', 'French Fries Truffle Mayo', 'Kentang goreng renyah dengan taburan garam laut dan cocolan truffle mayo.', 28000, true, true, '/menu/fries.jpg'),
    ('60000000-0000-0000-0000-000000000026', '00000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000005', 'Tahu Cabe Garam Krispi', 'Tahu goreng garing ditumis dengan bawang putih, cabai rawit, dan daun bawang.', 24000, true, true, '/menu/tahu-garam.jpg'),
    ('60000000-0000-0000-0000-000000000027', '00000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000005', 'Pisang Goreng Madu Wijen', 'Pisang raja manis digoreng caramel renyah disiram madu asli.', 26000, true, false, '/menu/pisang-goreng.jpg'),
    ('60000000-0000-0000-0000-000000000028', '00000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000005', 'Croissant Butter Original', 'Pastry khas Perancis berlapis renyah dengan aroma mentega harum.', 25000, true, false, '/menu/croissant.jpg'),
    ('60000000-0000-0000-0000-000000000029', '00000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000005', 'Waffle Ice Cream Cokelat', 'Waffle renyah hangat disajikan dengan 1 scoop es krim vanilla & saus cokelat.', 32000, true, true, '/menu/waffle.jpg'),
    ('60000000-0000-0000-0000-000000000030', '00000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000005', 'Roti Bakar Cokelat Keju', 'Roti tebal panggang isi cokelat meses melimpah dan taburan keju cedar.', 25000, true, false, '/menu/roti-bakar.jpg')
ON CONFLICT (id) DO NOTHING;

-- RELASIKAN PRODUK KE MODIFIER GROUPS
-- Kopi ke: Gula, Es, Ukuran, Susu, Extra Shot
INSERT INTO product_modifier_groups (product_id, group_id)
SELECT p.id, g.id
FROM products p
CROSS JOIN modifier_groups g
WHERE p.category_id = '40000000-0000-0000-0000-000000000001'
  AND g.name IN ('Tingkat Gula (Sugar Level)', 'Es Batu (Ice Level)', 'Ukuran Cup (Size)', 'Pilihan Susu', 'Extra Shot Espresso')
ON CONFLICT DO NOTHING;

-- Makanan Utama & Grill ke: Tingkat Pedas, Pilihan Topping
INSERT INTO product_modifier_groups (product_id, group_id)
SELECT p.id, g.id
FROM products p
CROSS JOIN modifier_groups g
WHERE p.category_id IN ('40000000-0000-0000-0000-000000000003', '40000000-0000-0000-0000-000000000004')
  AND g.name IN ('Tingkat Pedas', 'Pilihan Topping')
ON CONFLICT DO NOTHING;

-- 8. MASTER INGREDIENTS (BAHAN BAKU DENGAN STOK & MIN STOK)
INSERT INTO ingredients (id, outlet_id, name, base_unit, purchase_unit, conversion, cost, current_stock, min_stock, is_critical)
VALUES
    ('70000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Biji Kopi Arabika Roast', 'g', 'kg', 1000, 250, 4500, 1000, true),
    ('70000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Fresh Milk Pasteurisasi', 'ml', 'liter', 1000, 20, 12000, 3000, true),
    ('70000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'Oat Milk Barista', 'ml', 'liter', 1000, 45, 5000, 1000, false),
    ('70000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'Sirup Gula Aren Cair', 'ml', 'liter', 1000, 30, 6000, 1500, false),
    ('70000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'Daging Sapi Ribeye Meltique', 'g', 'kg', 1000, 220, 3500, 1000, true),
    ('70000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000001', 'Daging Ayam Fillet', 'g', 'kg', 1000, 60, 8000, 2000, true),
    ('70000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000001', 'Beras Ramos Super', 'g', 'kg', 1000, 15, 25000, 5000, true),
    ('70000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000001', 'Telur Ayam Segar', 'pcs', 'pack', 30, 2000, 150, 40, true),
    ('70000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000001', 'Keju Mozzarella Blok', 'g', 'kg', 1000, 120, 2500, 800, false),
    ('70000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001', 'Kentang Beku Shoestring', 'g', 'kg', 1000, 40, 10000, 2500, false),
    ('70000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000001', 'Bumbu Sambal Matah Fresh', 'g', 'kg', 1000, 70, 1800, 500, false),
    ('70000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000001', 'Teh Melati Wangi', 'g', 'kg', 1000, 80, 2000, 600, false)
ON CONFLICT (id) DO NOTHING;

-- 9. RECIPES (BOM PER MENU DAN MODIFIER)
-- Kopi Susu Gula Aren: 18g biji kopi + 120ml fresh milk + 25ml gula aren
INSERT INTO recipes (outlet_id, product_id, ingredient_id, qty, action)
VALUES
    ('00000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000001', 18, 'add'),
    ('00000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000002', 120, 'add'),
    ('00000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000004', 25, 'add'),

    -- Nasi Goreng Spesial: 120g beras + 50g ayam + 1 butir telur
    ('00000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000014', '70000000-0000-0000-0000-000000000007', 120, 'add'),
    ('00000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000014', '70000000-0000-0000-0000-000000000006', 50, 'add'),
    ('00000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000014', '70000000-0000-0000-0000-000000000008', 1, 'add'),

    -- Wagyu Ribeye Steak: 200g ribeye + 150g kentang goreng
    ('00000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000020', '70000000-0000-0000-0000-000000000005', 200, 'add'),
    ('00000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000020', '70000000-0000-0000-0000-000000000010', 150, 'add'),

    -- French Fries Truffle: 200g kentang beku
    ('00000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000025', '70000000-0000-0000-0000-000000000010', 200, 'add')
ON CONFLICT DO NOTHING;

-- Modifier Recipes:
-- Extra Shot: +9g biji kopi
INSERT INTO recipes (outlet_id, option_id, ingredient_id, qty, action)
VALUES
    ('00000000-0000-0000-0000-000000000001', '51000000-0000-0000-0000-000000000019', '70000000-0000-0000-0000-000000000001', 9, 'add'),
    -- Oat Milk: ganti susu sapi dengan 120ml oat milk
    ('00000000-0000-0000-0000-000000000001', '51000000-0000-0000-0000-000000000018', '70000000-0000-0000-0000-000000000003', 120, 'replace'),
    -- Topping Telur Mata Sapi: +1 butir telur
    ('00000000-0000-0000-0000-000000000001', '51000000-0000-0000-0000-000000000005', '70000000-0000-0000-0000-000000000008', 1, 'add'),
    -- Topping Sambal Matah: +30g sambal matah
    ('00000000-0000-0000-0000-000000000001', '51000000-0000-0000-0000-000000000007', '70000000-0000-0000-0000-000000000011', 30, 'add')
ON CONFLICT DO NOTHING;

-- 10. SKU MAPPINGS UNTUK DELIVERY (GoFood, GrabFood, ShopeeFood)
INSERT INTO sku_mappings (outlet_id, platform, external_sku, product_id)
VALUES
    ('00000000-0000-0000-0000-000000000001', 'gofood', 'GF-KOPI-AREN', '60000000-0000-0000-0000-000000000001'),
    ('00000000-0000-0000-0000-000000000001', 'gofood', 'GF-NASGOR-SPESIAL', '60000000-0000-0000-0000-000000000014'),
    ('00000000-0000-0000-0000-000000000001', 'grabfood', 'GRAB-KOPI-AREN', '60000000-0000-0000-0000-000000000001'),
    ('00000000-0000-0000-0000-000000000001', 'grabfood', 'GRAB-BURGER', '60000000-0000-0000-0000-000000000021'),
    ('00000000-0000-0000-0000-000000000001', 'shopeefood', 'SPF-KOPI-AREN', '60000000-0000-0000-0000-000000000001'),
    ('00000000-0000-0000-0000-000000000001', 'shopeefood', 'SPF-FRIES', '60000000-0000-0000-0000-000000000025')
ON CONFLICT DO NOTHING;
