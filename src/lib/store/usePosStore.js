/**
 * @file usePosStore.js
 * State management terpadu (Zustand) untuk operasional POS F&B.
 * Mendukung persistensi lokal, kalkulasi pajak/service otomatis,
 * pemotongan stok bahan baku berdasar resep, split bill presisi,
 * manajemen shift kasir, dan integrasi pesanan real-time.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { hashPin, verifyPin } from '@/lib/crypto';
import { playKitchenChime, playOrderReadySound, playAlertSound } from '@/lib/audio';

// DATA AWAL DEMO (DITURUNKAN DARI SEED SUPABASE)
const INITIAL_OUTLET = {
  id: '00000000-0000-0000-0000-000000000001',
  name: 'Kopi & Resto Nusantara - Cabang Utama',
  address: 'Jl. Senopati No. 45, Kebayoran Baru, Jakarta Selatan',
  phone: '0812-9876-5432',
  tax_rate: 0.10, // 10% PB1
  service_charge_rate: 0.05, // 5% Service Charge
  stock_deduct_trigger: 'on_send', // 'on_send' | 'on_paid'
  allow_negative_stock: true,
  qr_approval_required: false,
  max_discount_without_manager: 10,
};

const INITIAL_PROFILES = [
  {
    id: '10000000-0000-0000-0000-000000000001',
    name: 'Budi Santoso',
    role: 'owner',
    pin_hash: 'e0bc60c82713f64ef8a57c0c40d02ce24fd0141d5cc3086259c19b1e62a62bea', // PIN: 112233
    is_active: true,
  },
  {
    id: '10000000-0000-0000-0000-000000000002',
    name: 'Siti Rahma',
    role: 'manager',
    pin_hash: '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92', // PIN: 123456
    is_active: true,
  },
  {
    id: '10000000-0000-0000-0000-000000000003',
    name: 'Rian Pratama',
    role: 'cashier',
    pin_hash: '481f6cc0511143ccdd7e2d1b1b94faf0a700a8b49cd13922a70b5ae28acaa8c5', // PIN: 654321
    is_active: true,
  },
  {
    id: '10000000-0000-0000-0000-000000000004',
    name: 'Dika Putra',
    role: 'waiter',
    pin_hash: 'bcb15f821479b4d5772bd0ca866c00ad5f926e3580720659cc80d39c9d09802a', // PIN: 111111
    is_active: true,
  },
  {
    id: '10000000-0000-0000-0000-000000000005',
    name: 'Chef Joko',
    role: 'kitchen',
    pin_hash: '4cc8f4d609b717356701c57a03e737e5ac8fe885da8c7163d3de47e01849c635', // PIN: 222222
    is_active: true,
  },
];

const INITIAL_AREAS = [
  { id: '20000000-0000-0000-0000-000000000001', name: 'Lantai 1 - Dining Utama', floor_order: 1 },
  { id: '20000000-0000-0000-0000-000000000002', name: 'Lantai 2 - VIP & Rooftop', floor_order: 2 },
  { id: '20000000-0000-0000-0000-000000000003', name: 'Area Outdoor - Smoking', floor_order: 3 },
];

const INITIAL_TABLES = [
  { id: '30000000-0000-0000-0000-000000000001', area_id: '20000000-0000-0000-0000-000000000001', name: 'Meja 01', capacity: 2, shape: 'square', pos_x: 60, pos_y: 60, status: 'available', qr_token: 'token_meja_01_a9f82c' },
  { id: '30000000-0000-0000-0000-000000000002', area_id: '20000000-0000-0000-0000-000000000001', name: 'Meja 02', capacity: 4, shape: 'square', pos_x: 200, pos_y: 60, status: 'available', qr_token: 'token_meja_02_b7d31e' },
  { id: '30000000-0000-0000-0000-000000000003', area_id: '20000000-0000-0000-0000-000000000001', name: 'Meja 03', capacity: 4, shape: 'square', pos_x: 340, pos_y: 60, status: 'available', qr_token: 'token_meja_03_c4e85a' },
  { id: '30000000-0000-0000-0000-000000000004', area_id: '20000000-0000-0000-0000-000000000001', name: 'Meja 04', capacity: 6, shape: 'rectangle', pos_x: 60, pos_y: 200, status: 'available', qr_token: 'token_meja_04_d2f96b' },
  { id: '30000000-0000-0000-0000-000000000005', area_id: '20000000-0000-0000-0000-000000000001', name: 'Meja 05', capacity: 8, shape: 'rectangle', pos_x: 240, pos_y: 200, status: 'available', qr_token: 'token_meja_05_e1a47c' },

  { id: '30000000-0000-0000-0000-000000000006', area_id: '20000000-0000-0000-0000-000000000002', name: 'Meja VIP 1', capacity: 6, shape: 'round', pos_x: 80, pos_y: 80, status: 'available', qr_token: 'token_meja_06_f5b28d' },
  { id: '30000000-0000-0000-0000-000000000007', area_id: '20000000-0000-0000-0000-000000000002', name: 'Meja VIP 2', capacity: 6, shape: 'round', pos_x: 260, pos_y: 80, status: 'available', qr_token: 'token_meja_07_a3c19e' },
  { id: '30000000-0000-0000-0000-000000000008', area_id: '20000000-0000-0000-0000-000000000002', name: 'Meja Rooftop 1', capacity: 4, shape: 'square', pos_x: 80, pos_y: 240, status: 'available', qr_token: 'token_meja_08_b6d40f' },
  { id: '30000000-0000-0000-0000-000000000009', area_id: '20000000-0000-0000-0000-000000000002', name: 'Meja Rooftop 2', capacity: 4, shape: 'square', pos_x: 240, pos_y: 240, status: 'available', qr_token: 'token_meja_09_c7e51a' },

  { id: '30000000-0000-0000-0000-000000000010', area_id: '20000000-0000-0000-0000-000000000003', name: 'Outdoor 01', capacity: 4, shape: 'round', pos_x: 60, pos_y: 60, status: 'available', qr_token: 'token_meja_10_d8f62b' },
  { id: '30000000-0000-0000-0000-000000000011', area_id: '20000000-0000-0000-0000-000000000003', name: 'Outdoor 02', capacity: 4, shape: 'round', pos_x: 220, pos_y: 60, status: 'available', qr_token: 'token_meja_11_e9a73c' },
  { id: '30000000-0000-0000-0000-000000000012', area_id: '20000000-0000-0000-0000-000000000003', name: 'Outdoor 03', capacity: 2, shape: 'square', pos_x: 380, pos_y: 60, status: 'available', qr_token: 'token_meja_12_fa84d' },
];

const INITIAL_CATEGORIES = [
  { id: '40000000-0000-0000-0000-000000000001', name: 'Kopi Spesialti', station: 'Bar', sort_order: 1 },
  { id: '40000000-0000-0000-0000-000000000002', name: 'Minuman Segar & Teh', station: 'Bar', sort_order: 2 },
  { id: '40000000-0000-0000-0000-000000000003', name: 'Makanan Utama Nusantara', station: 'Kitchen', sort_order: 3 },
  { id: '40000000-0000-0000-0000-000000000004', name: 'Grill & Western', station: 'Grill', sort_order: 4 },
  { id: '40000000-0000-0000-0000-000000000005', name: 'Camilan & Dessert', station: 'Dessert', sort_order: 5 },
];

const INITIAL_MODIFIER_GROUPS = [
  { id: '50000000-0000-0000-0000-000000000001', name: 'Tingkat Pedas', is_required: true, min_select: 1, max_select: 1 },
  { id: '50000000-0000-0000-0000-000000000002', name: 'Pilihan Topping', is_required: false, min_select: 0, max_select: 3 },
  { id: '50000000-0000-0000-0000-000000000003', name: 'Tingkat Gula (Sugar Level)', is_required: false, min_select: 0, max_select: 1 },
  { id: '50000000-0000-0000-0000-000000000004', name: 'Es Batu (Ice Level)', is_required: false, min_select: 0, max_select: 1 },
  { id: '50000000-0000-0000-0000-000000000005', name: 'Ukuran Cup (Size)', is_required: false, min_select: 0, max_select: 1 },
  { id: '50000000-0000-0000-0000-000000000006', name: 'Pilihan Susu', is_required: false, min_select: 0, max_select: 1 },
  { id: '50000000-0000-0000-0000-000000000007', name: 'Extra Shot Espresso', is_required: false, min_select: 0, max_select: 2 },
];

const INITIAL_MODIFIER_OPTIONS = [
  // Tingkat Pedas
  { id: '51000000-0000-0000-0000-000000000001', group_id: '50000000-0000-0000-0000-000000000001', name: 'Tidak Pedas (Level 0)', price_delta: 0, is_default: true },
  { id: '51000000-0000-0000-0000-000000000002', group_id: '50000000-0000-0000-0000-000000000001', name: 'Sedang (Level 1)', price_delta: 0, is_default: false },
  { id: '51000000-0000-0000-0000-000000000003', group_id: '50000000-0000-0000-0000-000000000001', name: 'Pedas (Level 2)', price_delta: 2000, is_default: false },
  { id: '51000000-0000-0000-0000-000000000004', group_id: '50000000-0000-0000-0000-000000000001', name: 'Extra Pedas (Level 3)', price_delta: 4000, is_default: false },

  // Topping
  { id: '51000000-0000-0000-0000-000000000005', group_id: '50000000-0000-0000-0000-000000000002', name: 'Telur Mata Sapi', price_delta: 5000, is_default: false },
  { id: '51000000-0000-0000-0000-000000000006', group_id: '50000000-0000-0000-0000-000000000002', name: 'Keju Mozzarella', price_delta: 7000, is_default: false },
  { id: '51000000-0000-0000-0000-000000000007', group_id: '50000000-0000-0000-0000-000000000002', name: 'Sambal Matah Bali', price_delta: 4000, is_default: false },
  { id: '51000000-0000-0000-0000-000000000008', group_id: '50000000-0000-0000-0000-000000000002', name: 'Kerupuk Kulit Ekstra', price_delta: 3000, is_default: false },

  // Sugar
  { id: '51000000-0000-0000-0000-000000000009', group_id: '50000000-0000-0000-0000-000000000003', name: 'Normal Sugar (100%)', price_delta: 0, is_default: true },
  { id: '51000000-0000-0000-0000-000000000010', group_id: '50000000-0000-0000-0000-000000000003', name: 'Less Sugar (50%)', price_delta: 0, is_default: false },
  { id: '51000000-0000-0000-0000-000000000011', group_id: '50000000-0000-0000-0000-000000000003', name: 'No Sugar (0%)', price_delta: 0, is_default: false },

  // Ice
  { id: '51000000-0000-0000-0000-000000000012', group_id: '50000000-0000-0000-0000-000000000004', name: 'Normal Ice', price_delta: 0, is_default: true },
  { id: '51000000-0000-0000-0000-000000000013', group_id: '50000000-0000-0000-0000-000000000004', name: 'Less Ice', price_delta: 0, is_default: false },
  { id: '51000000-0000-0000-0000-000000000014', group_id: '50000000-0000-0000-0000-000000000004', name: 'No Ice', price_delta: 0, is_default: false },

  // Size
  { id: '51000000-0000-0000-0000-000000000015', group_id: '50000000-0000-0000-0000-000000000005', name: 'Regular', price_delta: 0, is_default: true },
  { id: '51000000-0000-0000-0000-000000000016', group_id: '50000000-0000-0000-0000-000000000005', name: 'Large (+50% volume)', price_delta: 6000, is_default: false },

  // Milk
  { id: '51000000-0000-0000-0000-000000000017', group_id: '50000000-0000-0000-0000-000000000006', name: 'Fresh Dairy Milk', price_delta: 0, is_default: true },
  { id: '51000000-0000-0000-0000-000000000018', group_id: '50000000-0000-0000-0000-000000000006', name: 'Oat Milk (Plant-based)', price_delta: 8000, is_default: false },

  // Extra Shot
  { id: '51000000-0000-0000-0000-000000000019', group_id: '50000000-0000-0000-0000-000000000007', name: '+1 Shot Espresso', price_delta: 6000, is_default: false },
];

const INITIAL_PRODUCTS = [
  // Kopi
  { id: '60000000-0000-0000-0000-000000000001', category_id: '40000000-0000-0000-0000-000000000001', name: 'Kopi Susu Gula Aren', description: 'Espresso arabika, susu segar, dan sirup gula aren murni.', price: 24000, is_available: true, is_favorite: true, image_url: '/menu/kopi-susu.jpg', modifier_group_ids: ['50000000-0000-0000-0000-000000000003', '50000000-0000-0000-0000-000000000004', '50000000-0000-0000-0000-000000000005', '50000000-0000-0000-0000-000000000006', '50000000-0000-0000-0000-000000000007'] },
  { id: '60000000-0000-0000-0000-000000000002', category_id: '40000000-0000-0000-0000-000000000001', name: 'Espresso Double Shot', description: 'Ekstraksi 36ml kopi single origin Mandheling.', price: 18000, is_available: true, is_favorite: false, image_url: '/menu/espresso.jpg', modifier_group_ids: [] },
  { id: '60000000-0000-0000-0000-000000000003', category_id: '40000000-0000-0000-0000-000000000001', name: 'Americano Dingin', description: 'Double espresso dengan air mineral dingin dan es batu.', price: 22000, is_available: true, is_favorite: true, image_url: '/menu/americano.jpg', modifier_group_ids: ['50000000-0000-0000-0000-000000000004', '50000000-0000-0000-0000-000000000007'] },
  { id: '60000000-0000-0000-0000-000000000004', category_id: '40000000-0000-0000-0000-000000000001', name: 'Caffe Latte Hangat', description: 'Espresso dengan steamed fresh milk dan microfoam lembut.', price: 28000, is_available: true, is_favorite: true, image_url: '/menu/latte.jpg', modifier_group_ids: ['50000000-0000-0000-0000-000000000003', '50000000-0000-0000-0000-000000000006', '50000000-0000-0000-0000-000000000007'] },
  { id: '60000000-0000-0000-0000-000000000005', category_id: '40000000-0000-0000-0000-000000000001', name: 'Cappuccino Klasik', description: 'Keseimbangan espresso, steamed milk, dan busa tebal.', price: 28000, is_available: true, is_favorite: false, image_url: '/menu/cappuccino.jpg', modifier_group_ids: ['50000000-0000-0000-0000-000000000003', '50000000-0000-0000-0000-000000000006'] },
  { id: '60000000-0000-0000-0000-000000000006', category_id: '40000000-0000-0000-0000-000000000001', name: 'Caramel Macchiato', description: 'Espresso bertumpuk sirup vanila, susu, dan drizzle saus karamel.', price: 34000, is_available: true, is_favorite: true, image_url: '/menu/macchiato.jpg', modifier_group_ids: ['50000000-0000-0000-0000-000000000004', '50000000-0000-0000-0000-000000000006', '50000000-0000-0000-0000-000000000007'] },
  { id: '60000000-0000-0000-0000-000000000007', category_id: '40000000-0000-0000-0000-000000000001', name: 'Manual Brew V60 Gayo', description: 'Pour over kopi arabika Aceh Gayo.', price: 32000, is_available: true, is_favorite: false, image_url: '/menu/v60.jpg', modifier_group_ids: [] },

  // Minuman Non-Kopi
  { id: '60000000-0000-0000-0000-000000000008', category_id: '40000000-0000-0000-0000-000000000002', name: 'Es Teh Manis Melati', description: 'Seduhan teh melati wangi khas Jawa.', price: 10000, is_available: true, is_favorite: true, image_url: '/menu/es-teh.jpg', modifier_group_ids: ['50000000-0000-0000-0000-000000000003', '50000000-0000-0000-0000-000000000004'] },
  { id: '60000000-0000-0000-0000-000000000009', category_id: '40000000-0000-0000-0000-000000000002', name: 'Lemon Tea Segar', description: 'Teh hitam berpadu perasan jeruk lemon asli.', price: 18000, is_available: true, is_favorite: false, image_url: '/menu/lemon-tea.jpg', modifier_group_ids: ['50000000-0000-0000-0000-000000000003', '50000000-0000-0000-0000-000000000004'] },
  { id: '60000000-0000-0000-0000-000000000010', category_id: '40000000-0000-0000-0000-000000000002', name: 'Matcha Latte Dingin', description: 'Bubuk matcha Uji Jepang premium dengan susu segar.', price: 32000, is_available: true, is_favorite: true, image_url: '/menu/matcha.jpg', modifier_group_ids: ['50000000-0000-0000-0000-000000000003', '50000000-0000-0000-0000-000000000004', '50000000-0000-0000-0000-000000000006'] },
  { id: '60000000-0000-0000-0000-000000000011', category_id: '40000000-0000-0000-0000-000000000002', name: 'Cokelat Belgia Panas', description: 'Dark cocoa premium dipadukan susu hangat kental.', price: 30000, is_available: true, is_favorite: false, image_url: '/menu/chocolate.jpg', modifier_group_ids: ['50000000-0000-0000-0000-000000000006'] },
  { id: '60000000-0000-0000-0000-000000000012', category_id: '40000000-0000-0000-0000-000000000002', name: 'Jus Alpukat Kocok', description: 'Alpukat mentega matang dengan sirup cokelat.', price: 26000, is_available: true, is_favorite: true, image_url: '/menu/alpukat.jpg', modifier_group_ids: [] },
  { id: '60000000-0000-0000-0000-000000000013', category_id: '40000000-0000-0000-0000-000000000002', name: 'Air Mineral 600ml', description: 'Air mineral pegunungan botol dingin.', price: 8000, is_available: true, is_favorite: false, image_url: '/menu/mineral.jpg', modifier_group_ids: [] },

  // Makanan Utama (Kitchen)
  { id: '60000000-0000-0000-0000-000000000014', category_id: '40000000-0000-0000-0000-000000000003', name: 'Nasi Goreng Kampung Spesial', description: 'Nasi goreng bumbu rempah dengan suwiran ayam, telur, dan kerupuk.', price: 36000, is_available: true, is_favorite: true, image_url: '/menu/nasgor.jpg', modifier_group_ids: ['50000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000002'] },
  { id: '60000000-0000-0000-0000-000000000015', category_id: '40000000-0000-0000-0000-000000000003', name: 'Ayam Bakar Taliwang', description: 'Ayam kampung bakar bumbu pedas khas Lombok dengan plecing kangkung.', price: 48000, is_available: true, is_favorite: true, image_url: '/menu/ayam-taliwang.jpg', modifier_group_ids: ['50000000-0000-0000-0000-000000000001'] },
  { id: '60000000-0000-0000-0000-000000000016', category_id: '40000000-0000-0000-0000-000000000003', name: 'Soto Betawi Daging Sapi', description: 'Soto kuah santan dan susu rempah dengan irisan daging sapi empuk.', price: 45000, is_available: true, is_favorite: false, image_url: '/menu/soto-betawi.jpg', modifier_group_ids: ['50000000-0000-0000-0000-000000000002'] },
  { id: '60000000-0000-0000-0000-000000000017', category_id: '40000000-0000-0000-0000-000000000003', name: 'Mie Goreng Jawa Nyemek', description: 'Mie kuning tumis kecap manis kental, sayuran segar, dan telur.', price: 32000, is_available: true, is_favorite: false, image_url: '/menu/mie-jawa.jpg', modifier_group_ids: ['50000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000002'] },
  { id: '60000000-0000-0000-0000-000000000018', category_id: '40000000-0000-0000-0000-000000000003', name: 'Sop Buntut Sapi Kuah', description: 'Buntut sapi empuk dalam kuah kaldu rempah bening gurih.', price: 75000, is_available: true, is_favorite: true, image_url: '/menu/sop-buntut.jpg', modifier_group_ids: [] },
  { id: '60000000-0000-0000-0000-000000000019', category_id: '40000000-0000-0000-0000-000000000003', name: 'Bebek Goreng Sambal Korek', description: 'Bebek ungkep bumbu kuning goreng garing dengan lalapan & sambal pedas.', price: 52000, is_available: true, is_favorite: false, image_url: '/menu/bebek-goreng.jpg', modifier_group_ids: ['50000000-0000-0000-0000-000000000001'] },

  // Grill & Western (Grill)
  { id: '60000000-0000-0000-0000-000000000020', category_id: '40000000-0000-0000-0000-000000000004', name: 'Wagyu Ribeye Steak 200g', description: 'Daging wagyu meltique panggang disajikan dengan kentang dan mushroom sauce.', price: 125000, is_available: true, is_favorite: true, image_url: '/menu/wagyu-steak.jpg', modifier_group_ids: ['50000000-0000-0000-0000-000000000002'] },
  { id: '60000000-0000-0000-0000-000000000021', category_id: '40000000-0000-0000-0000-000000000004', name: 'Classic Beef Cheese Burger', description: 'Patty daging sapi 150g, keju melted, acar, selada, dan french fries.', price: 58000, is_available: true, is_favorite: true, image_url: '/menu/burger.jpg', modifier_group_ids: ['50000000-0000-0000-0000-000000000002'] },
  { id: '60000000-0000-0000-0000-000000000022', category_id: '40000000-0000-0000-0000-000000000004', name: 'Grilled Chicken Steak', description: 'Dada ayam panggang saus black pepper dengan tumis buncis & jagung.', price: 48000, is_available: true, is_favorite: false, image_url: '/menu/chicken-steak.jpg', modifier_group_ids: [] },
  { id: '60000000-0000-0000-0000-000000000023', category_id: '40000000-0000-0000-0000-000000000004', name: 'Fish and Chips Tartar', description: 'Fillet dory goreng tepung renyah berpadu saus tartar gurih segar.', price: 46000, is_available: true, is_favorite: false, image_url: '/menu/fish-chips.jpg', modifier_group_ids: [] },
  { id: '60000000-0000-0000-0000-000000000024', category_id: '40000000-0000-0000-0000-000000000004', name: 'Spaghetti Carbonara Smoked Beef', description: 'Pasta creamy dengan keju parmesan, telur, dan irisan daging asap.', price: 45000, is_available: true, is_favorite: true, image_url: '/menu/carbonara.jpg', modifier_group_ids: ['50000000-0000-0000-0000-000000000002'] },

  // Camilan & Dessert (Dessert)
  { id: '60000000-0000-0000-0000-000000000025', category_id: '40000000-0000-0000-0000-000000000005', name: 'French Fries Truffle Mayo', description: 'Kentang goreng renyah dengan taburan garam laut dan truffle mayo.', price: 28000, is_available: true, is_favorite: true, image_url: '/menu/fries.jpg', modifier_group_ids: [] },
  { id: '60000000-0000-0000-0000-000000000026', category_id: '40000000-0000-0000-0000-000000000005', name: 'Tahu Cabe Garam Krispi', description: 'Tahu goreng garing ditumis dengan bawang putih, cabai rawit, dan daun bawang.', price: 24000, is_available: true, is_favorite: true, image_url: '/menu/tahu-garam.jpg', modifier_group_ids: ['50000000-0000-0000-0000-000000000001'] },
  { id: '60000000-0000-0000-0000-000000000027', category_id: '40000000-0000-0000-0000-000000000005', name: 'Pisang Goreng Madu Wijen', description: 'Pisang raja manis digoreng caramel renyah disiram madu asli.', price: 26000, is_available: true, is_favorite: false, image_url: '/menu/pisang-goreng.jpg', modifier_group_ids: [] },
  { id: '60000000-0000-0000-0000-000000000028', category_id: '40000000-0000-0000-0000-000000000005', name: 'Croissant Butter Original', description: 'Pastry khas Perancis berlapis renyah dengan aroma mentega harum.', price: 25000, is_available: true, is_favorite: false, image_url: '/menu/croissant.jpg', modifier_group_ids: [] },
  { id: '60000000-0000-0000-0000-000000000029', category_id: '40000000-0000-0000-0000-000000000005', name: 'Waffle Ice Cream Cokelat', description: 'Waffle renyah hangat disajikan dengan 1 scoop es krim vanilla & saus cokelat.', price: 32000, is_available: true, is_favorite: true, image_url: '/menu/waffle.jpg', modifier_group_ids: [] },
  { id: '60000000-0000-0000-0000-000000000030', category_id: '40000000-0000-0000-0000-000000000005', name: 'Roti Bakar Cokelat Keju', description: 'Roti tebal panggang isi cokelat meses melimpah dan taburan keju cedar.', price: 25000, is_available: true, is_favorite: false, image_url: '/menu/roti-bakar.jpg', modifier_group_ids: [] },
];

const INITIAL_INGREDIENTS = [
  { id: '70000000-0000-0000-0000-000000000001', name: 'Biji Kopi Arabika Roast', base_unit: 'g', purchase_unit: 'kg', conversion: 1000, cost: 250, current_stock: 4500, min_stock: 1000, is_critical: true },
  { id: '70000000-0000-0000-0000-000000000002', name: 'Fresh Milk Pasteurisasi', base_unit: 'ml', purchase_unit: 'liter', conversion: 1000, cost: 20, current_stock: 12000, min_stock: 3000, is_critical: true },
  { id: '70000000-0000-0000-0000-000000000003', name: 'Oat Milk Barista', base_unit: 'ml', purchase_unit: 'liter', conversion: 1000, cost: 45, current_stock: 5000, min_stock: 1000, is_critical: false },
  { id: '70000000-0000-0000-0000-000000000004', name: 'Sirup Gula Aren Cair', base_unit: 'ml', purchase_unit: 'liter', conversion: 1000, cost: 30, current_stock: 6000, min_stock: 1500, is_critical: false },
  { id: '70000000-0000-0000-0000-000000000005', name: 'Daging Sapi Ribeye Meltique', base_unit: 'g', purchase_unit: 'kg', conversion: 1000, cost: 220, current_stock: 3500, min_stock: 1000, is_critical: true },
  { id: '70000000-0000-0000-0000-000000000006', name: 'Daging Ayam Fillet', base_unit: 'g', purchase_unit: 'kg', conversion: 1000, cost: 60, current_stock: 8000, min_stock: 2000, is_critical: true },
  { id: '70000000-0000-0000-0000-000000000007', name: 'Beras Ramos Super', base_unit: 'g', purchase_unit: 'kg', conversion: 1000, cost: 15, current_stock: 25000, min_stock: 5000, is_critical: true },
  { id: '70000000-0000-0000-0000-000000000008', name: 'Telur Ayam Segar', base_unit: 'pcs', purchase_unit: 'pack', conversion: 30, cost: 2000, current_stock: 150, min_stock: 40, is_critical: true },
  { id: '70000000-0000-0000-0000-000000000009', name: 'Keju Mozzarella Blok', base_unit: 'g', purchase_unit: 'kg', conversion: 1000, cost: 120, current_stock: 2500, min_stock: 800, is_critical: false },
  { id: '70000000-0000-0000-0000-000000000010', name: 'Kentang Beku Shoestring', base_unit: 'g', purchase_unit: 'kg', conversion: 1000, cost: 40, current_stock: 10000, min_stock: 2500, is_critical: false },
  { id: '70000000-0000-0000-0000-000000000011', name: 'Bumbu Sambal Matah Fresh', base_unit: 'g', purchase_unit: 'kg', conversion: 1000, cost: 70, current_stock: 1800, min_stock: 500, is_critical: false },
  { id: '70000000-0000-0000-0000-000000000012', name: 'Teh Melati Wangi', base_unit: 'g', purchase_unit: 'kg', conversion: 1000, cost: 80, current_stock: 2000, min_stock: 600, is_critical: false },
];

const INITIAL_RECIPES = [
  // Kopi Susu Gula Aren
  { product_id: '60000000-0000-0000-0000-000000000001', ingredient_id: '70000000-0000-0000-0000-000000000001', qty: 18, action: 'add' },
  { product_id: '60000000-0000-0000-0000-000000000001', ingredient_id: '70000000-0000-0000-0000-000000000002', qty: 120, action: 'add' },
  { product_id: '60000000-0000-0000-0000-000000000001', ingredient_id: '70000000-0000-0000-0000-000000000004', qty: 25, action: 'add' },

  // Nasi Goreng
  { product_id: '60000000-0000-0000-0000-000000000014', ingredient_id: '70000000-0000-0000-0000-000000000007', qty: 120, action: 'add' },
  { product_id: '60000000-0000-0000-0000-000000000014', ingredient_id: '70000000-0000-0000-0000-000000000006', qty: 50, action: 'add' },
  { product_id: '60000000-0000-0000-0000-000000000014', ingredient_id: '70000000-0000-0000-0000-000000000008', qty: 1, action: 'add' },

  // Wagyu Steak
  { product_id: '60000000-0000-0000-0000-000000000020', ingredient_id: '70000000-0000-0000-0000-000000000005', qty: 200, action: 'add' },
  { product_id: '60000000-0000-0000-0000-000000000020', ingredient_id: '70000000-0000-0000-0000-000000000010', qty: 150, action: 'add' },

  // French Fries
  { product_id: '60000000-0000-0000-0000-000000000025', ingredient_id: '70000000-0000-0000-0000-000000000010', qty: 200, action: 'add' },

  // Modifiers: Extra Shot
  { option_id: '51000000-0000-0000-0000-000000000019', ingredient_id: '70000000-0000-0000-0000-000000000001', qty: 9, action: 'add' },
  // Oat Milk pengganti fresh milk
  { option_id: '51000000-0000-0000-0000-000000000018', ingredient_id: '70000000-0000-0000-0000-000000000003', qty: 120, action: 'replace', replaces_ingredient_id: '70000000-0000-0000-0000-000000000002' },
  // Telur Mata Sapi
  { option_id: '51000000-0000-0000-0000-000000000005', ingredient_id: '70000000-0000-0000-0000-000000000008', qty: 1, action: 'add' },
  // Sambal Matah
  { option_id: '51000000-0000-0000-0000-000000000007', ingredient_id: '70000000-0000-0000-0000-000000000011', qty: 30, action: 'add' },
];

const INITIAL_SKU_MAPPINGS = [
  { platform: 'gofood', external_sku: 'GF-KOPI-AREN', product_id: '60000000-0000-0000-0000-000000000001' },
  { platform: 'gofood', external_sku: 'GF-NASGOR-SPESIAL', product_id: '60000000-0000-0000-0000-000000000014' },
  { platform: 'grabfood', external_sku: 'GRAB-KOPI-AREN', product_id: '60000000-0000-0000-0000-000000000001' },
  { platform: 'grabfood', external_sku: 'GRAB-BURGER', product_id: '60000000-0000-0000-0000-000000000021' },
  { platform: 'shopeefood', external_sku: 'SPF-KOPI-AREN', product_id: '60000000-0000-0000-0000-000000000001' },
  { platform: 'shopeefood', external_sku: 'SPF-FRIES', product_id: '60000000-0000-0000-0000-000000000025' },
];

export const usePosStore = create(
  persist(
    (set, get) => ({
      // 1. OUTLET & AUTH
      outlet: INITIAL_OUTLET,
      profiles: INITIAL_PROFILES,
      currentUser: INITIAL_PROFILES[2], // Default Rian Pratama (Kasir)
      sessionLocked: false,
      isOffline: false,

      // 2. DATA MASTER
      areas: INITIAL_AREAS,
      tables: INITIAL_TABLES,
      categories: INITIAL_CATEGORIES,
      products: INITIAL_PRODUCTS,
      modifierGroups: INITIAL_MODIFIER_GROUPS,
      modifierOptions: INITIAL_MODIFIER_OPTIONS,
      ingredients: INITIAL_INGREDIENTS,
      recipes: INITIAL_RECIPES,
      skuMappings: INITIAL_SKU_MAPPINGS,

      // 3. OPERASIONAL
      orders: [],
      bills: [],
      payments: [],
      stockMovements: [],
      shifts: [],
      cashMovements: [],
      currentShift: null, // Objek shift aktif saat ini
      deliveryOrders: [],
      purchaseOrders: [],
      auditLogs: [],
      notifications: [],
      activeTableId: null, // Meja terpilih di POS
      cartItems: [], // Keranjang aktif kasir [{ productId, qty, notes, modifiers: [] }]

      // 4. SETTING & FILTER UI
      kdsStationFilter: 'all', // 'all' | 'Bar' | 'Grill' | 'Dessert' | 'Kitchen'
      activeAreaId: '20000000-0000-0000-0000-000000000001',
      lastReceiptData: null, // Untuk modal preview struk

      // --- AKSI AUTENTIKASI ---
      loginWithPin: async (pin, userId = null) => {
        const { profiles } = get();
        const pinHash = await hashPin(pin);
        const user = userId 
          ? profiles.find((p) => p.id === userId && p.pin_hash === pinHash && p.is_active)
          : profiles.find((p) => p.pin_hash === pinHash && p.is_active);

        if (!user) {
          throw new Error('PIN tidak valid atau pengguna dinonaktifkan.');
        }

        set({ currentUser: user, sessionLocked: false });
        get().logAudit('login', 'profiles', user.id, 'Login berhasil dengan PIN');
        return user;
      },

      lockSession: () => set({ sessionLocked: true }),

      unlockSession: async (pin) => {
        const { currentUser } = get();
        if (!currentUser) return false;
        const valid = await verifyPin(pin, currentUser.pin_hash);
        if (valid) {
          set({ sessionLocked: false });
          return true;
        }
        return false;
      },

      verifyManagerPin: async (pin) => {
        const { profiles } = get();
        const pinHash = await hashPin(pin);
        const manager = profiles.find(
          (p) => (p.role === 'manager' || p.role === 'owner') && p.pin_hash === pinHash && p.is_active
        );
        return manager || null;
      },

      switchUser: (userId) => {
        const user = get().profiles.find((p) => p.id === userId);
        if (user) {
          set({ currentUser: user, sessionLocked: false });
        }
      },

      setOfflineStatus: (status) => set({ isOffline: status }),

      // --- AKSI MEJA & DENAH ---
      setActiveTable: (tableId) => set({ activeTableId: tableId }),
      setActiveArea: (areaId) => set({ activeAreaId: areaId }),

      updateTablePosition: (tableId, posX, posY) => {
        set((state) => ({
          tables: state.tables.map((t) => (t.id === tableId ? { ...t, pos_x: posX, pos_y: posY } : t)),
        }));
      },

      updateTableStatus: (tableId, status) => {
        set((state) => ({
          tables: state.tables.map((t) => (t.id === tableId ? { ...t, status } : t)),
        }));
      },

      addTable: (tableData) => {
        const newTable = {
          id: crypto.randomUUID(),
          outlet_id: get().outlet.id,
          pos_x: 60,
          pos_y: 60,
          status: 'available',
          qr_token: `token_meja_${Math.random().toString(36).substring(2, 9)}`,
          ...tableData,
        };
        set((state) => ({ tables: [...state.tables, newTable] }));
        get().logAudit('create', 'tables', newTable.id, `Tambah meja ${newTable.name}`);
        return newTable;
      },

      editTable: (tableId, data) => {
        set((state) => ({
          tables: state.tables.map((t) => (t.id === tableId ? { ...t, ...data } : t)),
        }));
        get().logAudit('update', 'tables', tableId, `Perbarui data meja`);
      },

      deleteTable: (tableId) => {
        // Cek order aktif
        const activeOrder = get().orders.find((o) => o.table_id === tableId && (o.status === 'open' || o.status === 'sent'));
        if (activeOrder) {
          throw new Error('Meja tidak bisa dihapus karena masih memiliki pesanan aktif.');
        }
        set((state) => ({ tables: state.tables.filter((t) => t.id !== tableId) }));
        get().logAudit('delete', 'tables', tableId, `Hapus meja`);
      },

      cleanTable: (tableId) => {
        set((state) => ({
          tables: state.tables.map((t) => (t.id === tableId ? { ...t, status: 'available' } : t)),
        }));
      },

      moveTable: (orderId, targetTableId) => {
        const { orders, tables } = get();
        const order = orders.find((o) => o.id === orderId);
        if (!order) throw new Error('Pesanan tidak ditemukan');
        const oldTableId = order.table_id;

        set({
          orders: orders.map((o) => (o.id === orderId ? { ...o, table_id: targetTableId } : o)),
          tables: tables.map((t) => {
            if (t.id === oldTableId) return { ...t, status: 'available' };
            if (t.id === targetTableId) return { ...t, status: 'occupied' };
            return t;
          }),
        });

        get().logAudit('move_table', 'orders', orderId, `Pindah pesanan dari meja ${oldTableId} ke ${targetTableId}`);
      },

      // --- AKSI KERANJANG KASIR ---
      addToCart: (product, modifiers = [], notes = '') => {
        set((state) => {
          const modTotal = modifiers.reduce((acc, m) => acc + (Number(m.price_delta) || 0), 0);
          const itemPrice = Number(product.price) + modTotal;
          
          const existingIndex = state.cartItems.findIndex(
            (i) => i.productId === product.id && 
                   JSON.stringify(i.modifiers) === JSON.stringify(modifiers) && 
                   i.notes === notes
          );

          if (existingIndex > -1) {
            const updated = [...state.cartItems];
            updated[existingIndex].qty += 1;
            return { cartItems: updated };
          }

          return {
            cartItems: [
              ...state.cartItems,
              {
                id: crypto.randomUUID(),
                productId: product.id,
                name: product.name,
                basePrice: product.price,
                unitPrice: itemPrice,
                qty: 1,
                notes,
                modifiers,
              },
            ],
          };
        });
      },

      updateCartQty: (itemId, delta) => {
        set((state) => {
          const updated = state.cartItems
            .map((item) => (item.id === itemId ? { ...item, qty: item.qty + delta } : item))
            .filter((item) => item.qty > 0);
          return { cartItems: updated };
        });
      },

      removeFromCart: (itemId) => {
        set((state) => ({ cartItems: state.cartItems.filter((i) => i.id !== itemId) }));
      },

      clearCart: () => set({ cartItems: [] }),

      // --- KALKULASI PAJAK, SERVICE & TOTAL ---
      calculateOrderTotals: (items, discount = 0) => {
        const { outlet } = get();
        const subtotal = items.reduce((sum, item) => sum + (Number(item.unitPrice || item.price_snapshot) * item.qty), 0);
        const discountedSubtotal = Math.max(0, subtotal - discount);
        const service = Math.round(discountedSubtotal * (outlet.service_charge_rate || 0.05));
        const tax = Math.round((discountedSubtotal + service) * (outlet.tax_rate || 0.10));
        const total = discountedSubtotal + service + tax;

        return { subtotal, discount, service, tax, total };
      },

      // --- BUAT PESANAN BARU (DINE-IN, TAKEAWAY, QR, DELIVERY) ---
      createOrder: (orderPayload) => {
        const { currentShift, outlet, currentUser, tables } = get();

        // Validasi shift kasir aktif jika bukan pesanan QR mandiri
        if (orderPayload.type !== 'qr' && !currentShift) {
          throw new Error('Shift kasir belum dibuka. Silakan buka shift terlebih dahulu.');
        }

        const items = orderPayload.items.map((item) => {
          const product = get().products.find((p) => p.id === item.productId);
          const modTotal = (item.modifiers || []).reduce((acc, m) => acc + (Number(m.price_delta) || 0), 0);
          const priceSnapshot = (Number(product?.price) || 0) + modTotal;

          return {
            id: crypto.randomUUID(),
            product_id: item.productId,
            name_snapshot: product?.name || item.name || 'Produk',
            price_snapshot: priceSnapshot,
            qty: item.qty,
            notes: item.notes || '',
            status: 'new',
            is_additional: false,
            modifiers: item.modifiers || [],
            sent_at: null,
            ready_at: null,
            served_at: null,
          };
        });

        const totals = get().calculateOrderTotals(items, orderPayload.discount || 0);
        const orderNumber = `ORD-${Date.now().toString().slice(-6)}`;

        const newOrder = {
          id: crypto.randomUUID(),
          outlet_id: outlet.id,
          order_number: orderNumber,
          table_id: orderPayload.tableId || null,
          shift_id: currentShift?.id || null,
          user_id: currentUser?.id || null,
          type: orderPayload.type || 'dine_in',
          source: orderPayload.source || 'pos',
          customer_name: orderPayload.customerName || (orderPayload.tableId ? `Meja ${tables.find(t => t.id === orderPayload.tableId)?.name || ''}` : 'Pelanggan'),
          queue_number: orderPayload.type === 'takeaway' ? (get().orders.filter(o => o.type === 'takeaway').length + 1) : null,
          status: 'open',
          items,
          subtotal: totals.subtotal,
          discount: totals.discount,
          discount_reason: orderPayload.discountReason || '',
          service: totals.service,
          tax: totals.tax,
          total: totals.total,
          stock_deducted: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          version: 1,
        };

        // Otomatis buat 1 Bill default untuk pesanan ini
        const defaultBill = {
          id: crypto.randomUUID(),
          order_id: newOrder.id,
          split_group: 1,
          subtotal: totals.subtotal,
          discount: totals.discount,
          service: totals.service,
          tax: totals.tax,
          amount: totals.total,
          status: 'pending',
          created_at: new Date().toISOString(),
        };

        set((state) => ({
          orders: [newOrder, ...state.orders],
          bills: [...state.bills, defaultBill],
          cartItems: [], // Kosongkan keranjang
          tables: orderPayload.tableId
            ? state.tables.map((t) => (t.id === orderPayload.tableId ? { ...t, status: 'occupied' } : t))
            : state.tables,
        }));

        get().logAudit('create_order', 'orders', newOrder.id, `Pesanan baru ${orderNumber} dibuat (${totals.total})`);
        return newOrder;
      },

      // --- KIRIM KE DAPUR ---
      sendOrderToKitchen: (orderId) => {
        const { orders, outlet } = get();
        const order = orders.find((o) => o.id === orderId);
        if (!order) return;

        const now = new Date().toISOString();
        const updatedItems = order.items.map((item) => ({
          ...item,
          status: item.status === 'new' ? 'preparing' : item.status,
          sent_at: item.sent_at || now,
        }));

        set((state) => ({
          orders: state.orders.map((o) =>
            o.id === orderId
              ? { ...o, status: 'sent', items: updatedItems, updated_at: now }
              : o
          ),
        }));

        // Potong stok jika trigger adalah 'on_send'
        if (outlet.stock_deduct_trigger === 'on_send' && !order.stock_deducted) {
          get().deductRecipeStock(orderId);
        }

        playKitchenChime();
        get().logAudit('send_to_kitchen', 'orders', orderId, `Pesanan dikirim ke dapur`);
      },

      // --- TAMBAH ITEM KE PESANAN YANG SUDAH BERJALAN ---
      addItemsToExistingOrder: (orderId, newItems) => {
        const { orders } = get();
        const order = orders.find((o) => o.id === orderId);
        if (!order) throw new Error('Pesanan tidak ditemukan');

        const additionalItems = newItems.map((item) => {
          const product = get().products.find((p) => p.id === item.productId);
          const modTotal = (item.modifiers || []).reduce((acc, m) => acc + (Number(m.price_delta) || 0), 0);
          const priceSnapshot = (Number(product?.price) || 0) + modTotal;

          return {
            id: crypto.randomUUID(),
            product_id: item.productId,
            name_snapshot: product?.name || item.name || 'Produk',
            price_snapshot: priceSnapshot,
            qty: item.qty,
            notes: item.notes || '',
            status: 'new',
            is_additional: true, // Penanda TAMBAHAN di KDS
            modifiers: item.modifiers || [],
            sent_at: null,
            ready_at: null,
            served_at: null,
          };
        });

        const combinedItems = [...order.items, ...additionalItems];
        const totals = get().calculateOrderTotals(combinedItems, order.discount || 0);

        set((state) => ({
          orders: state.orders.map((o) =>
            o.id === orderId
              ? {
                  ...o,
                  items: combinedItems,
                  subtotal: totals.subtotal,
                  service: totals.service,
                  tax: totals.tax,
                  total: totals.total,
                  updated_at: new Date().toISOString(),
                  version: o.version + 1,
                }
              : o
          ),
          cartItems: [],
        }));

        get().logAudit('add_items', 'orders', orderId, `Tambah item ke pesanan ${order.order_number}`);
      },

      // --- UPDATE STATUS ITEM (KDS TRANSISI: BARU -> DIPROSES -> SIAP -> DISAJIKAN) ---
      updateOrderItemStatus: (orderId, itemId, newStatus) => {
        const now = new Date().toISOString();
        let shouldPlayReady = false;

        set((state) => {
          const updatedOrders = state.orders.map((order) => {
            if (order.id !== orderId) return order;

            const updatedItems = order.items.map((item) => {
              if (item.id !== itemId) return item;

              if (newStatus === 'ready') shouldPlayReady = true;

              return {
                ...item,
                status: newStatus,
                ready_at: newStatus === 'ready' ? now : item.ready_at,
                served_at: newStatus === 'served' ? now : item.served_at,
              };
            });

            // Cek apakah semua item sudah ready/served
            const allReadyOrServed = updatedItems.every(
              (i) => i.status === 'ready' || i.status === 'served' || i.status === 'void'
            );

            return {
              ...order,
              items: updatedItems,
              status: allReadyOrServed && order.status === 'sent' ? 'ready' : order.status,
              updated_at: now,
            };
          });

          return { orders: updatedOrders };
        });

        if (shouldPlayReady) {
          playOrderReadySound();
          get().addNotification('kds_ready', 'Pesanan Siap Disajikan', `Item pada pesanan sudah siap diambil oleh pelayan.`);
        }
      },

      // --- VOID ITEM PESANAN DENGAN OTORISASI MANAJER ---
      voidOrderItem: async (orderId, itemId, managerPin, reason) => {
        const manager = await get().verifyManagerPin(managerPin);
        if (!manager) {
          throw new Error('PIN Manajer tidak valid untuk membatalkan item.');
        }

        const { orders } = get();
        const order = orders.find((o) => o.id === orderId);
        const item = order?.items.find((i) => i.id === itemId);
        if (!item) throw new Error('Item tidak ditemukan.');

        const now = new Date().toISOString();

        // Kembalikan stok jika stok sudah dipotong
        if (order.stock_deducted || item.sent_at) {
          get().reverseRecipeStock(orderId, item, manager.id, reason);
        }

        set((state) => ({
          orders: state.orders.map((o) => {
            if (o.id !== orderId) return o;
            const updatedItems = o.items.map((i) =>
              i.id === itemId
                ? { ...i, status: 'void', void_reason: reason, void_authorized_by: manager.id }
                : i
            );
            // Hitung ulang total tanpa item void
            const validItems = updatedItems.filter((i) => i.status !== 'void');
            const totals = get().calculateOrderTotals(validItems, o.discount);
            return {
              ...o,
              items: updatedItems,
              subtotal: totals.subtotal,
              service: totals.service,
              tax: totals.tax,
              total: totals.total,
              updated_at: now,
            };
          }),
        }));

        playAlertSound();
        get().logAudit('void_item', 'order_items', itemId, reason, null, null, manager.id);
      },

      // --- SPLIT BILL: BAGI RATA (EQUAL SPLIT N ORANG) ---
      splitBillEqual: (orderId, splitCount) => {
        const { orders, bills } = get();
        const order = orders.find((o) => o.id === orderId);
        if (!order) throw new Error('Pesanan tidak ditemukan');
        if (splitCount < 2) throw new Error('Split bill minimal 2 orang');

        // Batalkan bill lama yang pending
        const existingPaidBills = bills.filter((b) => b.order_id === orderId && b.status === 'paid');
        if (existingPaidBills.length > 0) {
          throw new Error('Tidak bisa split ulang jika sebagian tagihan sudah dibayar.');
        }

        const baseSubtotal = Math.floor(order.subtotal / splitCount);
        const subtotalRemainder = order.subtotal - baseSubtotal * splitCount;

        const baseDiscount = Math.floor((order.discount || 0) / splitCount);
        const discountRemainder = (order.discount || 0) - baseDiscount * splitCount;

        const baseService = Math.floor(order.service / splitCount);
        const serviceRemainder = order.service - baseService * splitCount;

        const baseTax = Math.floor(order.tax / splitCount);
        const taxRemainder = order.tax - baseTax * splitCount;

        const baseAmount = Math.floor(order.total / splitCount);
        const amountRemainder = order.total - baseAmount * splitCount;

        const newBills = [];
        for (let i = 1; i <= splitCount; i++) {
          const isLast = i === splitCount;
          newBills.push({
            id: crypto.randomUUID(),
            order_id: orderId,
            split_group: i,
            subtotal: isLast ? baseSubtotal + subtotalRemainder : baseSubtotal,
            discount: isLast ? baseDiscount + discountRemainder : baseDiscount,
            service: isLast ? baseService + serviceRemainder : baseService,
            tax: isLast ? baseTax + taxRemainder : baseTax,
            amount: isLast ? baseAmount + amountRemainder : baseAmount,
            status: 'pending',
            created_at: new Date().toISOString(),
          });
        }

        // Ganti bills untuk order ini
        set((state) => ({
          bills: [...state.bills.filter((b) => b.order_id !== orderId), ...newBills],
        }));

        get().logAudit('split_bill_equal', 'orders', orderId, `Split bill rata ${splitCount} orang`);
        return newBills;
      },

      // --- SPLIT BILL: PER ITEM (TERMASUK MEMECAH JUMLAH QTY) ---
      splitBillByItems: (orderId, groups) => {
        const { orders, bills, outlet } = get();
        const order = orders.find((o) => o.id === orderId);
        if (!order) throw new Error('Pesanan tidak ditemukan');

        // groups: [{ splitGroup: 1, items: [{ orderItemId, qty }] }]
        const validItems = order.items.filter((i) => i.status !== 'void');
        
        let allocatedSubtotalSum = 0;
        const newBills = groups.map((grp, idx) => {
          let grpSubtotal = 0;
          grp.items.forEach((it) => {
            const found = validItems.find((vi) => vi.id === it.orderItemId);
            if (found) {
              grpSubtotal += found.price_snapshot * it.qty;
            }
          });
          allocatedSubtotalSum += grpSubtotal;
          return {
            id: crypto.randomUUID(),
            order_id: orderId,
            split_group: grp.splitGroup,
            subtotal: grpSubtotal,
            items: grp.items,
          };
        });

        // Hitung proporsi diskon, service, pajak
        let totalAllocatedAmount = 0;
        const finalBills = newBills.map((b, idx) => {
          const isLast = idx === newBills.length - 1;
          const ratio = order.subtotal > 0 ? b.subtotal / order.subtotal : 1 / newBills.length;
          
          const grpDiscount = Math.round((order.discount || 0) * ratio);
          const discountedSub = Math.max(0, b.subtotal - grpDiscount);
          const grpService = Math.round(discountedSub * (outlet.service_charge_rate || 0.05));
          const grpTax = Math.round((discountedSub + grpService) * (outlet.tax_rate || 0.10));
          let grpTotal = discountedSub + grpService + grpTax;

          totalAllocatedAmount += grpTotal;

          // Penyesuaian selisih pembulatan rupiah ke tagihan terakhir (Last bill adjustment)
          if (isLast) {
            const roundingDiff = order.total - totalAllocatedAmount;
            grpTotal += roundingDiff;
          }

          return {
            ...b,
            discount: grpDiscount,
            service: grpService,
            tax: grpTax,
            amount: grpTotal,
            status: 'pending',
            created_at: new Date().toISOString(),
          };
        });

        set((state) => ({
          bills: [...state.bills.filter((b) => b.order_id !== orderId), ...finalBills],
        }));

        get().logAudit('split_bill_items', 'orders', orderId, `Split bill per item (${groups.length} sub-tagihan)`);
        return finalBills;
      },

      // --- PEMBAYARAN BILL (CASH, QRIS, CARD) ---
      payBill: (billId, paymentPayload) => {
        const { bills, orders, outlet, currentShift } = get();
        const bill = bills.find((b) => b.id === billId);
        if (!bill) throw new Error('Tagihan tidak ditemukan');
        if (bill.status === 'paid') throw new Error('Tagihan sudah dibayar');

        const order = orders.find((o) => o.id === bill.order_id);
        const changeAmount = paymentPayload.tenderedAmount 
          ? Math.max(0, paymentPayload.tenderedAmount - bill.amount)
          : 0;

        const newPayment = {
          id: crypto.randomUUID(),
          bill_id: billId,
          order_id: bill.order_id,
          method: paymentPayload.method, // 'cash', 'qris', 'card'
          amount: bill.amount,
          tendered_amount: paymentPayload.tenderedAmount || bill.amount,
          change_amount: changeAmount,
          reference: paymentPayload.reference || `REF-${Date.now().toString().slice(-8)}`,
          status: 'success',
          idempotency_key: paymentPayload.idempotencyKey || `IDEM-${Date.now()}`,
          paid_at: new Date().toISOString(),
        };

        // Update bill status
        const updatedBills = bills.map((b) => (b.id === billId ? { ...b, status: 'paid' } : b));
        
        // Cek apakah seluruh sub-tagihan order ini sudah lunas
        const allOrderBills = updatedBills.filter((b) => b.order_id === bill.order_id);
        const allPaid = allOrderBills.every((b) => b.status === 'paid');

        // Jika semua tagihan lunas: selesaikan order & ubah status meja jadi 'needs_cleaning'
        let updatedOrders = orders;
        let updatedTables = get().tables;

        if (allPaid && order) {
          updatedOrders = orders.map((o) =>
            o.id === bill.order_id ? { ...o, status: 'completed', updated_at: new Date().toISOString() } : o
          );
          if (order.table_id) {
            updatedTables = updatedTables.map((t) =>
              t.id === order.table_id ? { ...t, status: 'needs_cleaning' } : t
            );
          }
          // Potong stok jika trigger 'on_paid'
          if (outlet.stock_deduct_trigger === 'on_paid' && !order.stock_deducted) {
            get().deductRecipeStock(order.id);
          }
        }

        set({
          bills: updatedBills,
          payments: [newPayment, ...get().payments],
          orders: updatedOrders,
          tables: updatedTables,
          lastReceiptData: { order, bill, payment: newPayment },
        });

        playOrderReadySound();
        get().logAudit('payment', 'bills', billId, `Pembayaran ${paymentPayload.method} sebesar ${bill.amount} lunas`);
        return newPayment;
      },

      // --- PEMOTONGAN STOK RESEP & MODIFIER OTOMATIS ---
      deductRecipeStock: (orderId) => {
        const { orders, recipes, ingredients, outlet } = get();
        const order = orders.find((o) => o.id === orderId);
        if (!order || order.stock_deducted) return;

        const ingredientDeductions = {};

        // Hitung kebutuhan bahan dari tiap item
        order.items.forEach((item) => {
          if (item.status === 'void') return;

          // 1. Resep dasar produk
          const productRecipes = recipes.filter((r) => r.product_id === item.product_id);
          productRecipes.forEach((pr) => {
            ingredientDeductions[pr.ingredient_id] = (ingredientDeductions[pr.ingredient_id] || 0) + (pr.qty * item.qty);
          });

          // 2. Resep dari modifier opsi terpilih
          (item.modifiers || []).forEach((mod) => {
            const modRecipes = recipes.filter((r) => r.option_id === mod.option_id);
            modRecipes.forEach((mr) => {
              if (mr.action === 'add') {
                ingredientDeductions[mr.ingredient_id] = (ingredientDeductions[mr.ingredient_id] || 0) + (mr.qty * item.qty);
              } else if (mr.action === 'replace' && mr.replaces_ingredient_id) {
                // Kurangi konsumsi bahan pengganti, batalkan konsumsi bahan lama
                ingredientDeductions[mr.ingredient_id] = (ingredientDeductions[mr.ingredient_id] || 0) + (mr.qty * item.qty);
                ingredientDeductions[mr.replaces_ingredient_id] = (ingredientDeductions[mr.replaces_ingredient_id] || 0) - (mr.qty * item.qty);
              }
            });
          });
        });

        // Terapkan pemotongan stok & catat stock_movements
        const newMovements = [];
        let updatedIngredients = [...ingredients];

        for (const [ingredientId, deductQty] of Object.entries(ingredientDeductions)) {
          if (deductQty === 0) continue;
          
          updatedIngredients = updatedIngredients.map((ing) => {
            if (ing.id !== ingredientId) return ing;
            const newStock = ing.current_stock - deductQty;

            newMovements.push({
              id: crypto.randomUUID(),
              ingredient_id: ingredientId,
              type: 'sale',
              qty: -deductQty,
              balance_after: newStock,
              ref_id: orderId,
              note: `Penjualan pesanan ${order.order_number}`,
              created_at: new Date().toISOString(),
            });

            // Periksa low stock alert
            if (newStock <= ing.min_stock) {
              get().addNotification(
                'low_stock',
                'Peringatan Stok Menipis',
                `Bahan baku "${ing.name}" tersisa ${newStock} ${ing.base_unit} (di bawah batas ${ing.min_stock} ${ing.base_unit}).`,
                '/inventory'
              );
            }

            return { ...ing, current_stock: newStock };
          });
        }

        // Bahan krusial dengan stok <= 0 otomatis menandai produk terkait sebagai Tidak Tersedia (Habis)
        let updatedProducts = [...get().products];
        updatedIngredients.forEach((ing) => {
          if (ing.is_critical && ing.current_stock <= 0) {
            const relatedProductIds = recipes.filter((r) => r.ingredient_id === ing.id).map((r) => r.product_id);
            updatedProducts = updatedProducts.map((p) =>
              relatedProductIds.includes(p.id) ? { ...p, is_available: false } : p
            );
          }
        });

        set((state) => ({
          ingredients: updatedIngredients,
          products: updatedProducts,
          stockMovements: [...newMovements, ...state.stockMovements],
          orders: state.orders.map((o) => (o.id === orderId ? { ...o, stock_deducted: true } : o)),
        }));
      },

      // --- PENGEMBALIAN STOK SAAT ITEM DI-VOID (REVERSAL) ---
      reverseRecipeStock: (orderId, item, managerId, reason) => {
        const { recipes, ingredients } = get();
        const productRecipes = recipes.filter((r) => r.product_id === item.product_id);
        const newMovements = [];
        let updatedIngredients = [...ingredients];

        productRecipes.forEach((pr) => {
          const restoreQty = pr.qty * item.qty;
          updatedIngredients = updatedIngredients.map((ing) => {
            if (ing.id !== pr.ingredient_id) return ing;
            const newStock = ing.current_stock + restoreQty;
            newMovements.push({
              id: crypto.randomUUID(),
              ingredient_id: ing.id,
              type: 'reversal',
              qty: restoreQty,
              balance_after: newStock,
              ref_id: orderId,
              user_id: managerId,
              note: `Void reversal: ${reason}`,
              created_at: new Date().toISOString(),
            });
            return { ...ing, current_stock: newStock };
          });
        });

        set((state) => ({
          ingredients: updatedIngredients,
          stockMovements: [...newMovements, ...state.stockMovements],
        }));
      },

      // --- MANAJEMEN SHIFT KASIR ---
      openShift: (openingCash, notes = '') => {
        const { currentUser, currentShift, outlet } = get();
        if (currentShift) {
          throw new Error('Ada shift kasir yang sedang berjalan. Tutup shift lama terlebih dahulu.');
        }

        const newShift = {
          id: crypto.randomUUID(),
          outlet_id: outlet.id,
          user_id: currentUser.id,
          opened_at: new Date().toISOString(),
          closed_at: null,
          opening_cash: Number(openingCash) || 0,
          expected_cash: Number(openingCash) || 0,
          actual_cash: 0,
          variance: 0,
          status: 'open',
          notes,
        };

        set((state) => ({
          currentShift: newShift,
          shifts: [newShift, ...state.shifts],
        }));

        get().logAudit('open_shift', 'shifts', newShift.id, `Buka shift dengan modal awal ${openingCash}`);
        return newShift;
      },

      addCashMovement: (type, amount, reason) => {
        const { currentShift, currentUser } = get();
        if (!currentShift) throw new Error('Tidak ada shift aktif.');

        const movement = {
          id: crypto.randomUUID(),
          shift_id: currentShift.id,
          type, // 'in' | 'out'
          amount: Number(amount),
          reason,
          user_id: currentUser.id,
          created_at: new Date().toISOString(),
        };

        set((state) => ({
          cashMovements: [movement, ...state.cashMovements],
        }));

        get().logAudit('cash_movement', 'shifts', currentShift.id, `Kas ${type} sebesar ${amount}: ${reason}`);
      },

      closeShift: async (actualCash, notes = '', managerPin = null) => {
        const { currentShift, payments, cashMovements, currentUser } = get();
        if (!currentShift) throw new Error('Tidak ada shift aktif untuk ditutup.');

        // Hitung total uang tunai yang diterima selama shift ini
        const shiftPayments = payments.filter((p) => p.method === 'cash' && new Date(p.paid_at) >= new Date(currentShift.opened_at));
        const totalCashSales = shiftPayments.reduce((sum, p) => sum + p.amount, 0);

        // Kas Masuk & Kas Keluar
        const shiftCashMovements = cashMovements.filter((m) => m.shift_id === currentShift.id);
        const cashIn = shiftCashMovements.filter((m) => m.type === 'in').reduce((s, m) => s + m.amount, 0);
        const cashOut = shiftCashMovements.filter((m) => m.type === 'out').reduce((s, m) => s + m.amount, 0);

        const expectedCash = currentShift.opening_cash + totalCashSales + cashIn - cashOut;
        const variance = Number(actualCash) - expectedCash;

        let approverId = currentUser.id;
        if (Math.abs(variance) > 0 && managerPin) {
          const manager = await get().verifyManagerPin(managerPin);
          if (manager) approverId = manager.id;
        }

        const closedShift = {
          ...currentShift,
          closed_at: new Date().toISOString(),
          expected_cash: expectedCash,
          actual_cash: Number(actualCash),
          variance,
          status: 'closed',
          approved_by: approverId,
          notes,
        };

        set((state) => ({
          currentShift: null, // Reset shift aktif
          shifts: state.shifts.map((s) => (s.id === currentShift.id ? closedShift : s)),
        }));

        get().logAudit('close_shift', 'shifts', currentShift.id, `Tutup shift. Fisik: ${actualCash}, Sistem: ${expectedCash}, Selisih: ${variance}`);
        return closedShift;
      },

      // --- INTEGRASI PESANAN ONLINE DELIVERY (MOCK SIMULATOR) ---
      simulateDeliveryOrder: (platform = 'gofood') => {
        const { products, skuMappings, outlet } = get();
        // Ambil produk acak
        const randomProduct = products[0] || INITIAL_PRODUCTS[0];
        const randomProduct2 = products[13] || INITIAL_PRODUCTS[13]; // Nasgor

        const deliveryId = `DEL-${Date.now().toString().slice(-6)}`;
        const items = [
          {
            id: crypto.randomUUID(),
            product_id: randomProduct.id,
            name_snapshot: randomProduct.name,
            price_snapshot: randomProduct.price,
            qty: 2,
            notes: 'Extra sedotan',
            status: 'preparing',
            is_additional: false,
            modifiers: [],
            sent_at: new Date().toISOString(),
          },
          {
            id: crypto.randomUUID(),
            product_id: randomProduct2.id,
            name_snapshot: randomProduct2.name,
            price_snapshot: randomProduct2.price,
            qty: 1,
            notes: 'Pedas sedang',
            status: 'preparing',
            is_additional: false,
            modifiers: [],
            sent_at: new Date().toISOString(),
          },
        ];

        const totals = get().calculateOrderTotals(items, 0);

        const newOrder = {
          id: crypto.randomUUID(),
          outlet_id: outlet.id,
          order_number: `ORD-${platform.toUpperCase()}-${Date.now().toString().slice(-4)}`,
          table_id: null,
          shift_id: get().currentShift?.id || null,
          type: 'delivery',
          source: platform,
          customer_name: `Pelanggan ${platform.toUpperCase()} (${deliveryId})`,
          status: 'sent', // Masuk langsung ke KDS
          items,
          subtotal: totals.subtotal,
          discount: 0,
          service: 0,
          tax: totals.tax,
          total: totals.total,
          stock_deducted: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          version: 1,
        };

        const deliveryOrder = {
          id: crypto.randomUUID(),
          order_id: newOrder.id,
          platform,
          external_id: deliveryId,
          commission_rate: 0.20,
          commission_amount: totals.total * 0.20,
          driver_name: 'Driver Ojol Simulasi',
          driver_phone: '0812-3456-7890',
          status: 'accepted',
          raw_payload: { simulation: true, time: new Date().toISOString() },
          created_at: new Date().toISOString(),
        };

        set((state) => ({
          orders: [newOrder, ...state.orders],
          deliveryOrders: [deliveryOrder, ...state.deliveryOrders],
        }));

        playKitchenChime();
        get().addNotification(
          'delivery_incoming',
          `Pesanan Baru ${platform.toUpperCase()}`,
          `Pesanan ${deliveryId} senilai ${totals.total} telah diterima dan masuk ke KDS.`,
          '/delivery'
        );

        get().logAudit('delivery_order', 'delivery_orders', deliveryOrder.id, `Pesanan masuk dari platform ${platform}`);
        return { order: newOrder, deliveryOrder };
      },

      updateDeliveryStatus: (deliveryId, status) => {
        set((state) => ({
          deliveryOrders: state.deliveryOrders.map((d) => (d.id === deliveryId ? { ...d, status } : d)),
        }));
      },

      acceptDeliveryOrder: (deliveryId) => {
        const { deliveryOrders, orders } = get();
        const del = deliveryOrders.find((d) => d.id === deliveryId);
        if (!del) return;

        set((state) => ({
          deliveryOrders: state.deliveryOrders.map((d) =>
            d.id === deliveryId ? { ...d, status: 'accepted' } : d
          ),
          orders: state.orders.map((o) =>
            o.id === del.order_id
              ? {
                  ...o,
                  status: 'sent',
                  items: o.items.map((i) => ({ ...i, status: 'preparing' })),
                }
              : o
          ),
        }));

        playKitchenChime();
        get().logAudit('accept_delivery', 'delivery_orders', deliveryId, `Pesanan online ${del.external_id} diterima`);
      },

      rejectDeliveryOrder: (deliveryId, reason = 'Stok habis / Sibuk') => {
        const { deliveryOrders } = get();
        const del = deliveryOrders.find((d) => d.id === deliveryId);
        if (!del) return;

        set((state) => ({
          deliveryOrders: state.deliveryOrders.map((d) =>
            d.id === deliveryId ? { ...d, status: 'rejected', reject_reason: reason } : d
          ),
          orders: state.orders.map((o) =>
            o.id === del.order_id ? { ...o, status: 'cancelled' } : o
          ),
        }));

        get().logAudit('reject_delivery', 'delivery_orders', deliveryId, `Pesanan online ${del.external_id} ditolak: ${reason}`);
      },

      addSkuMapping: (mapping) => {
        set((state) => ({
          skuMappings: [...state.skuMappings, mapping],
        }));
        get().logAudit('add_sku_mapping', 'sku_mappings', mapping.external_sku, `Tambah mapping SKU ${mapping.external_sku}`);
      },

      deleteSkuMapping: (platform, externalSku) => {
        set((state) => ({
          skuMappings: state.skuMappings.filter(
            (m) => !(m.platform === platform && m.external_sku === externalSku)
          ),
        }));
        get().logAudit('delete_sku_mapping', 'sku_mappings', externalSku, `Hapus mapping SKU ${externalSku}`);
      },

      // --- INVENTARIS & PEMBELIAN (PURCHASING) ---
      adjustStock: (ingredientId, newQty, reason) => {
        const { ingredients, currentUser } = get();
        let diff = 0;
        const updated = ingredients.map((ing) => {
          if (ing.id !== ingredientId) return ing;
          diff = newQty - ing.current_stock;
          return { ...ing, current_stock: newQty };
        });

        const movement = {
          id: crypto.randomUUID(),
          ingredient_id: ingredientId,
          type: 'adjust',
          qty: diff,
          balance_after: newQty,
          user_id: currentUser?.id,
          note: `Penyesuaian manual: ${reason}`,
          created_at: new Date().toISOString(),
        };

        set((state) => ({
          ingredients: updated,
          stockMovements: [movement, ...state.stockMovements],
        }));

        get().logAudit('adjust_stock', 'ingredients', ingredientId, `Ubah stok ke ${newQty} (${reason})`);
      },

      createPurchaseOrder: (poPayload) => {
        const po = {
          id: crypto.randomUUID(),
          outlet_id: get().outlet.id,
          po_number: `PO-${Date.now().toString().slice(-6)}`,
          supplier_name: poPayload.supplierName || 'Pemasok Bahan',
          status: 'draft',
          total_cost: poPayload.totalCost || 0,
          items: poPayload.items || [],
          created_at: new Date().toISOString(),
        };

        set((state) => ({ purchaseOrders: [po, ...state.purchaseOrders] }));
        get().logAudit('create_po', 'purchase_orders', po.id, `Draft PO ${po.po_number} dibuat`);
        return po;
      },

      receivePurchaseOrder: (poId) => {
        const { purchaseOrders, ingredients } = get();
        const po = purchaseOrders.find((p) => p.id === poId);
        if (!po || po.status === 'received') return;

        let updatedIngredients = [...ingredients];
        const newMovements = [];

        po.items.forEach((item) => {
          const ing = updatedIngredients.find((i) => i.id === item.ingredient_id);
          if (ing) {
            const addedStock = item.order_qty * (ing.conversion || 1000);
            const newStock = ing.current_stock + addedStock;
            updatedIngredients = updatedIngredients.map((i) => (i.id === ing.id ? { ...i, current_stock: newStock } : i));
            newMovements.push({
              id: crypto.randomUUID(),
              ingredient_id: ing.id,
              type: 'purchase',
              qty: addedStock,
              balance_after: newStock,
              ref_id: poId,
              note: `Penerimaan PO ${po.po_number}`,
              created_at: new Date().toISOString(),
            });
          }
        });

        set((state) => ({
          ingredients: updatedIngredients,
          stockMovements: [...newMovements, ...state.stockMovements],
          purchaseOrders: state.purchaseOrders.map((p) => (p.id === poId ? { ...p, status: 'received' } : p)),
        }));

        get().logAudit('receive_po', 'purchase_orders', poId, `Penerimaan stok PO ${po.po_number}`);
      },

      // --- MASTER DATA CRUD (PRODUK, KATEGORI, MODIFIER) ---
      toggleProductAvailability: (productId) => {
        set((state) => ({
          products: state.products.map((p) => (p.id === productId ? { ...p, is_available: !p.is_available } : p)),
        }));
      },

      toggleProductFavorite: (productId) => {
        set((state) => ({
          products: state.products.map((p) => (p.id === productId ? { ...p, is_favorite: !p.is_favorite } : p)),
        }));
      },

      createProduct: (data) => {
        const newProduct = {
          id: crypto.randomUUID(),
          outlet_id: get().outlet.id,
          is_available: true,
          is_favorite: false,
          image_url: '/menu/default.jpg',
          modifier_group_ids: [],
          ...data,
        };
        set((state) => ({ products: [...state.products, newProduct] }));
        get().logAudit('create', 'products', newProduct.id, `Tambah produk ${newProduct.name}`);
        return newProduct;
      },

      updateProduct: (productId, data) => {
        set((state) => ({
          products: state.products.map((p) => (p.id === productId ? { ...p, ...data } : p)),
        }));
        get().logAudit('update', 'products', productId, `Perbarui produk`);
      },

      createCategory: (data) => {
        const newCategory = {
          id: crypto.randomUUID(),
          outlet_id: get().outlet.id,
          sort_order: get().categories.length + 1,
          ...data,
        };
        set((state) => ({ categories: [...state.categories, newCategory] }));
        return newCategory;
      },

      updateCategory: (categoryId, data) => {
        set((state) => ({
          categories: state.categories.map((c) => (c.id === categoryId ? { ...c, ...data } : c)),
        }));
      },

      createModifierGroup: (data) => {
        const newGroup = {
          id: crypto.randomUUID(),
          outlet_id: get().outlet.id,
          ...data,
        };
        set((state) => ({ modifierGroups: [...state.modifierGroups, newGroup] }));
        return newGroup;
      },

      createModifierOption: (data) => {
        const newOption = {
          id: crypto.randomUUID(),
          ...data,
        };
        set((state) => ({ modifierOptions: [...state.modifierOptions, newOption] }));
        return newOption;
      },

      // --- AUDIT LOG & NOTIFIKASI ---
      logAudit: (action, entity, entityId, reason = '', before = null, after = null, approvedBy = null) => {
        const { currentUser, outlet } = get();
        const entry = {
          id: crypto.randomUUID(),
          outlet_id: outlet.id,
          user_id: currentUser?.id,
          user_name: currentUser?.name || 'Sistem',
          action,
          entity,
          entity_id: entityId,
          reason,
          before_state: before,
          after_state: after,
          approved_by: approvedBy,
          created_at: new Date().toISOString(),
        };
        set((state) => ({ auditLogs: [entry, ...state.auditLogs] }));
      },

      addNotification: (type, title, message, link = '') => {
        const notif = {
          id: crypto.randomUUID(),
          type,
          title,
          message,
          link,
          is_read: false,
          created_at: new Date().toISOString(),
        };
        set((state) => ({ notifications: [notif, ...state.notifications] }));
      },

      markNotificationRead: (id) => {
        set((state) => ({
          notifications: state.notifications.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
        }));
      },

      setKdsFilter: (filter) => set({ kdsStationFilter: filter }),
    }),
    {
      name: 'pos-fb-storage',
      partialize: (state) => ({
        outlet: state.outlet,
        currentUser: state.currentUser,
        areas: state.areas,
        tables: state.tables,
        categories: state.categories,
        products: state.products,
        modifierGroups: state.modifierGroups,
        modifierOptions: state.modifierOptions,
        ingredients: state.ingredients,
        recipes: state.recipes,
        orders: state.orders,
        bills: state.bills,
        payments: state.payments,
        currentShift: state.currentShift,
        shifts: state.shifts,
        cashMovements: state.cashMovements,
        deliveryOrders: state.deliveryOrders,
        skuMappings: state.skuMappings,
        purchaseOrders: state.purchaseOrders,
        auditLogs: state.auditLogs,
      }),
    }
  )
);
