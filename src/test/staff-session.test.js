import { describe, it, expect } from 'vitest';
import { canResumePending } from '@/lib/pos/session';

describe('Pending transaction identity on staff login', () => {
  const profile = { id: 'staff-a', outlet_id: 'outlet-a' };
  const state = { currentUser: { id: 'staff-a' }, outlet: { id: 'outlet-a' }, cloudPending: [{ actor_id: 'staff-a', outlet_id: 'outlet-a' }] };
  it('allows the original staff to resume unsynced transactions after session expiry', () => {
    expect(canResumePending(state, profile)).toBe(true);
  });
  it('rejects another staff member or a changed outlet assignment', () => {
    expect(canResumePending(state, { ...profile, id: 'staff-b' })).toBe(false);
    expect(canResumePending(state, { ...profile, outlet_id: 'outlet-b' })).toBe(false);
  });
  it('checks every queued record, not just the cached current user', () => {
    expect(canResumePending({ ...state, cloudPending: [...state.cloudPending, { actor_id: 'staff-b', outlet_id: 'outlet-a' }] }, profile)).toBe(false);
  });
});
