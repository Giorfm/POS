# Main dashboard agent handoff: POS staff performance

Connect this separately hosted dashboard to the POS using the shared Supabase project `fanhcjlfgqksdlolsmnk` (Nived super app). Do not create a second database or duplicate demo staff.

## Current implementation

The POS workspace is `/Users/tabaniii/Herd/POS`. It now has authenticated cloud connection, durable local retry queues, and an atomic server-only `pos_save_records(p_actor uuid, p_data jsonb)` RPC. Migrations already applied to the shared project:

- `20261022012658_staff_performance_sync.sql`
- `20261022013327_staff_sync_access_hardening.sql`

The actual hosted schema differs from this repo's original standalone demo migration. In the shared schema `profiles.id` references `auth.users.id`, staff names are `profiles.full_name`, and POS records have `merchant_id`. Do not run the old `seed.sql` or rebuild the shared database from the standalone init migration.

At inspection there was one admin profile, one merchant, two cards, and no outlets, staff, products, transactions, or shifts. No test business data was left behind.

## Implement in the main dashboard

1. Add outlet setup using the existing merchant. Create an `outlets` row with the correct `merchant_id` and business settings. Do not guess which business or outlet name the user wants.
2. Add staff management using Supabase Auth's server-side Admin API. Create individual accounts, then assign `profiles.full_name`, `role`, `merchant_id`, `outlet_id`, `is_active=true`. Roles for POS: `owner`, `manager`, `cashier`, `waiter`, `kitchen`; `admin` can also connect if explicitly assigned an outlet. Staff must log in with email/password at `/login` before accessing any staff POS page or KDS. There is no demo login or self-registration UI. Only a valid, active, assigned profile can enter. Super admin must create accounts through the authorized dashboard server; do not expose Auth Admin API credentials in the browser.
3. Provision the real catalog, categories, tables/areas, modifier groups/options, and recipe/ingredient records for that outlet. Cloud connection loads those records and backs up local demo state without importing it. Existing local master-data editors are not a cloud catalog-management interface yet; keep catalog management in this dashboard.
4. Build a merchant/outlet/date-filtered performance dashboard with staff rows, drill-down to payment receipts, orders, and shifts. Include staff with zero activity, and show unattributed historical/system records separately.
5. Add a cash variance review list. Cloud shift closure saves an unapproved variance (`approved_by=null`); it does not pretend the cashier has manager approval. If adding approval, enforce manager role and merchant/outlet access on the server and append an audit record.
6. Read the records from Supabase on the dashboard server with validated session authorization and explicit merchant/outlet filters. Never expose a service key in frontend code. The dashboard is hosted separately; direct shared-database reads avoid browser CORS dependence on the POS host. Refresh after navigation and periodically, or add scoped Realtime subscriptions/publication as a separate verified change.

## Tables and identity rules

- `profiles`: `id`, `full_name`, `role`, `merchant_id`, `outlet_id`, `is_active`.
- `orders`: order creator is `user_id`; originating `shift_id`, `merchant_id`, `outlet_id`, order number/type/source/status, subtotal/discount/tax/service/total, timestamps, version.
- `order_items` and `order_item_modifiers`: purchased items, modifier snapshots and kitchen status/timestamps.
- `bills`: child of `orders`; supports split bills. Cancelled prior bills remain as records when splitting.
- `payments`: `user_id` is **the collector**, `shift_id` is **the collector's shift**. These columns were added by the first migration. Also contains `order_id`, `bill_id`, `merchant_id`, method, amount, tendered amount/change, status, idempotency key, paid_at. Never infer collector from order creator or timestamp overlap.
- `shifts`: employee `user_id`, outlet/merchant, opened_at/closed_at, opening_cash, expected_cash, actual_cash, variance, status, approved_by, notes. One open shift per staff/outlet.
- `cash_movements`: shift_id/user_id/outlet_id/merchant_id, type (`in`/`out`), amount, reason.
- `audit_logs`: actor, action, entity, entity_id, reason, before/after when supplied, created_at.
- `pos_sync_events`: server receipt metadata for idempotent sync (not a full snapshot/event-sourcing history).

Cashiers may work concurrently. Never calculate a cashier's cash sales as all payments after the shift start.

## Metric definitions

Use `[from, to)` timestamp bounds. Convert the selected business dates in Asia/Jakarta into UTC instants; do not use server-local midnight.

