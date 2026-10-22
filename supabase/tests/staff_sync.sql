-- Run against the shared schema. Everything is rolled back, including test accounts.
begin;
do $$
declare m uuid:=gen_random_uuid(); o uuid:=gen_random_uuid(); u uuid:=gen_random_uuid(); s uuid:=gen_random_uuid(); ord uuid:=gen_random_uuid(); b uuid:=gen_random_uuid(); pay uuid:=gen_random_uuid(); payload jsonb; rows integer; bad jsonb;
begin
  insert into merchants(id,business_name,owner_name) values(m,'POS integration test','Test');
  insert into outlets(id,name,merchant_id) values(o,'Test outlet',m);
  insert into auth.users(id,email) values(u,'pos-test-'||u||'@example.invalid');
  update profiles set role='cashier',full_name='Test cashier',merchant_id=m,outlet_id=o,is_active=true where id=u;
  payload:=jsonb_build_object('records',jsonb_build_array(
    jsonb_build_object('event_id',gen_random_uuid(),'actor_id',u,'outlet_id',o,'table','shifts','record',jsonb_build_object('id',s,'outlet_id',o,'user_id',u,'opening_cash',100,'actual_cash',0,'status','open','opened_at',now())),
    jsonb_build_object('event_id',gen_random_uuid(),'actor_id',u,'outlet_id',o,'table','orders','record',jsonb_build_object('id',ord,'outlet_id',o,'user_id',u,'shift_id',s,'order_number','TEST-'||ord,'type','takeaway','source','pos','status','open','total',50,'version',1)),
    jsonb_build_object('event_id',gen_random_uuid(),'actor_id',u,'outlet_id',o,'table','bills','record',jsonb_build_object('id',b,'order_id',ord,'amount',50,'status','pending')),
    jsonb_build_object('event_id',gen_random_uuid(),'actor_id',u,'outlet_id',o,'table','payments','record',jsonb_build_object('id',pay,'bill_id',b,'order_id',ord,'user_id',u,'shift_id',s,'method','cash','amount',50,'status','success','idempotency_key',pay,'paid_at',now()))
  ));
  perform pos_save_records(u,payload);
  perform pos_save_records(u,payload);
  select count(*) into rows from payments where id=pay and user_id=u and shift_id=s;
  if rows<>1 then raise exception 'Retry duplicated payment'; end if;
  bad:=jsonb_build_object('records',jsonb_build_array(jsonb_build_object('event_id',gen_random_uuid(),'actor_id',gen_random_uuid(),'outlet_id',o,'table','shifts','record',jsonb_build_object('id',s))));
  begin perform pos_save_records(u,bad); raise exception 'TEST FAILED: wrong actor accepted'; exception when others then if sqlerrm like 'TEST FAILED%' then raise; end if; end;
  perform pos_save_records(u,jsonb_build_object('records',jsonb_build_array(jsonb_build_object('event_id',gen_random_uuid(),'actor_id',u,'outlet_id',o,'table','shifts','record',jsonb_build_object('id',s,'outlet_id',o,'user_id',u,'opening_cash',100,'actual_cash',145,'status','closed','closed_at',now())))));
  if not exists(select 1 from shifts where id=s and expected_cash=150 and variance=-5 and approved_by is null) then raise exception 'Cash reconciliation incorrect'; end if;
  if has_function_privilege('anon','public.pos_save_records(uuid,jsonb)','EXECUTE') or has_function_privilege('authenticated','public.pos_save_records(uuid,jsonb)','EXECUTE') then raise exception 'Public RPC execution allowed'; end if;
end $$;
rollback;
select 'PASS: atomic sync, idempotency, staff validation, cash variance, RPC permissions; test data rolled back' as result;
