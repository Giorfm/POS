/**
 * @file src/test/stock-deduction.test.js
 * Unit Test: Pemotongan Stok Bahan Baku Berdasarkan Resep (BOM) & Void Reversal
 */

import { describe, it, expect } from 'vitest';

/**
 * Simulasi pemotongan stok bahan baku berdasarkan pesanan dan resep
 * @param {Array<{ id: string, name: string, current_stock: number, min_stock: number, is_critical: boolean }>} ingredients
 * @param {Array<{ product_id: string, ingredient_id: string, qty: number }>} recipes
 * @param {Array<{ product_id: string, qty: number, modifiers?: Array<{ option_id: string }> }>} orderItems
 * @param {Array<{ option_id: string, ingredient_id: string, qty_delta: number }>} modifierRecipeDeltas
 * @returns {{ updatedIngredients: Array<any>, movements: Array<any>, alerts: Array<any> }}
 */
function processStockDeduction(ingredients, recipes, orderItems, modifierRecipeDeltas = []) {
  const stockMap = new Map(ingredients.map((i) => [i.id, { ...i }]));
  const movements = [];
  const alerts = [];

  for (const item of orderItems) {
    // 1. Resep dasar produk
    const productRecipes = recipes.filter((r) => r.product_id === item.product_id);
    for (const recipe of productRecipes) {
      const ing = stockMap.get(recipe.ingredient_id);
      if (ing) {
        const deductQty = recipe.qty * item.qty;
        ing.current_stock -= deductQty;

        movements.push({
          ingredient_id: ing.id,
          type: 'sale',
          qty: -deductQty,
          balance_after: ing.current_stock,
        });

        if (ing.current_stock <= ing.min_stock) {
          alerts.push({
            ingredient_id: ing.id,
            name: ing.name,
            current_stock: ing.current_stock,
            is_critical: ing.is_critical,
          });
        }
      }
    }

    // 2. Modifier delta (misal extra shot kopi atau susu)
    for (const mod of item.modifiers || []) {
      const deltas = modifierRecipeDeltas.filter((d) => d.option_id === mod.option_id);
      for (const delta of deltas) {
        const ing = stockMap.get(delta.ingredient_id);
        if (ing) {
          const modDeductQty = delta.qty_delta * item.qty;
          ing.current_stock -= modDeductQty;

          movements.push({
            ingredient_id: ing.id,
            type: 'sale_modifier',
            qty: -modDeductQty,
            balance_after: ing.current_stock,
          });
        }
      }
    }
  }

  return {
    updatedIngredients: Array.from(stockMap.values()),
    movements,
    alerts,
  };
}

/**
 * Reversal stok saat item pesanan di-void/dibatalkan
 */
function processStockReversal(ingredients, previousMovements) {
  const stockMap = new Map(ingredients.map((i) => [i.id, { ...i }]));
  const reversalMovements = [];

  for (const mov of previousMovements) {
    const ing = stockMap.get(mov.ingredient_id);
    if (ing) {
      const returnQty = Math.abs(mov.qty);
      ing.current_stock += returnQty;

      reversalMovements.push({
        ingredient_id: ing.id,
        type: 'reversal',
        qty: returnQty,
        balance_after: ing.current_stock,
      });
    }
  }

  return {
    updatedIngredients: Array.from(stockMap.values()),
    reversalMovements,
  };
}

