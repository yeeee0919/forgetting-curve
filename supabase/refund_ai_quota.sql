-- 既有專案補跑：AI 失敗時退回已預扣的額度
-- 在 Supabase SQL Editor 執行這一段即可

create or replace function public.refund_ai_quota(amount integer)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  used int := 0;
  cap int := 50;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;
  if amount is null or amount < 1 then
    select coalesce((select cards_created from public.ai_usage where user_id = uid), 0) into used;
    return json_build_object('allowed', 0, 'used', used, 'limit', cap, 'remaining', greatest(cap - used, 0));
  end if;

  update public.ai_usage
    set cards_created = greatest(cards_created - amount, 0), updated_at = now()
    where user_id = uid
  returning cards_created into used;

  used := coalesce(used, 0);
  return json_build_object(
    'allowed', 0,
    'used', used,
    'limit', cap,
    'remaining', greatest(cap - used, 0)
  );
end;
$$;

revoke all on function public.refund_ai_quota(integer) from public;
grant execute on function public.refund_ai_quota(integer) to authenticated;
