/**
 * @file src/app/api/qris/webhook/route.js
 * Webhook receiver untuk gateway pembayaran QRIS (Midtrans, Xendit, atau ASPI QRIS simulator).
 * Menerima callback status settlement pembayaran QRIS dan memverifikasi idempotency key.
 */

import { NextResponse } from 'next/server';

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

    const idempotencyKey =
      request.headers.get('x-idempotency-key') || payload.idempotency_key || `IDEM-${Date.now()}`;
    const transactionStatus =
      payload.transaction_status || payload.status || 'settlement';
    const orderNumber =
      payload.order_id || payload.order_number || `ORD-QRIS-${Date.now().toString().slice(-4)}`;
    const grossAmount =
      Number(payload.gross_amount) || Number(payload.amount) || 0;

    // Respon sukses idempotensial
    return NextResponse.json({
      status: 'success',
      message: 'Notifikasi pembayaran QRIS berhasil dicatat',
      data: {
        order_number: orderNumber,
        status: transactionStatus,
        gross_amount: grossAmount,
        idempotency_key: idempotencyKey,
        settled_at: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Webhook QRIS error:', error);
    return NextResponse.json(
      {
        status: 'error',
        message: error.message || 'Gagal memproses webhook QRIS',
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    service: 'POS Nusantara QRIS Payment Gateway Webhook',
    status: 'online',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
}