describe('Pemotongan Stok Resep & Pemulihan (Reversal)', () => {
  const initialIngredients = [
    { id: 'ing-coffee', name: 'Biji Kopi', current_stock: 1000, min_stock: 200, is_critical: true },
    { id: 'ing-milk', name: 'Fresh Milk', current_stock: 5000, min_stock: 1000, is_critical: true },
    { id: 'ing-sugar', name: 'Sirup Gula Aren', current_stock: 800, min_stock: 300, is_critical: false },
  ];

  const recipes = [
    // Kopi Susu: 18g Kopi, 150ml Susu, 25ml Gula
    { product_id: 'prod-kopi-susu', ingredient_id: 'ing-coffee', qty: 18 },
    { product_id: 'prod-kopi-susu', ingredient_id: 'ing-milk', qty: 150 },
    { product_id: 'prod-kopi-susu', ingredient_id: 'ing-sugar', qty: 25 },
  ];

  const modifierDeltas = [
    // Extra Shot Espresso: +18g Biji Kopi
    { option_id: 'opt-extra-shot', ingredient_id: 'ing-coffee', qty_delta: 18 },
  ];

  it('harus memotong stok bahan baku dengan proporsi tepat sesuai resep dan kuantitas pesanan', () => {
    const orderItems = [
      { product_id: 'prod-kopi-susu', qty: 2 }, // 2 porsi Kopi Susu
    ];

    const { updatedIngredients, movements } = processStockDeduction(
      initialIngredients,
      recipes,
      orderItems,
      modifierDeltas
    );

    const coffee = updatedIngredients.find((i) => i.id === 'ing-coffee');
    const milk = updatedIngredients.find((i) => i.id === 'ing-milk');
    const sugar = updatedIngredients.find((i) => i.id === 'ing-sugar');

    // Kopi: 1000 - (18 * 2) = 964
    expect(coffee.current_stock).toBe(964);
    // Susu: 5000 - (150 * 2) = 4700
    expect(milk.current_stock).toBe(4700);
    // Gula: 800 - (25 * 2) = 750
    expect(sugar.current_stock).toBe(750);

    expect(movements).toHaveLength(3);
  });

  it('harus memotong tambahan stok ketika opsi modifier konsumsi bahan dipilih', () => {
    const orderItems = [
      {
        product_id: 'prod-kopi-susu',
        qty: 1,
        modifiers: [{ option_id: 'opt-extra-shot' }],
      },
    ];

    const { updatedIngredients } = processStockDeduction(
      initialIngredients,
      recipes,
      orderItems,
      modifierDeltas
    );

    const coffee = updatedIngredients.find((i) => i.id === 'ing-coffee');
    // Kopi berkurang 18g (resep) + 18g (extra shot) = 36g. Stok akhir: 1000 - 36 = 964
    expect(coffee.current_stock).toBe(964);
  });

  it('harus memicu alert ketika stok mencapai atau di bawah min_stock', () => {
    const lowStockIngredients = [
      { id: 'ing-coffee', name: 'Biji Kopi', current_stock: 210, min_stock: 200, is_critical: true },
    ];

    const orderItems = [
      { product_id: 'prod-kopi-susu', qty: 1 }, // butuh 18g -> sisa 192 (di bawah 200)
    ];

    const { alerts } = processStockDeduction(lowStockIngredients, recipes, orderItems);

    expect(alerts).toHaveLength(1);
    expect(alerts[0].ingredient_id).toBe('ing-coffee');
    expect(alerts[0].current_stock).toBe(192);
  });

  it('harus mengembalikan stok (reversal) secara utuh saat void pesanan', () => {
    const orderItems = [{ product_id: 'prod-kopi-susu', qty: 2 }];
    const deduction = processStockDeduction(initialIngredients, recipes, orderItems);

    // Lakukan reversal terhadap movements pemotongan tadi
    const reversal = processStockReversal(deduction.updatedIngredients, deduction.movements);

    const coffeeRestored = reversal.updatedIngredients.find((i) => i.id === 'ing-coffee');
    const milkRestored = reversal.updatedIngredients.find((i) => i.id === 'ing-milk');
    const sugarRestored = reversal.updatedIngredients.find((i) => i.id === 'ing-sugar');

    // Harus kembali persis seperti saldo awal
    expect(coffeeRestored.current_stock).toBe(1000);
    expect(milkRestored.current_stock).toBe(5000);
    expect(sugarRestored.current_stock).toBe(800);
  });
});
