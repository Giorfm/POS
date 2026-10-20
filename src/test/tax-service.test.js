/**
 * @file src/test/tax-service.test.js
 * Unit Test: Perhitungan Pajak Restoran (PB1 10%) & Service Charge (5%)
 * Sesuai regulasi perpajakan daerah F&B Indonesia (Pajak Barang & Jasa Tertentu - PBJT/PB1).
 */

import { describe, it, expect } from 'vitest';

/**
 * Logika standar kalkulasi total pesanan F&B
 * @param {Array<{ price_snapshot: number, qty: number, modifiers?: Array<{ price_delta: number }> }>} items
 * @param {number} discountPercent
 * @param {number} taxRate
 * @param {number} serviceRate
 */
function calculateOrderFinancials(items, discountPercent = 0, taxRate = 0.10, serviceRate = 0.05) {
  const subtotal = items.reduce((acc, item) => {
    const modTotal = (item.modifiers || []).reduce((mAcc, m) => mAcc + (Number(m.price_delta) || 0), 0);
    const unitPrice = item.price_snapshot + modTotal;
    return acc + unitPrice * item.qty;
  }, 0);

  const discountAmount = Math.round((subtotal * discountPercent) / 100);
  const discountedSubtotal = Math.max(0, subtotal - discountAmount);

  // Service charge dihitung dari subtotal setelah diskon
  const service = Math.round(discountedSubtotal * serviceRate);

  // Pajak PB1 (10%) dihitung dari DPP (Dasar Pengenaan Pajak) = subtotal + service charge
  const tax = Math.round((discountedSubtotal + service) * taxRate);

  const total = discountedSubtotal + service + tax;

  return {
    subtotal,
    discountAmount,
    discountedSubtotal,
    service,
    tax,
    total,
  };
}

describe('Kalkulasi Finansial Pajak PB1 & Service Charge', () => {
  it('harus menghitung service charge 5% dan pajak PB1 10% dengan tepat tanpa diskon', () => {
    const items = [
      { price_snapshot: 50000, qty: 2 }, // 100.000
    ];

    const result = calculateOrderFinancials(items, 0, 0.10, 0.05);

    expect(result.subtotal).toBe(100000);
    expect(result.discountAmount).toBe(0);
    expect(result.discountedSubtotal).toBe(100000);

    // Service 5% dari 100.000 = 5.000
    expect(result.service).toBe(5000);

    // Pajak PB1 10% dari (100.000 + 5.000) = 10.500
    expect(result.tax).toBe(10500);

    // Total = 100.000 + 5.000 + 10.500 = 115.500
    expect(result.total).toBe(115500);
  });

  it('harus menyertakan modifier tambahan harga ke dalam subtotal', () => {
    const items = [
      {
        price_snapshot: 24000,
        qty: 1,
        modifiers: [
          { price_delta: 6000 }, // Large cup
          { price_delta: 8000 }, // Oat milk
        ],
      },
    ];

    const result = calculateOrderFinancials(items, 0, 0.10, 0.05);

    // Harga unit = 24.000 + 6.000 + 8.000 = 38.000
    expect(result.subtotal).toBe(38000);
    expect(result.service).toBe(Math.round(38000 * 0.05)); // 1.900
    expect(result.tax).toBe(Math.round((38000 + 1900) * 0.10)); // 3.990
    expect(result.total).toBe(38000 + 1900 + 3990); // 43.890
  });

  it('harus memperhitungkan diskon sebelum pengenaan service charge dan pajak', () => {
    const items = [
      { price_snapshot: 200000, qty: 1 },
    ];

    // Diskon 20%
    const result = calculateOrderFinancials(items, 20, 0.10, 0.05);

    expect(result.subtotal).toBe(200000);
    expect(result.discountAmount).toBe(40000);
    expect(result.discountedSubtotal).toBe(160000);

    // Service 5% dari 160.000 = 8.000
    expect(result.service).toBe(8000);

    // Pajak 10% dari (160.000 + 8.000) = 16.800
    expect(result.tax).toBe(16800);

    // Grand Total = 160.000 + 8.000 + 16.800 = 184.800
    expect(result.total).toBe(184800);
  });

  it('harus menangani pesanan kosong atau subtotal 0 dengan aman', () => {
    const result = calculateOrderFinancials([], 0, 0.10, 0.05);

    expect(result.subtotal).toBe(0);
    expect(result.service).toBe(0);
    expect(result.tax).toBe(0);
    expect(result.total).toBe(0);
  });
});
