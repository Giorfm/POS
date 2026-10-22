import { createServerClient } from '@/lib/supabase/server';
import { requireStaff, allRows } from '@/lib/pos/server';
import { validateApiKey } from '@/lib/api/auth';

export async function dashboardData(request) {
  let db, outlet;
  if (request.headers.get('authorization')) {
    ({ db, outlet } = await requireStaff(request, true));
  } else {
    const denied = validateApiKey(request);
    if (denied) throw Object.assign(new Error('Dashboard authentication required'), { status: 401 });
    // API keys are deliberately scoped to one configured outlet.
    if (!process.env.MAIN_DASHBOARD_OUTLET_ID) throw Object.assign(new Error('Configure MAIN_DASHBOARD_OUTLET_ID'), { status: 503 });
    db = createServerClient();
    const { data, error } = await db.from('outlets').select('*').eq('id', process.env.MAIN_DASHBOARD_OUTLET_ID).single();
    if (error) throw error;
    outlet = data;
  }
  const params = new URL(request.url).searchParams;
  const from = params.get('from'); const to = params.get('to');
  if ((from && !Number.isFinite(Date.parse(from))) || (to && !Number.isFinite(Date.parse(to))) || (from && to && Date.parse(from) >= Date.parse(to))) throw Object.assign(new Error('Use valid from/to timestamps with from < to'), { status: 400 });
  const [orders, shifts, profiles] = await Promise.all([
    allRows(() => db.from('orders').select('*,bills(*,payments(*))').eq('outlet_id', outlet.id).order('id')),
    allRows(() => db.from('shifts').select('*').eq('outlet_id', outlet.id).order('id')),
    allRows(() => db.from('profiles').select('id,full_name,role,is_active').eq('outlet_id', outlet.id).order('id')),
  ]);
  const payments = orders.flatMap(o => o.bills.flatMap(b => b.payments));
  const inRange = timestamp => (!from || Date.parse(timestamp) >= Date.parse(from)) && (!to || Date.parse(timestamp) < Date.parse(to));
  return { outlet, orders, shifts, profiles, payments, from, to, inRange, params };
}
