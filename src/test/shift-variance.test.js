/**
 * @file src/test/shift-variance.test.js
 * Unit Test: Perhitungan Selisih Kas Shift (Variance) & Otorisasi Penutupan Laci Kas
 */

import { describe, it, expect } from 'vitest';

/**
 * Kalkulasi keuangan shift kasir saat penutupan
 * @param {number} openingCash
 * @param {Array<{ method: string, amount: number }>} payments
 * @param {Array<{ type: 'in' | 'out', amount: number }>} cashMovements
 * @param {number} actualCashCounted
 */
function calculateShiftClose(openingCash, payments, cashMovements, actualCashCounted) {
  // Hanya pembayaran tunai (cash) yang masuk ke laci fisik kasir
  const totalCashSales = payments
    .filter((p) => p.method === 'cash')
    .reduce((sum, p) => sum + p.amount, 0);

  const totalNonCashSales = payments
    .filter((p) => p.method !== 'cash')
    .reduce((sum, p) => sum + p.amount, 0);

  const pettyCashIn = cashMovements
    .filter((m) => m.type === 'in')
    .reduce((sum, m) => sum + m.amount, 0);

  const pettyCashOut = cashMovements
    .filter((m) => m.type === 'out')
    .reduce((sum, m) => sum + m.amount, 0);

  const expectedCash = openingCash + totalCashSales + pettyCashIn - pettyCashOut;
  const variance = actualCashCounted - expectedCash;

  const requiresManagerApproval = variance !== 0;

  return {
    openingCash,
    totalCashSales,
    totalNonCashSales,
    pettyCashIn,
    pettyCashOut,
    expectedCash,
    actualCash: actualCashCounted,
    variance,
    requiresManagerApproval,
    nextShiftOpeningCash: actualCashCounted,
  };
}

describe('Manajemen Shift Kasir & Perhitungan Variance', () => {
  it('harus menghitung expected cash dan variance 0 ketika kas fisik sesuai sempurna', () => {
    const openingCash = 500000;
    const payments = [
      { method: 'cash', amount: 150000 },
      { method: 'cash', amount: 200000 },
      { method: 'qris', amount: 300000 }, // Non-tunai tidak masuk laci kas fisik
    ];
    const cashMovements = [
      { type: 'in', amount: 50000 }, // Tambah modal receh
      { type: 'out', amount: 25000 }, // Beli es batu darurat
    ];

    // Total tunai = 500.000 + 350.000 + 50.000 - 25.000 = 875.000
    const actualCashCounted = 875000;

    const result = calculateShiftClose(openingCash, payments, cashMovements, actualCashCounted);

    expect(result.totalCashSales).toBe(350000);
    expect(result.totalNonCashSales).toBe(300000);
    expect(result.expectedCash).toBe(875000);
    expect(result.variance).toBe(0);
    expect(result.requiresManagerApproval).toBe(false);
    expect(result.nextShiftOpeningCash).toBe(875000);
  });

  it('harus menghitung selisih negatif (shortage) dan mewajibkan otorisasi manajer', () => {
    const openingCash = 500000;
    const payments = [{ method: 'cash', amount: 200000 }];
    const cashMovements = [];

    // Expected = 700.000, tapi fisik hanya 680.000 (kurang 20.000)
    const actualCashCounted = 680000;

    const result = calculateShiftClose(openingCash, payments, cashMovements, actualCashCounted);

    expect(result.expectedCash).toBe(700000);
    expect(result.variance).toBe(-20000);
    expect(result.requiresManagerApproval).toBe(true);
  });

  it('harus menghitung selisih positif (overage) dan mewajibkan otorisasi manajer', () => {
    const openingCash = 500000;
    const payments = [{ method: 'cash', amount: 100000 }];
    const cashMovements = [];

    // Expected = 600.000, fisik 610.000 (lebih 10.000 karena tip atau pembulatan)
    const actualCashCounted = 610000;

    const result = calculateShiftClose(openingCash, payments, cashMovements, actualCashCounted);

    expect(result.expectedCash).toBe(600000);
    expect(result.variance).toBe(10000);
    expect(result.requiresManagerApproval).toBe(true);
  });
});
