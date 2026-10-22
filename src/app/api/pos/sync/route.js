import { requireStaff, apiError } from '@/lib/pos/server';
export async function POST(request) {
  try {
    const { db, profile } = await requireStaff(request);
    const body = await request.json();
    if (JSON.stringify(body).length > 2000000) return Response.json({ error: 'Sync batch too large' }, { status: 413 });
    const { error } = await db.rpc('pos_save_records', { p_actor: profile.id, p_data: body });
    if (error) throw error;
    return Response.json({ saved_at: new Date().toISOString() });
  } catch (error) { return apiError(error); }
}
