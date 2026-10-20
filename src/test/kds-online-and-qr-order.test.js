/**
 * @file src/test/kds-online-and-qr-order.test.js
 * Unit Test: KDS Online Order Filtering & QR Self-Order Handling
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { usePosStore } from '@/lib/store/usePosStore';

describe('KDS Online Order & QR Table Order Tests', () => {
  beforeEach(() => {
    // Reset state dasar
    usePosStore.setState({
      orders: [],
      deliveryOrders: [],
      bills: [],
      tables: [
        {
          id: 'table-test-01',
          name: 'Meja 01',
          area_id: 'area-1',
          status: 'available',
          qr_token: 'token_meja_01_test',
        },
      ],
      currentShift: { id: 'shift-test-1', cash_initial: 500000 },
      products: [
        {
          id: 'prod-1',
          name: 'Nasi Goreng Spesial',
          price: 35000,
          is_available: true,
        },
      ],
      modifierOptions: [
        {
          id: 'mod-1',
          name: 'Pedas (Level 2)',
          price_delta: 2000,
        },
      ],
    });
  });

  it('harus menghapus pesanan online dari tiket aktif KDS saat ditandai selesai', () => {
    const store = usePosStore.getState();

    // 1. Simulasikan pesanan online masuk
    const simResult = store.simulateDeliveryOrder('gofood');
    const orderId = simResult.order.id;
    const deliveryId = simResult.deliveryOrder.id;

    // Verifikasi pesanan online masuk ke orders & deliveryOrders
    const ordersAfterSim = usePosStore.getState().orders;
    const deliveryAfterSim = usePosStore.getState().deliveryOrders;

    expect(ordersAfterSim.some((o) => o.id === orderId)).toBe(true);
    expect(deliveryAfterSim.some((d) => d.id === deliveryId)).toBe(true);

    // KDS active filter logic
    const filterKdsActive = (ordersList) =>
      ordersList.filter((o) => {
        if (o.status === 'completed' || o.status === 'cancelled') return false;
        const hasUnfinishedItems = o.items.some(
          (i) => i.status === 'preparing' || i.status === 'new' || i.status === 'ready'
        );
        if (!hasUnfinishedItems) return false;
        return (
          o.status === 'sent' ||
          o.status === 'ready' ||
          o.items.some((i) => i.status === 'preparing' || i.status === 'new')
        );
      });

    // Sebelum diselesaikan: Harus muncul di KDS
    let activeTickets = filterKdsActive(usePosStore.getState().orders);
    expect(activeTickets.some((o) => o.id === orderId)).toBe(true);

    // 2. Tandai pesanan online sebagai selesai (Driver Berangkat / Selesai)
    usePosStore.getState().updateDeliveryStatus(deliveryId, 'completed');

    // Verifikasi status order di store menjadi 'completed' dan item disajikan (served)
    const updatedOrder = usePosStore.getState().orders.find((o) => o.id === orderId);
    expect(updatedOrder.status).toBe('completed');
    expect(updatedOrder.items.every((i) => i.status === 'served')).toBe(true);

    // Verifikasi status delivery_order menjadi 'completed'
    const updatedDelivery = usePosStore.getState().deliveryOrders.find((d) => d.id === deliveryId);
    expect(updatedDelivery.status).toBe('completed');

    // 3. Setelah diselesaikan: TIDAK BOLEH lagi muncul di tiket aktif KDS!
    activeTickets = filterKdsActive(usePosStore.getState().orders);
    expect(activeTickets.some((o) => o.id === orderId)).toBe(false);
  });

  it('harus memproses pesanan QR meja, menandai meja occupied, dan langsung masuk ke KDS', () => {
    const tableId = 'table-test-01';

    // Buat pesanan baru tipe 'qr'
    const newOrder = usePosStore.getState().createOrder({
      type: 'qr',
      source: 'qr',
      tableId,
      customerName: 'Tamu Meja 01',
      items: [
        {
          productId: 'prod-1',
          name: 'Nasi Goreng Spesial',
          qty: 2,
          notes: 'Tidak pakai acar',
          modifiers: [
            {
              id: 'mod-1',
              name: 'Pedas (Level 2)',
              price_delta: 2000,
            },
          ],
        },
      ],
    });

    // Kirim ke dapur
    usePosStore.getState().sendOrderToKitchen(newOrder.id);

    // Verifikasi meja menjadi occupied
    const table = usePosStore.getState().tables.find((t) => t.id === tableId);
    expect(table.status).toBe('occupied');

    // Verifikasi pesanan berstatus 'sent' dan item 'preparing'
    const orderInStore = usePosStore.getState().orders.find((o) => o.id === newOrder.id);
    expect(orderInStore).toBeDefined();
    expect(orderInStore.type).toBe('qr');
    expect(orderInStore.status).toBe('sent');
    expect(orderInStore.items[0].status).toBe('preparing');
    expect(orderInStore.items[0].price_snapshot).toBe(37000); // 35000 + 2000 modifier

    // Verifikasi pesanan aktif di KDS
    const filterKdsActive = (ordersList) =>
      ordersList.filter((o) => {
        if (o.status === 'completed' || o.status === 'cancelled') return false;
        const hasUnfinishedItems = o.items.some(
          (i) => i.status === 'preparing' || i.status === 'new' || i.status === 'ready'
        );
        if (!hasUnfinishedItems) return false;
        return (
          o.status === 'sent' ||
          o.status === 'ready' ||
          o.items.some((i) => i.status === 'preparing' || i.status === 'new')
        );
      });

    const activeTickets = filterKdsActive(usePosStore.getState().orders);
    expect(activeTickets.some((o) => o.id === newOrder.id)).toBe(true);
  });
});
