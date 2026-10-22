import { dashboardData } from '@/lib/pos/dashboard';
import { apiError } from '@/lib/pos/server';
export const dynamic = 'force-dynamic';
export async function GET(request) {
  try {
    const { shifts, profiles, inRange } = await dashboardData(request);
    const names = new Map(profiles.map(p => [p.id,p.full_name]));
    return Response.json({ status: 'success', data: shifts.filter(s => inRange(s.opened_at)).sort((a,b) => b.opened_at.localeCompare(a.opened_at)).map(s => ({ ...s, cashier_name: names.get(s.user_id) || 'Unknown staff' })) }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return apiError(error); }
}
