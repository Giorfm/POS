import { describe, it, expect } from 'vitest';
import { staffPerformance } from '@/lib/pos/performance';
import { usePosStore } from '@/lib/store/usePosStore';

describe('Staff performance uses actual collections and shift ownership', () => {
  it('excludes pending/failed payments, clips overnight shifts and keeps unattributed collections visible', () => {
    const data = { profiles: [{ id: 'a', full_name: 'A' }, { id: 'b', full_name: 'B' }], shifts: [{ user_id: 'a', opened_at: '2026-10-21T23:00:00Z', closed_at: '2026-10-22T02:00:00Z', status: 'closed', variance: -10 }], payments: [
      { user_id: 'a', status: 'success', amount: 100, paid_at: '2026-10-22T01:00:00Z' },
      { user_id: 'b', status: 'pending', amount: 900, paid_at: '2026-10-22T01:00:00Z' },
      { user_id: 'a', status: 'refunded', amount: 40, paid_at: '2026-10-22T01:00:00Z' },
      { user_id: 'a', status: 'failed', amount: 900, paid_at: '2026-10-22T01:00:00Z' },
      { user_id: null, status: 'success', amount: 50, paid_at: '2026-10-22T01:00:00Z' },
      { user_id: 'a', status: 'success', amount: 999, paid_at: '2026-10-23T00:00:00Z' },
    ] };
    const rows = staffPerformance(data, '2026-10-22T00:00:00Z', '2026-10-23T00:00:00Z', new Date('2026-10-24T00:00:00Z'));
    expect(rows[0]).toMatchObject({ collected: 100, net_collected: 100, original_collected: 140, refunds: 40, transactions: 1, hours: 2, cash_variance: -10, collected_per_hour: 50 });
    expect(rows[1].collected).toBe(0);
    expect(rows[2]).toMatchObject({ staff_id: null, collected: 50 });
  });
  it('records the collector and current shift, and ignores another shift during close', async () => {
    const before = usePosStore.getState();
    const shift = { id: 'shift-a', user_id: 'a', opening_cash: 100, opened_at: '2026-10-22T00:00:00Z' };
    usePosStore.setState({ currentUser: { id: 'a', name: 'A' }, currentShift: shift, shifts: [shift], bills: [{ id: 'bill', order_id: 'order', amount: 50, status: 'pending' }], orders: [{ id: 'order', user_id: 'other', stock_deducted: true }], payments: [{ id: 'other', shift_id: 'shift-b', method: 'cash', status: 'success', amount: 900 }], cashMovements: [], cloudConnected: false });
    try {
      const p = usePosStore.getState().payBill('bill', { method: 'cash' });
      expect(p).toMatchObject({ user_id: 'a', shift_id: 'shift-a', amount: 50 });
      const closed = await usePosStore.getState().closeShift(150);
      expect(closed.expected_cash).toBe(150);
      expect(closed.variance).toBe(0);
    } finally { usePosStore.setState(before, true); }
  });
});
