-- Organizer-only tournament entry fees, stored for all connected clients.
-- Default: six full-trip golfers pay $75 main + $25 wild; Mason pays $25 wild.
insert into public.app_settings(key,value)
values ('entry_fees','{"main":75,"wild":25}')
on conflict (key) do nothing;

create or replace function public.set_entry_fees(p_main numeric,p_wild numeric)
returns void language plpgsql security definer set search_path=public as $$
begin
  if not exists (
    select 1 from public.player_sessions
    where player='Jimmy' and user_id=auth.uid()
      and last_seen>now()-interval '100 seconds'
  ) then raise exception 'Organizer access required'; end if;
  if p_main is null or p_wild is null or p_main<0 or p_wild<0
     or p_main>10000 or p_wild>10000
     or p_main<>round(p_main,2) or p_wild<>round(p_wild,2)
  then raise exception 'Fees must be between $0 and $10,000 with at most two decimals'; end if;
  insert into public.app_settings(key,value)
  values ('entry_fees',jsonb_build_object('main',p_main,'wild',p_wild)::text)
  on conflict(key) do update set value=excluded.value;
end; $$;
revoke all on function public.set_entry_fees(numeric,numeric) from public,anon;
grant execute on function public.set_entry_fees(numeric,numeric) to authenticated;
