-- Run once in Supabase SQL Editor. No scores or existing settings are deleted.
insert into public.app_settings(key,value) values ('contingency_daily_buyin','20')
on conflict (key) do nothing;

create or replace function public.set_contingency_daily_buyin(p_amount numeric)
returns boolean language plpgsql security definer set search_path=public as $$
begin
 if auth.uid() is null or not exists (
  select 1 from public.player_sessions ps
  where to_jsonb(ps)->>'player'='Jimmy'
  and auth.uid()::text=coalesce(to_jsonb(ps)->>'owner',to_jsonb(ps)->>'user_id',to_jsonb(ps)->>'auth_user_id',to_jsonb(ps)->>'auth_uid')
  and ps.last_seen>now()-interval '100 seconds'
 ) then raise exception 'Only Jimmy can edit contingency buy-ins'; end if;
 if p_amount is null or p_amount<0 or p_amount>1000 or p_amount<>round(p_amount,2)
 then raise exception 'Daily buy-in must be $0 to $1,000 with at most two decimals'; end if;
 insert into public.app_settings(key,value) values ('contingency_daily_buyin',p_amount::text)
 on conflict(key) do update set value=excluded.value;
 return true;
end;$$;
revoke all on function public.set_contingency_daily_buyin(numeric) from public,anon;
grant execute on function public.set_contingency_daily_buyin(numeric) to authenticated;

-- Read-only value for spectators, who cannot select app_settings directly.
create or replace function public.get_contingency_daily_buyin()
returns numeric language sql stable security definer set search_path=public as $$
 select coalesce((select case when value ~ '^([0-9]+)([.][0-9]{1,2})?$' then value::numeric end
 from public.app_settings where key='contingency_daily_buyin'),20);
$$;
revoke all on function public.get_contingency_daily_buyin() from public,anon;
grant execute on function public.get_contingency_daily_buyin() to authenticated;