- Successful receipts: count payments where status=`success`, filtering paid_at. Split bills count as separate payment receipts; display this separately from distinct paid orders.
- Collected: sum successful payment amounts. Includes tax and service, excludes change; do not sum tendered_amount.
- Net collected equals the successful-payment total, since fully refunded rows are already excluded; do not subtract refunds a second time. Original collected is successful plus refunded amounts.
- Refunded: current refunded payment amounts, attributed to their original paid_at. Refund-event-date reporting is not implemented; do not label it as such.
- Average receipt: collected / successful receipts, or 0 when no receipts.
- Hours: overlap of each staff shift with the date interval, using now for an open shift. Cap at now and never allow negative duration.
- Collected/hour: collected / overlap hours; return null when no recorded hours.
- Cash variance: sum variance for shifts closed in the interval. Keep positive and negative differences visible in shift details.
- Expected cash: opening cash + successful cash payments with matching shift_id + cash in - cash out. Database recalculates this at closure.
- Do not count sent/unpaid orders as collected sales. Do not multiply order totals by joining many bill/payment/item rows and summing an expanded join.
- Attribute order creation and kitchen actions separately from payment collection. Sales collected alone is not a complete score for waiters or kitchen staff.

Reference implementation: `src/lib/pos/performance.js`; tests: `src/test/staff-performance.test.js`.

## Optional POS HTTP APIs

The POS provides real data at:

- `GET /api/v1/staff-performance?from=<ISO timestamp>&to=<ISO timestamp>`
- `GET /api/v1/sales?from=...&to=...&channel=takeaway&status=completed&limit=20&offset=0`
- `GET /api/v1/shifts?from=...&to=...` (filters by opened_at)
- `GET /api/v1/summary?from=...&to=...`

Server-to-server authentication: configure `MAIN_DASHBOARD_API_KEY` and `MAIN_DASHBOARD_OUTLET_ID` on the POS host, and send `X-API-Key`. No default key or query-string key is accepted. The key is scoped to that configured outlet. Alternatively use `Authorization: Bearer <Supabase access token>` for an assigned owner/manager/admin profile (its assigned outlet is the scope).

The response contracts replace sample endpoints; inspect current route code rather than relying on the old API document's sample payloads. `/api/v1/inventory` remains the original demo endpoint and is outside this integration.

## Security changes relevant to this dashboard

Public demo policies were removed from POS tables. POS writes now require server access; exposed reads are scoped to the authenticated merchant/outlet. Child tables (bills/items/modifiers) and pos_sync_events are server-only with RLS enabled and no public grants. Use a properly authorized dashboard server endpoint for joined detail views and staff roster.

`profiles` UPDATE grants no longer allow clients to assign themselves role, merchant, or outlet. Admin staff management must run on the authorized server. Account-creation authorization claims now come from **raw_app_meta_data**, never raw_user_meta_data; names can still come from user metadata. Existing account assignments were not changed.

Do not relax these policies to make a query work. Review the dashboard's existing onboarding code if it previously passed role/merchant in user metadata.

## Boundaries and acceptance checks

This implements the connected staff-operated POS transaction/shift path. Customer QR ordering, delivery-provider simulators/webhooks, QRIS mock settlement, manager-PIN discount/void approval and local catalog editing are not production cloud integrations. Delivery simulation is blocked when connected. Never present demo webhook results as verified external settlements. Extend those flows with provider verification and explicit system/staff attribution before enabling them in live operations.

The retry queue survives refresh on the same browser, but cannot survive clearing browser storage or losing the device before synchronization. Show the pending/error indicator and do not claim a pending record is saved remotely. Account switching is blocked until pending records sync. Multi-device editing needs conflict handling; the RPC rejects stale order timestamps/versions instead of intentionally merging them. After sync, log out and sign in again to reload cloud records. Unsynced records require the original staff account and outlet; they are preserved across session expiry. No automated import of old local demo history is performed.

Verify: create two real staff accounts; connect each; open separate shifts; create/pay split bills; close shifts with known cash totals; confirm dashboard attribution and period boundaries; retry the same sync batch and confirm one payment; verify cross-merchant access is denied. Use SQL fixtures only in rollback transactions. `supabase/tests/staff_sync.sql` is the integration verification script.

## Required login flow (2026-10-22)

The POS now requires login first; a cached local profile does not grant access. `/api/pos/session` validates the Supabase token and staff assignment on the server. Accounts are provisioned by super admin in the separate dashboard, with email/password, role, merchant, outlet, and active status. Disable public Supabase signup in the Auth settings if the shared project no longer needs customer self-registration; this project-wide setting is not changed by the POS login UI. Even an unassigned self-created Auth account cannot access POS. Customer `/t/[token]` pages remain separate public customer pages, not staff POS access.
