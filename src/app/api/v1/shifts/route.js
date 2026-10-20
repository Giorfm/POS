/**
 * @file src/app/api/v1/shifts/route.js
 * Endpoint API v1: Riwayat & Status Shift Kasir (Read-Only)
 */

import { NextResponse } from 'next/server';
import { validateApiKey } from '@/lib/api/auth';

export async function GET(request) {
  const authError = validateApiKey(request);
  if (authError) return authError;

  const sampleShifts = [
    {
      id: 'shift-001',
      cashier_id: '10000000-0000-0000-0000-000000000003',
      cashier_name: 'Rian Pratama',
      status: 'active',
      opened_at: new Date(Date.now() - 5 * 3600000).toISOString(),
      closed_at: null,
      opening_cash: 500000,
      expected_cash: 1850000,
      actual_cash: null,
      variance: null,
      cash_in_drawer: 1850000,
      petty_cash_in: 50000,
      petty_cash_out: 25000,
      total_sales_cash: 1325000,
      total_sales_qris: 1820000,
      approved_by: null,
    },
    {
      id: 'shift-000',
      cashier_id: '10000000-0000-0000-0000-000000000004',
      cashier_name: 'Dika Putra',
      status: 'closed',
      opened_at: new Date(Date.now() - 24 * 3600000).toISOString(),
      closed_at: new Date(Date.now() - 16 * 3600000).toISOString(),
      opening_cash: 500000,
      expected_cash: 2350000,
      actual_cash: 2350000,
      variance: 0,
      cash_in_drawer: 2350000,
      petty_cash_in: 0,
      petty_cash_out: 0,
      total_sales_cash: 1850000,
      total_sales_qris: 2100000,
      approved_by: 'Siti Rahma (Manager)',
    },
  ];

  return NextResponse.json({
    status: 'success',
    data: sampleShifts,
  });
}
