/**
 * @file src/app/api/v1/sales/route.js
 * Endpoint API v1: Riwayat Transaksi Penjualan Lengkap (Read-Only)
 */

import { NextResponse } from 'next/server';
import { validateApiKey } from '@/lib/api/auth';

export async function GET(request) {
  const authError = validateApiKey(request);
  if (authError) return authError;

  const { searchParams } = new URL(request.url);
  const channel = searchParams.get('channel');
  const status = searchParams.get('status');
  const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit')) || 20));
  const offset = Math.max(0, Number(searchParams.get('offset')) || 0);

  // Mock transaksi demo representatif
  const sampleOrders = [
    {
      id: 'ord-001',
      order_number: 'ORD-109281',
      type: 'dine_in',
      source: 'pos',
      customer_name: 'Meja 02',
      table_name: 'Meja 02',
      status: 'completed',
      subtotal: 120000,
      service: 6000,
      tax: 12600,
      discount: 0,
      total: 138600,
      payment_method: 'qris',
      items_count: 3,
      items: [
        { name: 'Kopi Susu Gula Aren', qty: 2, price: 24000 },
        { name: 'Nasi Goreng Spesial Resto', qty: 1, price: 38000 },
      ],
      created_at: new Date(Date.now() - 3600000).toISOString(),
    },
    {
      id: 'ord-002',
      order_number: 'ORD-109282',
      type: 'takeaway',
      source: 'pos',
      customer_name: 'Antrean #01',
      table_name: null,
      status: 'completed',
      subtotal: 48000,
      service: 0,
      tax: 4800,
      discount: 0,
      total: 52800,
      payment_method: 'cash',
      items_count: 2,
      items: [
        { name: 'Caffe Latte Hangat', qty: 1, price: 28000 },
        { name: 'Americano Dingin', qty: 1, price: 20000 },
      ],
      created_at: new Date(Date.now() - 7200000).toISOString(),
    },
    {
      id: 'ord-003',
      order_number: 'ORD-109283',
      type: 'qr',
      source: 'qr',
      customer_name: 'Tamu Meja 05',
      table_name: 'Meja 05',
      status: 'completed',
      subtotal: 96000,
      service: 4800,
      tax: 10080,
      discount: 0,
      total: 110880,
      payment_method: 'qris',
      items_count: 2,
      items: [
        { name: 'Burger Daging Sapi Melted Cheese', qty: 1, price: 54000 },
        { name: 'Kopi Susu Gula Aren', qty: 1, price: 24000 },
      ],
      created_at: new Date(Date.now() - 10800000).toISOString(),
    },
    {
      id: 'ord-004',
      order_number: 'ORD-109284',
      type: 'delivery',
      source: 'gofood',
      customer_name: 'Pelanggan GoFood (GF-88192)',
      table_name: null,
      status: 'completed',
      subtotal: 82000,
      service: 0,
      tax: 8200,
      discount: 0,
      total: 90200,
      payment_method: 'delivery_platform',
      items_count: 2,
      items: [
        { name: 'Mie Goreng Spesial', qty: 1, price: 34000 },
        { name: 'Es Teh Manis Melati', qty: 2, price: 10000 },
      ],
      created_at: new Date(Date.now() - 14400000).toISOString(),
    },
  ];

  let filtered = sampleOrders;
  if (channel) {
    filtered = filtered.filter((o) => o.type === channel);
  }
  if (status) {
    filtered = filtered.filter((o) => o.status === status);
  }

  const paginated = filtered.slice(offset, offset + limit);

  return NextResponse.json({
    status: 'success',
    pagination: {
      total: filtered.length,
      limit,
      offset,
      has_more: offset + limit < filtered.length,
    },
    data: paginated,
  });
}
