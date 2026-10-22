import { dashboardData } from '@/lib/pos/dashboard';
import { staffPerformance } from '@/lib/pos/performance';
import { apiError } from '@/lib/pos/server';
export const dynamic = 'force-dynamic';
export async function GET(request) {
  try {
    const data = await dashboardData(request);
    return Response.json({ status: 'success', outlet_id: data.outlet.id, from: data.from, to: data.to, data: staffPerformance(data, data.from, data.to), definitions: { transactions: 'Successful payment receipts (split payments count separately)', collected: 'Successful payments including tax and service', refunds: 'Currently refunded payments attributed to original payment date', hours: 'Shift duration clipped to requested period; open shifts end at now' } }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return apiError(error); }
}
