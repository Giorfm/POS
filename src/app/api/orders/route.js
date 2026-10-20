import { NextResponse } from 'next/server';

/**
 * Global in-memory storage on Next.js server to bridge real-time state
 * across different devices (e.g. customer mobile phone scanning QR -> POS laptop).
 */
if (!globalThis.__POS_SERVER_STATE__) {
  globalThis.__POS_SERVER_STATE__ = {
    orders: [],
    bills: [],
    deliveryOrders: [],
    tables: [],
    lastUpdated: new Date().toISOString(),
  };
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const since = searchParams.get('since');

  const state = globalThis.__POS_SERVER_STATE__;

  return NextResponse.json({
    status: 'success',
    lastUpdated: state.lastUpdated,
    orders: state.orders,
    bills: state.bills,
    deliveryOrders: state.deliveryOrders,
    tables: state.tables,
  });
}

export async function POST(request) {
  try {
    const body = await request.json();
    const state = globalThis.__POS_SERVER_STATE__;
    const now = new Date().toISOString();

    if (body.action === 'create_order') {
      const { order, bill, tableId } = body;
      if (!order) {
        return NextResponse.json({ status: 'error', message: 'Order data is required' }, { status: 400 });
      }

      // Hindari duplikasi jika sudah ada
      const existingIdx = state.orders.findIndex((o) => o.id === order.id);
      if (existingIdx > -1) {
        state.orders[existingIdx] = order;
      } else {
        state.orders = [order, ...state.orders];
      }

      if (bill) {
        const bIdx = state.bills.findIndex((b) => b.id === bill.id);
        if (bIdx > -1) {
          state.bills[bIdx] = bill;
        } else {
          state.bills = [bill, ...state.bills];
        }
      }

      if (tableId && state.tables.length > 0) {
        state.tables = state.tables.map((t) => (t.id === tableId ? { ...t, status: 'occupied' } : t));
      }

      state.lastUpdated = now;

      return NextResponse.json({
        status: 'success',
        message: 'Pesanan berhasil disimpan di server',
        order,
      });
    }

    if (body.action === 'sync_state') {
      // POS / KDS client menyinkronkan state lokal ke server
      if (Array.isArray(body.orders)) {
        // Gabungkan tanpa menghilangkan pesanan QR baru yang dibuat dari smartphone
        const clientOrderIds = new Set(body.orders.map((o) => o.id));
        const serverOnlyOrders = state.orders.filter((o) => !clientOrderIds.has(o.id));
        state.orders = [...body.orders, ...serverOnlyOrders];
      }
      if (Array.isArray(body.bills)) {
        const clientBillIds = new Set(body.bills.map((b) => b.id));
        const serverOnlyBills = state.bills.filter((b) => !clientBillIds.has(b.id));
        state.bills = [...body.bills, ...serverOnlyBills];
      }
      if (Array.isArray(body.tables) && body.tables.length > 0) {
        state.tables = body.tables;
      }
      if (Array.isArray(body.deliveryOrders)) {
        state.deliveryOrders = body.deliveryOrders;
      }

      state.lastUpdated = now;

      return NextResponse.json({
        status: 'success',
        message: 'State tersinkronisasi',
        ordersCount: state.orders.length,
      });
    }

    if (body.action === 'update_order') {
      const { orderId, updates } = body;
      state.orders = state.orders.map((o) => (o.id === orderId ? { ...o, ...updates, updated_at: now } : o));
      state.lastUpdated = now;
      return NextResponse.json({ status: 'success' });
    }

    return NextResponse.json({ status: 'error', message: 'Aksi tidak dikenali' }, { status: 400 });
  } catch (error) {
    console.error('API /api/orders error:', error);
    return NextResponse.json({ status: 'error', message: error.message }, { status: 500 });
  }
}
