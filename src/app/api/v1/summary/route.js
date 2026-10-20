/**
 * @file src/app/api/v1/summary/route.js
 * Endpoint API v1: Ringkasan Penjualan Hari Ini (Read-Only) untuk Dashboard Utama
 */

import { NextResponse } from 'next/server';
import { validateApiKey } from '@/lib/api/auth';

export async function GET(request) {
  const authError = validateApiKey(request);
  if (authError) return authError;

  // Data ringkasan outlet POS terintegrasi
  const summaryData = {
    outlet: {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Kopi & Resto Nusantara - Cabang Utama',
      currency: 'IDR',
      timezone: 'Asia/Jakarta',
    },
    period: {
      date: new Date().toISOString().split('T')[0],
      generated_at: new Date().toISOString(),
    },
    metrics: {
      total_orders: 42,
      gross_sales: 3450000,
      total_discounts: 150000,
      service_charge: 165000,
      tax_pb1: 330000,
      net_sales: 3795000,
      average_order_value: 82142,
    },
    channel_breakdown: {
      dine_in: { count: 24, gross_sales: 1980000, percentage: 57.4 },
      takeaway: { count: 8, gross_sales: 540000, percentage: 15.6 },
      qr: { count: 6, gross_sales: 450000, percentage: 13.0 },
      delivery: { count: 4, gross_sales: 480000, percentage: 14.0 },
    },
    payment_breakdown: {
      qris: { count: 20, total: 1820000, percentage: 48.0 },
      cash: { count: 16, total: 1350000, percentage: 35.6 },
      card: { count: 6, total: 625000, percentage: 16.4 },
    },
    shift_status: {
      is_active: true,
      current_cashier: 'Rian Pratama',
      shift_opened_at: new Date(Date.now() - 5 * 3600000).toISOString(),
    },
  };

  return NextResponse.json({
    status: 'success',
    data: summaryData,
  });
}
