/**
 * @file src/app/api/v1/inventory/route.js
 * Endpoint API v1: Status Stok Bahan Baku & Inventaris (Read-Only)
 */

import { NextResponse } from 'next/server';
import { validateApiKey } from '@/lib/api/auth';

export async function GET(request) {
  const authError = validateApiKey(request);
  if (authError) return authError;

  const inventoryItems = [
    {
      id: 'ing-001',
      name: 'Biji Kopi Arabika Mandheling',
      base_unit: 'gram',
      purchase_unit: 'kg',
      current_stock: 4200,
      min_stock: 1000,
      unit_cost: 250,
      is_critical: true,
      status: 'safe',
      total_valuation: 1050000,
    },
    {
      id: 'ing-002',
      name: 'Susu Segar Pasteurisasi',
      base_unit: 'ml',
      purchase_unit: 'liter',
      current_stock: 8500,
      min_stock: 5000,
      unit_cost: 20,
      is_critical: true,
      status: 'safe',
      total_valuation: 170000,
    },
    {
      id: 'ing-003',
      name: 'Sirup Gula Aren Organik',
      base_unit: 'ml',
      purchase_unit: 'liter',
      current_stock: 1200,
      min_stock: 1500,
      unit_cost: 35,
      is_critical: false,
      status: 'low',
      total_valuation: 42000,
    },
    {
      id: 'ing-004',
      name: 'Daging Sapi Sirloin Australia',
      base_unit: 'gram',
      purchase_unit: 'kg',
      current_stock: 1800,
      min_stock: 2000,
      unit_cost: 160,
      is_critical: true,
      status: 'low',
      total_valuation: 288000,
    },
    {
      id: 'ing-005',
      name: 'Beras Pulen Premium',
      base_unit: 'gram',
      purchase_unit: 'karung 25kg',
      current_stock: 22000,
      min_stock: 5000,
      unit_cost: 15,
      is_critical: false,
      status: 'safe',
      total_valuation: 330000,
    },
  ];

  const lowStockCount = inventoryItems.filter((i) => i.status === 'low').length;
  const criticalCount = inventoryItems.filter((i) => i.is_critical && i.status === 'low').length;
  const totalValuation = inventoryItems.reduce((sum, i) => sum + i.total_valuation, 0);

  return NextResponse.json({
    status: 'success',
    summary: {
      total_ingredients: inventoryItems.length,
      low_stock_count: lowStockCount,
      critical_alert_count: criticalCount,
      total_inventory_valuation: totalValuation,
    },
    data: inventoryItems,
  });
}
