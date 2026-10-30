-- Run in Supabase SQL Editor. Enable Authentication > Anonymous sign-ins first.
create table if not exists public.player_sessions(player text primary key,owner uuid not null,last_seen timestamptz not null default now());
create table if not exists public.scores(round_id text not null,player text not null,hole int not null check(hole between 1 and 18),gross int not null check(gross between 1 and 20),lifeline boolean not null default false,updated_by uuid,updated_at timestamptz default now(),primary key(round_id,player,hole));
create table if not exists public.skills(round_id text not null,kind text not null check(kind in ('ctp','ld')),winner text not null,updated_by uuid,updated_at timestamptz default now(),primary key(round_id,kind));
create table if not exists public.course_holes(round_id text not null,hole int not null,par int not null check(par between 3 and 6),stroke_index int not null check(stroke_index between 1 and 18),primary key(round_id,hole));
create table if not exists public.app_settings(key text primary key,value text not null);
insert into public.app_settings(key,value) values('scoring_ready','false') on conflict(key) do nothing;
alter table public.player_sessions enable row level security;
alter table public.scores enable row level security;
alter table public.skills enable row level security;
alter table public.course_holes enable row level security;
alter table public.app_settings enable row level security;
create or replace function public.claim_player(p_player text) returns boolean language plpgsql security definer set search_path=public as $$
begin
 if p_player not in ('Jimmy','Brittany','Kevin','Jeff','Nate','Richie','Mason') then return false; end if;
 insert into public.player_sessions(player,owner,last_seen) values(p_player,auth.uid(),now())
 on conflict(player) do update set owner=excluded.owner,last_seen=now()
 where player_sessions.owner=auth.uid() or player_sessions.last_seen<now()-interval '100 seconds';
 return exists(select 1 from public.player_sessions where player=p_player and owner=auth.uid());
end $$;
create or replace function public.heartbeat(p_player text) returns boolean language plpgsql security definer set search_path=public as $$
begin update public.player_sessions set last_seen=now() where player=p_player and owner=auth.uid(); return found; end $$;
create or replace function public.release_player(p_player text) returns void language plpgsql security definer set search_path=public as $$
begin delete from public.player_sessions where player=p_player and owner=auth.uid(); end $$;
create or replace function public.is_active_player(p_owner uuid,p_round text,p_target text) returns boolean language sql security definer stable set search_path=public as $$
select exists(select 1 from public.player_sessions s where s.owner=p_owner and s.last_seen>now()-interval '100 seconds' and (
s.player=p_target or
case p_round
when 'silver-am' then (s.player=any(array['Jimmy','Brittany','Kevin']) and p_target=any(array['Jimmy','Brittany','Kevin'])) or (s.player=any(array['Jeff','Nate','Richie']) and p_target=any(array['Jeff','Nate','Richie']))
when 'silver-pm' then (s.player=any(array['Brittany','Kevin','Richie']) and p_target=any(array['Brittany','Kevin','Richie'])) or (s.player=any(array['Jimmy','Nate','Jeff']) and p_target=any(array['Jimmy','Nate','Jeff']))
when 'valley' then (s.player=any(array['Jimmy','Kevin','Richie']) and p_target=any(array['Jimmy','Kevin','Richie'])) or (s.player=any(array['Brittany','Jeff','Nate','Mason']) and p_target=any(array['Brittany','Jeff','Nate','Mason']))
when 'ridge' then (s.player=any(array['Jimmy','Brittany','Jeff']) and p_target=any(array['Jimmy','Brittany','Jeff'])) or (s.player=any(array['Kevin','Nate','Richie','Mason']) and p_target=any(array['Kevin','Nate','Richie','Mason']))
when 'ross' then (s.player=any(array['Jimmy','Brittany','Jeff']) and p_target=any(array['Jimmy','Brittany','Jeff'])) or (s.player=any(array['Kevin','Nate','Richie','Mason']) and p_target=any(array['Kevin','Nate','Richie','Mason']))
when 'backyard' then p_target=any(array['Jimmy','Brittany','Kevin','Jeff','Nate','Richie','Mason'])
when 'links' then (s.player=any(array['Jimmy','Kevin','Nate']) and p_target=any(array['Jimmy','Kevin','Nate'])) or (s.player=any(array['Brittany','Jeff','Richie']) and p_target=any(array['Brittany','Jeff','Richie']))
when 'lake' then (s.player=any(array['Jimmy','Jeff','Richie']) and p_target=any(array['Jimmy','Jeff','Richie'])) or (s.player=any(array['Brittany','Kevin','Nate']) and p_target=any(array['Brittany','Kevin','Nate']))
when 'short' then p_target=any(array['Jimmy','Brittany','Kevin','Jeff','Nate','Richie'])
else false end
)); $$;
create or replace function public.set_scoring_ready(p_ready boolean) returns void language plpgsql security definer set search_path=public as $$
begin
 if not exists(select 1 from public.player_sessions where player='Jimmy' and owner=auth.uid() and last_seen>now()-interval '100 seconds') then raise exception 'Organizer only'; end if;
 update public.app_settings set value=case when p_ready then 'true' else 'false' end where key='scoring_ready';
end $$;
create policy "read scores" on public.scores for select to authenticated using(true);
create policy "write scores" on public.scores for insert to authenticated with check(public.is_active_player(auth.uid(),round_id,player));
create policy "update scores" on public.scores for update to authenticated using(public.is_active_player(auth.uid(),round_id,player)) with check(public.is_active_player(auth.uid(),round_id,player));
create policy "read skills" on public.skills for select to authenticated using(true);
create policy "write skills" on public.skills for insert to authenticated with check(exists(select 1 from public.player_sessions where owner=auth.uid() and last_seen>now()-interval '100 seconds'));
create policy "update skills" on public.skills for update to authenticated using(true) with check(exists(select 1 from public.player_sessions where owner=auth.uid() and last_seen>now()-interval '100 seconds'));
create policy "read holes" on public.course_holes for select to authenticated using(true);
create policy "write holes" on public.course_holes for insert to authenticated with check(exists(select 1 from public.player_sessions where player='Jimmy' and owner=auth.uid() and last_seen>now()-interval '100 seconds'));
create policy "update holes" on public.course_holes for update to authenticated using(true) with check(exists(select 1 from public.player_sessions where player='Jimmy' and owner=auth.uid() and last_seen>now()-interval '100 seconds'));
create policy "read settings" on public.app_settings for select to authenticated using(true);
revoke all on function public.claim_player(text),public.heartbeat(text),public.release_player(text),public.set_scoring_ready(boolean) from public;
grant execute on function public.claim_player(text),public.heartbeat(text),public.release_player(text),public.set_scoring_ready(boolean),public.is_active_player(uuid,text,text) to authenticated;
do $$begin alter publication supabase_realtime add table public.scores; exception when duplicate_object then null;end$$;
do $$begin alter publication supabase_realtime add table public.skills; exception when duplicate_object then null;end$$;
do $$begin alter publication supabase_realtime add table public.course_holes; exception when duplicate_object then null;end$$;
