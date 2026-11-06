-- Apply in Supabase SQL Editor before selecting Backup Mode.
-- No scores, submissions, skills or prior settings are modified.
create or replace function public.set_championship_mode(p_mode text)
returns boolean language plpgsql security definer set search_path=public as $$
begin
 if p_mode not in ('original','contingency','backup') then raise exception 'Invalid championship mode'; end if;
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

-- Spectator-safe read of the active mode; return all three values unchanged.
create or replace function public.get_championship_mode()
returns text language sql stable security definer set search_path=public as $$
 select case when value in ('original','contingency','backup') then value else 'original' end
 from public.app_settings where key='championship_mode'
 union all select 'original' where not exists (select 1 from public.app_settings where key='championship_mode')
 limit 1;
$$;
revoke all on function public.get_championship_mode() from public,anon;
grant execute on function public.get_championship_mode() to authenticated;
