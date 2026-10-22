import { requireStaff, allRows, apiError } from '@/lib/pos/server';
export const dynamic = 'force-dynamic';
export async function GET(request) {
  try {
    const { db, profile, outlet } = await requireStaff(request);
    const scoped = (table, select = '*') => allRows(() => db.from(table).select(select).eq('outlet_id', outlet.id).order('id'));
    const [orders, shifts, cashMovements, products, categories, tables, areas, profiles, ingredients, recipes, modifierGroups] = await Promise.all([
      scoped('orders', '*,items:order_items(*,modifiers:order_item_modifiers(*)),bills(*,payments(*))'), scoped('shifts'), scoped('cash_movements'), scoped('products', '*,product_modifier_groups(group_id)'), scoped('categories'), scoped('tables'), scoped('areas'), scoped('profiles', 'id,full_name,role,is_active'), scoped('ingredients'), scoped('recipes'), scoped('modifier_groups', '*,modifier_options(*)'),
    ]);
    return Response.json({ outlet, currentUser: { ...profile, name: profile.full_name }, profiles: profiles.map(p => ({ ...p, name: p.full_name })), orders: orders.map(({ bills, ...o }) => o), bills: orders.flatMap(o => o.bills.map(({ payments, ...b }) => b)), payments: orders.flatMap(o => o.bills.flatMap(b => b.payments)), shifts, cashMovements, products: products.map(p => ({ ...p, modifier_group_ids: p.product_modifier_groups.map(g => g.group_id) })), categories, tables, areas, ingredients, recipes, modifierGroups, modifierOptions: modifierGroups.flatMap(g => g.modifier_options), currentShift: shifts.find(s => s.user_id === profile.id && s.status === 'open') || null }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return apiError(error); }
}
