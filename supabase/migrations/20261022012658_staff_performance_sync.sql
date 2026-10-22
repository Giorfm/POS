-- Shared Nived schema: profiles.id is auth.users.id, full_name is the staff name.
-- Forward migration against the shared database (not the older standalone demo seed).
alter table public.payments add column if not exists user_id uuid references public.profiles(id) on delete restrict;
alter table public.payments add column if not exists shift_id uuid references public.shifts(id) on delete restrict;
create index if not exists payments_staff_paid_idx on public.payments(user_id, paid_at);
create index if not exists payments_shift_idx on public.payments(shift_id);
create index if not exists orders_outlet_created_idx on public.orders(outlet_id, created_at);
create index if not exists shifts_outlet_opened_idx on public.shifts(outlet_id, opened_at);
create unique index if not exists shifts_one_open_per_staff on public.shifts(outlet_id,user_id) where status='open';

-- Idempotent transaction batches and durable operation history. No customer data in events.
create table if not exists public.pos_sync_events (
  id uuid primary key, merchant_id uuid not null references public.merchants(id),
  outlet_id uuid not null references public.outlets(id), user_id uuid not null references public.profiles(id),
  entity text not null, entity_id uuid not null, recorded_at timestamptz not null default now()
);
alter table public.pos_sync_events enable row level security;
revoke all on public.pos_sync_events from anon, authenticated;
grant all on public.pos_sync_events to service_role;

