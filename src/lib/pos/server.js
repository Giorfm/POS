import { createServerClient } from '@/lib/supabase/server';

export async function requireStaff(request, managerOnly = false) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) throw new Error('Server Supabase key is not configured');
  const db = createServerClient();
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) throw Object.assign(new Error('Sign in to Supabase first'), { status: 401 });
  const { data: { user }, error } = await db.auth.getUser(token);
  if (error || !user) throw Object.assign(new Error('Session expired'), { status: 401 });
  const { data: profile, error: profileError } = await db.from('profiles').select('id,full_name,role,merchant_id,outlet_id,is_active').eq('id', user.id).single();
  if (profileError || !['admin', 'owner', 'manager', 'cashier', 'waiter', 'kitchen'].includes(profile?.role) || !profile?.is_active || !profile.merchant_id || !profile.outlet_id) {
    throw Object.assign(new Error('Akun belum mendapat akses POS. Hubungi super admin untuk mengaktifkan akun dan menetapkan merchant serta outlet.'), { status: 403 });
  }
  if (managerOnly && !['admin', 'owner', 'manager'].includes(profile.role)) throw Object.assign(new Error('Manager access required'), { status: 403 });
  const { data: outlet } = await db.from('outlets').select('*').eq('id', profile.outlet_id).eq('merchant_id', profile.merchant_id).single();
  if (!outlet) throw Object.assign(new Error('Invalid outlet assignment'), { status: 403 });
  return { db, profile, outlet };
}

export async function allRows(query) {
  const result = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await query().range(offset, offset + 499);
    if (error) throw error;
    result.push(...data);
    if (data.length < 500) return result;
  }
}

export function apiError(error) {
  return Response.json({ error: error.message || 'Database request failed' }, { status: error.status || 500, headers: { 'Cache-Control': 'no-store' } });
}
