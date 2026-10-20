/**
 * @file validators.js
 * Skema validasi runtime menggunakan Zod untuk semua form, mutasi data, dan API routes
 */

import { z } from 'zod';

// 1. AUTH & PIN
export const pinSchema = z.string().regex(/^\d{4,6}$/, 'PIN harus berupa 4 sampai 6 digit angka');

export const userLoginSchema = z.object({
  userId: z.string().uuid('ID pengguna tidak valid').optional(),
  pin: pinSchema,
});

export const managerAuthSchema = z.object({
  managerPin: pinSchema,
  reason: z.string().min(3, 'Alasan otorisasi minimal 3 karakter'),
});

// 2. ORDER & ITEMS
export const orderItemModifierSchema = z.object({
  optionId: z.string().uuid('ID opsi tidak valid'),
  nameSnapshot: z.string().min(1, 'Nama modifier wajib diisi'),
  priceDelta: z.number().default(0),
});

export const createOrderItemSchema = z.object({
  productId: z.string().uuid('ID produk tidak valid'),
  qty: z.number().int().min(1, 'Jumlah pesanan minimal 1'),
  notes: z.string().optional().default(''),
  modifiers: z.array(orderItemModifierSchema).optional().default([]),
});

export const createOrderSchema = z.object({
  outletId: z.string().uuid().optional(),
  tableId: z.string().uuid().nullable().optional(),
  shiftId: z.string().uuid().nullable().optional(),
  type: z.enum(['dine_in', 'takeaway', 'qr', 'delivery']),
  source: z.enum(['pos', 'qr', 'gofood', 'grabfood', 'shopeefood']).default('pos'),
  customerName: z.string().optional().default('Tamu'),
  notes: z.string().optional().default(''),
  items: z.array(createOrderItemSchema).min(1, 'Pesanan harus berisi minimal 1 item'),
});

// 3. PEMBAYARAN & SPLIT BILL
export const paymentSchema = z.object({
  billId: z.string().uuid('ID bill wajib diisi'),
  method: z.enum(['cash', 'qris', 'card']),
  amount: z.number().min(1, 'Nominal bayar tidak boleh 0'),
  tenderedAmount: z.number().optional(),
  reference: z.string().optional(),
  idempotencyKey: z.string().optional(),
});

export const splitEqualSchema = z.object({
  orderId: z.string().uuid(),
  splitCount: z.number().int().min(2, 'Minimal 2 tagihan').max(20, 'Maksimal 20 tagihan'),
});

export const splitByItemSchema = z.object({
  orderId: z.string().uuid(),
  groups: z.array(
    z.object({
      splitGroup: z.number().int().min(1),
      items: z.array(
        z.object({
          orderItemId: z.string().uuid(),
          qty: z.number().int().min(1),
        })
      ),
    })
  ).min(2, 'Minimal bagi menjadi 2 grup tagihan'),
});

// 4. SHIFTS & KAS
export const openShiftSchema = z.object({
  openingCash: z.number().min(0, 'Modal awal kas tidak boleh negatif'),
  notes: z.string().optional().default(''),
});

export const cashMovementSchema = z.object({
  shiftId: z.string().uuid(),
  type: z.enum(['in', 'out']),
  amount: z.number().min(500, 'Nominal kas minimal Rp500'),
  reason: z.string().min(3, 'Alasan wajib diisi minimal 3 karakter'),
});

export const closeShiftSchema = z.object({
  shiftId: z.string().uuid(),
  actualCash: z.number().min(0, 'Kas fisik aktual tidak boleh negatif'),
  notes: z.string().optional().default(''),
  managerPin: pinSchema.optional(),
});

// 5. INGREDIENTS & RECIPES
export const ingredientSchema = z.object({
  name: z.string().min(2, 'Nama bahan minimal 2 karakter'),
  baseUnit: z.string().min(1, 'Satuan dasar wajib diisi (misal: g, ml, pcs)'),
  purchaseUnit: z.string().min(1, 'Satuan beli wajib diisi (misal: kg, liter)'),
  conversion: z.number().min(0.001, 'Faktor konversi harus lebih dari 0'),
  cost: z.number().min(0, 'Harga beli tidak boleh negatif'),
  currentStock: z.number().default(0),
  minStock: z.number().min(0, 'Stok minimum tidak boleh negatif'),
  isCritical: z.boolean().default(false),
});

export const recipeItemSchema = z.object({
  productId: z.string().uuid().optional(),
  optionId: z.string().uuid().optional(),
  ingredientId: z.string().uuid('Pilih bahan baku'),
  qty: z.number().min(0.001, 'Kuantitas bahan harus lebih dari 0'),
  action: z.enum(['add', 'replace']).default('add'),
  replacesIngredientId: z.string().uuid().optional(),
  sizeVariant: z.string().optional(),
});

// 6. PRODUK & MODIFIER
export const productSchema = z.object({
  categoryId: z.string().uuid('Pilih kategori'),
  name: z.string().min(2, 'Nama produk minimal 2 karakter'),
  description: z.string().optional().default(''),
  price: z.number().min(0, 'Harga tidak boleh negatif'),
  imageUrl: z.string().optional().default(''),
  isAvailable: z.boolean().default(true),
  isFavorite: z.boolean().default(false),
});

export const modifierGroupSchema = z.object({
  name: z.string().min(2, 'Nama grup modifier minimal 2 karakter'),
  isRequired: z.boolean().default(false),
  minSelect: z.number().int().min(0).default(0),
  maxSelect: z.number().int().min(1).default(1),
});

export const modifierOptionSchema = z.object({
  groupId: z.string().uuid(),
  name: z.string().min(1, 'Nama opsi modifier wajib diisi'),
  priceDelta: z.number().default(0),
  isDefault: z.boolean().default(false),
});

// 7. MEJA & DENAH
export const tableSchema = z.object({
  areaId: z.string().uuid('Pilih area/lantai meja'),
  name: z.string().min(1, 'Nomor/nama meja wajib diisi'),
  capacity: z.number().int().min(1, 'Kapasitas minimal 1 orang'),
  shape: z.enum(['square', 'round', 'rectangle']).default('square'),
  posX: z.number().int().default(50),
  posY: z.number().int().default(50),
});