-- Staff can read their outlet; the external dashboard can read its merchant.
-- Writes go through authenticated server endpoints and the atomic RPC below.
-- Remove permissive demo policies only, preserving existing dashboard policies.
do $$ declare p record; t text; begin
  for p in select tablename,policyname from pg_policies where schemaname='public' and policyname like 'Public %' loop
    execute format('drop policy %I on public.%I',p.policyname,p.tablename);
  end loop;
  foreach t in array array['outlets','areas','tables','categories','products','modifier_groups','ingredients','recipes','shifts','orders','payments','cash_movements','audit_logs','delivery_orders','purchase_orders','stock_movements','table_merges','sku_mappings','notifications'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('revoke insert, update, delete on public.%I from anon, authenticated',t);
    execute format('grant select on public.%I to authenticated',t);
    if t in ('payments','delivery_orders') then
      execute format('create policy pos_merchant_read on public.%I for select to authenticated using (exists(select 1 from public.orders o where o.id=order_id))',t);
      continue;
    end if;
    execute format('create policy pos_merchant_read on public.%I for select to authenticated using (exists (select 1 from public.profiles p where p.id=(select auth.uid()) and p.is_active and (p.role=''admin'' or (p.merchant_id=%I.merchant_id and (p.role in (''owner'',''manager'',''client'') or p.outlet_id=%I.%I)))))',t,t,t,case when t='outlets' then 'id' when t in ('payments','delivery_orders') then 'merchant_id' else 'outlet_id' end);
  end loop;
  -- Child records are read through scoped server endpoints, not public access.
  foreach t in array array['bills','bill_items','order_items','order_item_modifiers','modifier_options','product_modifier_groups','purchase_order_items'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('revoke all on public.%I from anon, authenticated',t);
  end loop;
end $$;
-- Prevent self-service role/merchant reassignment through the existing own-profile UPDATE policy.
revoke update on public.profiles from authenticated;
grant update(full_name) on public.profiles to authenticated;

create or replace function public.pos_save_records(p_actor uuid, p_data jsonb) returns void
language plpgsql security invoker set search_path = public, pg_temp as $$
declare
  actor public.profiles; e jsonb; r jsonb; child jsonb; modifier jsonb; t text; cols text; vals text; updates text;
  rec_id uuid; existing jsonb; scope_id uuid; parent_id uuid; shift_row public.shifts;
  event_id uuid; cash_total numeric; moved numeric; expected numeric;
begin
  select * into actor from public.profiles where id=p_actor and is_active;
  if actor.id is null or actor.outlet_id is null or actor.merchant_id is null then raise exception 'Staff outlet assignment required'; end if;
  if not exists(select 1 from public.outlets where id=actor.outlet_id and merchant_id=actor.merchant_id) then raise exception 'Invalid outlet'; end if;
  perform pg_advisory_xact_lock(hashtextextended(actor.outlet_id::text,0));
  if jsonb_typeof(p_data->'records') <> 'array' or jsonb_array_length(p_data->'records')>100 then raise exception 'Invalid batch'; end if;
  -- Keep original event order: opening/closing a shift and paying are ordered business actions.
  for e in select value from jsonb_array_elements(p_data->'records') loop
    event_id := (e->>'event_id')::uuid;
    if exists(select 1 from public.pos_sync_events where id=event_id and user_id=p_actor) then continue; end if;
    if (e->>'actor_id')::uuid is distinct from p_actor or (e->>'outlet_id')::uuid is distinct from actor.outlet_id then raise exception 'Wrong staff or outlet'; end if;
    t := e->>'table'; r := e->'record'; rec_id := (r->>'id')::uuid;
    if t not in ('shifts','orders','bills','payments','cash_movements','audit_logs') or rec_id is null then raise exception 'Unsupported record'; end if;
    execute format('select to_jsonb(x) from public.%I x where id=$1',t) into existing using rec_id;
    if t in ('shifts','orders','audit_logs') then
      if (r->>'outlet_id')::uuid is distinct from actor.outlet_id then raise exception 'Wrong outlet'; end if;
      if existing is not null and (existing->>'outlet_id')::uuid is distinct from actor.outlet_id then raise exception 'Record belongs to another outlet'; end if;
    else
      if t='cash_movements' then
        select outlet_id into scope_id from public.shifts where id=(r->>'shift_id')::uuid;
      else
        select outlet_id into scope_id from public.orders where id=(r->>'order_id')::uuid;
      end if;
      if scope_id is distinct from actor.outlet_id then raise exception 'Invalid parent outlet'; end if;
      if existing is not null and ((t='cash_movements' and existing->>'shift_id' is distinct from r->>'shift_id') or (t in ('bills','payments') and existing->>'order_id' is distinct from r->>'order_id')) then raise exception 'Cannot change parent'; end if;
    end if;
    if t in ('shifts','payments','cash_movements','audit_logs') and (r->>'user_id')::uuid is distinct from p_actor then raise exception 'Cannot attribute another staff member'; end if;
    if t='orders' then
      if existing is null and (r->>'user_id')::uuid is distinct from p_actor then raise exception 'Order creator must be signed-in staff'; end if;
      if existing is not null and (existing->>'user_id' is distinct from r->>'user_id' or existing->>'shift_id' is distinct from r->>'shift_id') then raise exception 'Cannot reassign order'; end if;
      if existing is not null and (existing->>'version')::integer > (r->>'version')::integer then raise exception 'Stale order. Reload before editing.'; end if;
      if r->>'table_id' is not null and not exists(select 1 from public.tables where id=(r->>'table_id')::uuid and outlet_id=actor.outlet_id) then raise exception 'Invalid table'; end if;
    end if;
    if t in ('orders','payments','cash_movements') then
      select * into shift_row from public.shifts where id=(r->>'shift_id')::uuid;
      if shift_row.id is null or shift_row.outlet_id<>actor.outlet_id then raise exception 'Valid shift required'; end if;
      if t in ('payments','cash_movements') and (shift_row.user_id<>p_actor or shift_row.status<>'open') and existing is null then raise exception 'Open your own shift first'; end if;
    end if;
    if t='payments' then
      if not exists(select 1 from public.bills where id=(r->>'bill_id')::uuid and order_id=(r->>'order_id')::uuid and amount=(r->>'amount')::numeric and status<>'cancelled') then raise exception 'Payment does not match bill'; end if;
      if existing is null and exists(select 1 from public.payments where bill_id=(r->>'bill_id')::uuid and status='success') then raise exception 'Bill already paid'; end if;
      if existing is not null then
        if (existing->>'amount')::numeric is distinct from (r->>'amount')::numeric or existing->>'user_id' is distinct from r->>'user_id' then raise exception 'Payment is immutable'; end if;
        continue;
      end if;
      if (r->>'amount')::numeric < 0 or r->>'status'<>'success' then raise exception 'Invalid payment'; end if;
    end if;
    if t='shifts' then
      if (r->>'opening_cash')::numeric < 0 or (r->>'actual_cash')::numeric < 0 then raise exception 'Invalid cash amount'; end if;
      if existing is not null and (existing->>'user_id' is distinct from r->>'user_id' or existing->>'opening_cash' is distinct from ((r->>'opening_cash')::numeric)::text) then
        -- Numeric comparison accommodates JSON number formatting.
        if existing->>'user_id' is distinct from r->>'user_id' or (existing->>'opening_cash')::numeric <> (r->>'opening_cash')::numeric then raise exception 'Cannot reassign shift or opening cash'; end if;
      end if;
      if existing->>'status'='closed' then raise exception 'Closed shift is immutable'; end if;
      if r->>'status'='closed' then
        select coalesce(sum(amount),0) into cash_total from public.payments where shift_id=rec_id and method='cash' and status='success';
        select coalesce(sum(case when type='in' then amount else -amount end),0) into moved from public.cash_movements where shift_id=rec_id;
        expected := (r->>'opening_cash')::numeric + cash_total + moved;
        r := r || jsonb_build_object('expected_cash',expected,'variance',(r->>'actual_cash')::numeric-expected,'approved_by',null);
      end if;
    end if;
    if t='cash_movements' and ((r->>'amount')::numeric<=0 or coalesce(trim(r->>'reason'),'')='') then raise exception 'Cash movement requires positive amount and reason'; end if;
    if existing is not null and t in ('cash_movements','audit_logs') then continue; end if;
    r := r || jsonb_build_object('merchant_id',actor.merchant_id);
    if t='cash_movements' then r := r || jsonb_build_object('outlet_id',actor.outlet_id); end if;
    select string_agg(format('%I',a.attname),','), string_agg(format('x.%I',a.attname),','), string_agg(format('%1$I=excluded.%1$I',a.attname),',') filter(where a.attname<>'id')
      into cols,vals,updates from pg_attribute a where a.attrelid=format('public.%I',t)::regclass and a.attnum>0 and not a.attisdropped and r ? a.attname;
    execute format('insert into public.%1$I (%2$s) select %3$s from jsonb_populate_record(null::public.%1$I,$1) x on conflict(id) do update set %4$s',t,cols,vals,updates) using r;
    if t='orders' then
      for child in select value from jsonb_array_elements(coalesce(r->'items','[]')) loop
        if exists(select 1 from public.order_items where id=(child->>'id')::uuid and order_id<>rec_id) then raise exception 'Item belongs to another order'; end if;
        if not exists(select 1 from public.products where id=(child->>'product_id')::uuid and outlet_id=actor.outlet_id) then raise exception 'Invalid product'; end if;
        insert into public.order_items(id,order_id,product_id,name_snapshot,price_snapshot,qty,notes,status,is_additional,sent_at,ready_at,served_at)
        values((child->>'id')::uuid,rec_id,(child->>'product_id')::uuid,child->>'name_snapshot',(child->>'price_snapshot')::numeric,(child->>'qty')::integer,child->>'notes',child->>'status',coalesce((child->>'is_additional')::boolean,false),(child->>'sent_at')::timestamptz,(child->>'ready_at')::timestamptz,(child->>'served_at')::timestamptz)
        on conflict(id) do update set qty=excluded.qty,notes=excluded.notes,status=excluded.status,sent_at=excluded.sent_at,ready_at=excluded.ready_at,served_at=excluded.served_at;
        delete from public.order_item_modifiers where order_item_id=(child->>'id')::uuid;
        for modifier in select value from jsonb_array_elements(coalesce(child->'modifiers','[]')) loop
          if not exists(select 1 from public.modifier_options mo join public.modifier_groups mg on mg.id=mo.group_id where mo.id=(modifier->>'option_id')::uuid and mg.outlet_id=actor.outlet_id) then raise exception 'Invalid modifier'; end if;
          insert into public.order_item_modifiers(order_item_id,option_id,name_snapshot,price_delta) values((child->>'id')::uuid,(modifier->>'option_id')::uuid,coalesce(modifier->>'name_snapshot',modifier->>'name'),(modifier->>'price_delta')::numeric);
        end loop;
      end loop;
    end if;
    insert into public.pos_sync_events(id,merchant_id,outlet_id,user_id,entity,entity_id) values(event_id,actor.merchant_id,actor.outlet_id,p_actor,t,rec_id);
  end loop;
end $$;
revoke all on function public.pos_save_records(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.pos_save_records(uuid,jsonb) to service_role;
