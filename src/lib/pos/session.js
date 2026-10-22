import { cloudRequest } from '@/lib/pos/cloud';
import { usePosStore } from '@/lib/store/usePosStore';

export function canResumePending(state, profile) {
  return state.currentUser?.id === profile.id && state.outlet?.id === profile.outlet_id &&
    state.cloudPending.every(r => r.actor_id === profile.id && r.outlet_id === profile.outlet_id);
}

export async function loadStaffSession() {
  const { profile } = await cloudRequest('/api/pos/session');
  const state = usePosStore.getState();
  if (state.cloudPending.length) {
    if (!canResumePending(state, profile)) throw new Error('Masih ada transaksi belum tersinkron. Masuk kembali dengan akun sebelumnya untuk menyelesaikan sinkronisasi.');
    usePosStore.setState({ currentUser: { ...profile, name: profile.full_name }, cloudConnected: true, sessionLocked: false });
    return profile;
  }
  const data = await cloudRequest('/api/pos/bootstrap');
  if (!state.cloudConnected) localStorage.setItem('pos-fb-before-cloud', JSON.stringify(usePosStore.persist.getOptions().partialize(state)));
  usePosStore.setState({ ...data, auditLogs: [], deliveryOrders: [], stockMovements: [], notifications: [], cartItems: [], lastReceiptData: null, cloudConnected: true, cloudHydrating: true, cloudStatus: 'synced', cloudError: null, cloudPending: [], sessionLocked: false });
  usePosStore.setState({ cloudHydrating: false });
  return data.currentUser;
}
