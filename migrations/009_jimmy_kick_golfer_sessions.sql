-- Run in Supabase SQL Editor before using Jimmy's login management controls.
-- Access is checked in the database, not merely by hiding buttons in the browser.
create or replace function public.list_active_golfer_sessions()
returns text[]
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null or not exists (
    select 1 from public.player_sessions
    where player = 'Jimmy' and owner = auth.uid()
      and last_seen > now() - interval '100 seconds'
  ) then raise exception 'Organizer only'; end if;
  return coalesce((select array_agg(player order by player)
    from public.player_sessions
    where last_seen > now() - interval '100 seconds'), array[]::text[]);
end;
$$;

create or replace function public.kick_golfer_session(p_player text)
returns boolean
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null or not exists (
    select 1 from public.player_sessions
    where player = 'Jimmy' and owner = auth.uid()
      and last_seen > now() - interval '100 seconds'
  ) then raise exception 'Organizer only'; end if;
  if p_player is null or p_player not in ('Brittany','Kevin','Jeff','Nate','Richie','Mason') then
    raise exception 'Invalid golfer';
  end if;
  delete from public.player_sessions where player = p_player;
  return found;
end;
$$;

revoke all on function public.list_active_golfer_sessions(), public.kick_golfer_session(text) from public, anon;
grant execute on function public.list_active_golfer_sessions(), public.kick_golfer_session(text) to authenticated;
