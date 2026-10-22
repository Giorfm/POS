import { requireStaff, apiError } from '@/lib/pos/server';
export const dynamic = 'force-dynamic';
export async function GET(request) {
  try {
    const { profile, outlet } = await requireStaff(request);
    return Response.json({ profile, outlet }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return apiError(error); }
}
