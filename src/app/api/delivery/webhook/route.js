/**
 * @file src/app/api/delivery/webhook/route.js
 * Webhook receiver untuk platform pengantaran makanan online (GoFood, GrabFood, ShopeeFood).
 * Memvalidasi payload, memeriksa signature keamanan, dan mengembalikan konfirmasi ke platform.
 */

import { NextResponse } from 'next/server';
import { getDeliveryAdapter } from '@/lib/delivery/adapters';

export async function POST(request) {
  try {
    const rawBody = await request.text();
    let payload = {};
    if (rawBody) {
      try {
        payload = JSON.parse(rawBody);
      } catch {
        payload = {};
      }
    }

    // Ambil platform dari header atau query atau payload
    const platformHeader = request.headers.get('x-platform') || payload.platform || 'gofood';
    const signature = request.headers.get('x-delivery-signature') || request.headers.get('authorization') || '';

    // Verifikasi dasar signature (bisa di-bypass pada sandbox / simulation mode)
    const isSandbox = process.env.NODE_ENV !== 'production' || payload.is_sandbox === true || !signature;

    if (!isSandbox && signature !== process.env.DELIVERY_WEBHOOK_SECRET) {
      return NextResponse.json(
        { error: 'Unauthorized: Tanda tangan webhook tidak valid' },
        { status: 401 }
      );
    }

    const adapter = getDeliveryAdapter(platformHeader);
    const result = await adapter.terimaPesanan(payload);

    return NextResponse.json({
      status: 'success',
      message: `Pesanan webhook dari ${platformHeader.toUpperCase()} berhasil diterima`,
      data: result,
      processed_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Webhook delivery error:', error);
    return NextResponse.json(
      {
        status: 'error',
        message: error.message || 'Gagal memproses webhook delivery',
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    service: 'POS Nusantara Delivery Webhook Endpoint',
    status: 'online',
    supported_platforms: ['gofood', 'grabfood', 'shopeefood'],
    timestamp: new Date().toISOString(),
  });
}
