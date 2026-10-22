import { dashboardData } from '@/lib/pos/dashboard';
import { apiError } from '@/lib/pos/server';
export const dynamic = 'force-dynamic';
export async function GET(request) {
  try {
    const { outlet, orders, payments, shifts, from, to, inRange } = await dashboardData(request);
    const paid = payments.filter(p => p.status === 'success' && inRange(p.paid_at));
    const completed = orders.filter(o => o.status === 'completed' && inRange(o.updated_at));
    const total = paid.reduce((sum,p) => sum + Number(p.amount),0);
    const payment_breakdown = {};
    for (const p of paid) { const row = payment_breakdown[p.method] ||= { count: 0, total: 0 }; row.count++; row.total += Number(p.amount); }
    return Response.json({ status: 'success', data: { outlet, period: { from, to, generated_at: new Date().toISOString() }, metrics: { collected: total, successful_payments: paid.length, completed_orders: completed.length, average_payment: paid.length ? total / paid.length : 0 }, payment_breakdown, active_shifts: shifts.filter(s => s.status === 'open') } }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return apiError(error); }
}
