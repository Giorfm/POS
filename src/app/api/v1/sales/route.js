import { dashboardData } from '@/lib/pos/dashboard';
import { apiError } from '@/lib/pos/server';
export const dynamic = 'force-dynamic';
export async function GET(request) {
  try {
    const { orders, inRange, params } = await dashboardData(request);
    const filtered = orders.filter(o => inRange(o.created_at) && (!params.get('channel') || o.type === params.get('channel')) && (!params.get('status') || o.status === params.get('status'))).sort((a,b) => b.created_at.localeCompare(a.created_at));
    const limit = Math.min(100, Math.max(1, Number(params.get('limit')) || 20));
    const offset = Math.max(0, Number(params.get('offset')) || 0);
    return Response.json({ status: 'success', total: filtered.length, data: filtered.slice(offset, offset + limit) }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return apiError(error); }
}
