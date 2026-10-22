import { supabase } from '@/lib/supabase/client';

export async function cloudRequest(path, options = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Sign in to your staff account to connect Supabase.');
  const response = await fetch(path, { ...options, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}`, ...options.headers }, cache: 'no-store' });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || 'Cloud sync failed');
  return body;
}

// Persist pending records independently from the demo/local store. Retries reuse IDs.
const fields = { shifts: 'shifts', orders: 'orders', bills: 'bills', payments: 'payments', cashMovements: 'cash_movements', auditLogs: 'audit_logs' };
export function startCloudSync(store) {
  let running = false;
  const flush = async () => {
    const state = store.getState();
    if (running || !state.cloudConnected || !state.cloudPending?.length) return;
    running = true;
    const batch = state.cloudPending.slice(0, 100);
    store.setState({ cloudStatus: 'syncing' });
    try {
      await cloudRequest('/api/pos/sync', { method: 'POST', body: JSON.stringify({ records: batch }) });
      const ids = new Set(batch.map(r => r.event_id));
      store.setState(s => ({ cloudPending: s.cloudPending.filter(r => !ids.has(r.event_id)), cloudStatus: 'synced', cloudError: null, cloudLastSaved: new Date().toISOString() }));
    } catch (error) { store.setState({ cloudStatus: 'pending', cloudError: error.message }); }
    finally { running = false; }
  };
  const unsubscribe = store.subscribe((next, prev) => {
    if (!next.cloudConnected || next.cloudHydrating) return;
    const records = [];
    for (const [field, table] of Object.entries(fields)) {
      if (next[field] === prev[field]) continue;
      const previous = new Map(prev[field].map(r => [r.id, r]));
      if (field === 'bills') {
        const ids = new Set(next.bills.map(b => b.id));
        for (const old of prev.bills) if (!ids.has(old.id)) records.push({ event_id: crypto.randomUUID(), table, record: { ...old, status: 'cancelled' }, actor_id: next.currentUser.id, outlet_id: next.outlet.id });
      }
      for (const record of next[field]) {
        if (JSON.stringify(record) === JSON.stringify(previous.get(record.id))) continue;
        records.push({ event_id: crypto.randomUUID(), table, record, actor_id: next.currentUser.id, outlet_id: next.outlet.id });
      }
    }
    if (records.length) store.setState(s => ({ cloudPending: [...s.cloudPending, ...records], cloudStatus: 'pending' }));
  });
  const timer = setInterval(flush, 1500);
  window.addEventListener('online', flush);
  flush();
  return () => { unsubscribe(); clearInterval(timer); window.removeEventListener('online', flush); };
}
