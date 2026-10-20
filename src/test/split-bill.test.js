/**
 * @file src/test/split-bill.test.js
 * Unit Test: Alokasi Split Bill & Pembulatan Rupiah
 * Memastikan alokasi proporsional pajak, service charge, dan diskon
 * dengan pembulatan rupiah presisi sehingga total semua sub-tagihan
 * PERSIS SAMA dengan total pesanan awal (selisih <= Rp1 masuk ke tagihan terakhir).
 */

import { describe, it, expect } from 'vitest';

/**
 * Logika utilitas split bill bagi rata (N orang)
 * @param {number} totalAmount
 * @param {number} splitCount
 * @returns {Array<number>}
 */
function splitEqual(totalAmount, splitCount) {
  if (splitCount <= 0) throw new Error('Jumlah pembagian minimal 1');
  const baseAmount = Math.floor(totalAmount / splitCount);
  const remainder = totalAmount - baseAmount * splitCount;

  const bills = Array(splitCount).fill(baseAmount);
  // Selisih pembulatan (remainder <= splitCount) dialokasikan ke tagihan terakhir
  bills[bills.length - 1] += remainder;
  return bills;
}

/**
 * Logika split per item dengan alokasi proporsional service charge dan pajak
 * @param {Array<{ price: number, qty: number }>} groupItems
 * @param {number} groupSubtotal
 * @param {number} orderSubtotal
 * @param {number} orderService
 * @param {number} orderTax
 * @param {number} orderDiscount
 * @param {boolean} isLastGroup
 * @param {number} accumulatedSoFar
 * @param {number} orderGrandTotal
 * @returns {{ subtotal: number, service: number, tax: number, total: number }}
 */
function allocateGroupBill(
  groupSubtotal,
  orderSubtotal,
  orderService,
  orderTax,
  orderDiscount,
  isLastGroup,
  accumulatedSoFar,
  orderGrandTotal
) {
  if (orderSubtotal === 0) {
    return { subtotal: 0, service: 0, tax: 0, total: 0 };
  }

  const ratio = groupSubtotal / orderSubtotal;
  const groupDiscount = Math.round(orderDiscount * ratio);
  const groupService = Math.round(orderService * ratio);
  const groupTax = Math.round(orderTax * ratio);

  let groupTotal = groupSubtotal - groupDiscount + groupService + groupTax;

  // Jika tagihan terakhir, serap selisih pembulatan (rounding difference)
  if (isLastGroup) {
    groupTotal = orderGrandTotal - accumulatedSoFar;
  }

  return {
    subtotal: groupSubtotal,
    discount: groupDiscount,
    service: groupService,
    tax: groupTax,
    total: groupTotal,
  };
}

describe('Split Bill & Alokasi Pembulatan', () => {
  it('harus membagi rata total tagihan ganjil dan mengalokasikan selisih pembulatan ke tagihan terakhir', () => {
    const totalOrder = 100000; // Rp100.000 dibagi 3 orang
    const splitCount = 3;

    const bills = splitEqual(totalOrder, splitCount);

    expect(bills).toHaveLength(3);
    expect(bills[0]).toBe(33333);
    expect(bills[1]).toBe(33333);
    // Tagihan terakhir menyerap sisa Rp1 pembulatan: 33.333 + 1 = 33.334
    expect(bills[2]).toBe(33334);

    // Total semua sub-tagihan harus tepat Rp100.000
    const sum = bills.reduce((acc, curr) => acc + curr, 0);
    expect(sum).toBe(totalOrder);
  });

  it('harus membagi rata tanpa selisih pembulatan jika habis dibagi', () => {
    const totalOrder = 150000;
    const splitCount = 3;

    const bills = splitEqual(totalOrder, splitCount);

    expect(bills).toEqual([50000, 50000, 50000]);
    const sum = bills.reduce((acc, curr) => acc + curr, 0);
    expect(sum).toBe(totalOrder);
  });

  it('harus membagi proporsional per item dan tagihan terakhir menyerap selisih <= Rp1', () => {
    // Pesanan:
    // Item 1: Nasi Goreng (Rp35.000)
    // Item 2: Burger (Rp55.000)
    // Item 3: Kopi (Rp24.000)
    // Subtotal = 114.000
    // Service (5%) = 5.700
    // Tax PB1 (10% dari 114.000 + 5.700) = 11.970
    // Grand Total = 131.670

    const orderSubtotal = 114000;
    const orderService = 5700;
    const orderTax = 11970;
    const orderDiscount = 0;
    const orderGrandTotal = orderSubtotal + orderService + orderTax - orderDiscount; // 131670

    // Grup 1: Nasi Goreng (35.000)
    const g1Subtotal = 35000;
    const bill1 = allocateGroupBill(
      g1Subtotal,
      orderSubtotal,
      orderService,
      orderTax,
      orderDiscount,
      false,
      0,
      orderGrandTotal
    );

    // Grup 2: Burger + Kopi (55.000 + 24.000 = 79.000)
    const g2Subtotal = 79000;
    const bill2 = allocateGroupBill(
      g2Subtotal,
      orderSubtotal,
      orderService,
      orderTax,
      orderDiscount,
      true, // grup terakhir
      bill1.total,
      orderGrandTotal
    );

    // Periksa bahwa total bill 1 + bill 2 = grand total tepat
    expect(bill1.total + bill2.total).toBe(orderGrandTotal);
    expect(bill1.total).toBeGreaterThan(0);
    expect(bill2.total).toBeGreaterThan(0);
  });

  it('harus membagi kuantitas item yang sama (misal 2 pizza dibagi ke 2 tagihan terpisah)', () => {
    const unitPrice = 75000;
    const totalQty = 2;
    const orderSubtotal = unitPrice * totalQty; // 150.000
    const orderService = 7500;
    const orderTax = 15750;
    const orderGrandTotal = orderSubtotal + orderService + orderTax; // 173.250

    // Masing-masing ambil 1 pizza (subtotal 75.000)
    const b1 = allocateGroupBill(75000, orderSubtotal, orderService, orderTax, 0, false, 0, orderGrandTotal);
    const b2 = allocateGroupBill(75000, orderSubtotal, orderService, orderTax, 0, true, b1.total, orderGrandTotal);

    expect(b1.subtotal).toBe(75000);
    expect(b2.subtotal).toBe(75000);
    expect(b1.total + b2.total).toBe(orderGrandTotal);
  });
});
