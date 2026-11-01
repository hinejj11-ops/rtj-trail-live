-- Apply manually in Supabase SQL Editor before activating contingency mode.
-- Existing app_settings reads remain unchanged; no scores are touched.
insert into public.app_settings(key,value) values ('championship_mode','original')
on conflict (key) do nothing;
create or replace function public.set_championship_mode(p_mode text)
returns boolean language plpgsql security definer set search_path=public as $$
begin
 if p_mode not in ('original','contingency') then raise exception 'Invalid championship mode'; end if;
 if auth.uid() is null or not exists (
  select 1 from public.player_sessions ps
  where to_jsonb(ps)->>'player'='Jimmy'
  and auth.uid()::text=coalesce(to_jsonb(ps)->>'owner',to_jsonb(ps)->>'user_id',to_jsonb(ps)->>'auth_user_id',to_jsonb(ps)->>'auth_uid')
  and ps.last_seen > now() - interval '100 seconds'
 ) then raise exception 'Only Jimmy can switch championship mode'; end if;
 insert into public.app_settings(key,value) values ('championship_mode',p_mode)
 on conflict (key) do update set value=excluded.value;
 return true;
end;$$;
revoke all on function public.set_championship_mode(text) from public,anon;
grant execute on function public.set_championship_mode(text) to authenticated;
