-- Migration 004: organizer-controlled skills with explicit round locking.
-- Run after migrations 001-003 in the Supabase SQL Editor.
begin;
create table if not exists public.skills_round_locks (
 round_id text primary key,
 locked_at timestamptz not null default now(),
 locked_by uuid not null
);
alter table public.skills_round_locks enable row level security;
grant select on public.skills_round_locks to authenticated;
drop policy if exists skills_round_locks_read on public.skills_round_locks;
create policy skills_round_locks_read on public.skills_round_locks
 for select to authenticated using(public.active_player() is not null);

-- Revoke client writes; all modifications must go through Jimmy-only RPCs.
revoke insert,update,delete on public.skills from authenticated;
drop policy if exists "write skills" on public.skills;
drop policy if exists "update skills" on public.skills;
drop policy if exists skills_insert on public.skills;
drop policy if exists skills_update on public.skills;
drop policy if exists skills_delete on public.skills;

create or replace function public.set_skill_winner(p_round text,p_kind text,p_winner text)
returns void language plpgsql security definer set search_path=public as $$
declare is_wild boolean;
begin
 if public.active_player() is distinct from 'Jimmy' then raise exception 'Only Jimmy can edit skills results'; end if;
 if p_round not in ('silver-am','silver-pm','valley','ridge','ross','backyard','links','lake','short')
 or p_kind not in ('ctp','ld') or (p_kind='ld' and p_round in ('backyard','short')) then
  raise exception 'Invalid skills contest';
 end if;
 if exists(select 1 from public.skills_round_locks where round_id=p_round) then
  raise exception 'Skills results are locked. Unlock this round first.';
 end if;
 is_wild:=p_round in ('valley','ridge','ross','backyard');
 if nullif(p_winner,'') is not null and
    (p_winner not in ('Jimmy','Brittany','Kevin','Jeff','Nate','Richie','Mason')
     or (p_winner='Mason' and not is_wild)) then
  raise exception 'Golfer not eligible for this contest';
 end if;
 if nullif(p_winner,'') is null then
  delete from public.skills where round_id=p_round and kind=p_kind;
 else
  insert into public.skills(round_id,kind,winner,updated_by,updated_at)
  values(p_round,p_kind,p_winner,auth.uid(),now())
  on conflict(round_id,kind) do update
   set winner=excluded.winner,updated_by=excluded.updated_by,updated_at=now();
 end if;
end $$;

create or replace function public.set_skills_round_lock(p_round text,p_locked boolean)
returns void language plpgsql security definer set search_path=public as $$
declare required_count integer; actual_count integer;
begin
 if public.active_player() is distinct from 'Jimmy' then raise exception 'Only Jimmy can lock skills results'; end if;
 if p_round not in ('silver-am','silver-pm','valley','ridge','ross','backyard','links','lake','short') then
  raise exception 'Invalid round';
 end if;
 if p_locked then
  required_count:=case when p_round in ('backyard','short') then 1 else 2 end;
  select count(*) into actual_count from public.skills
   where round_id=p_round and kind in ('ctp','ld') and winner<>'';
  if actual_count<>required_count then
   raise exception 'Select a winner for every designated contest before locking (% of % recorded)',actual_count,required_count;
  end if;
  insert into public.skills_round_locks(round_id,locked_by)
   values(p_round,auth.uid()) on conflict(round_id) do nothing;
 else
  delete from public.skills_round_locks where round_id=p_round;
 end if;
end $$;
revoke all on function public.set_skill_winner(text,text,text) from public;
revoke all on function public.set_skills_round_lock(text,boolean) from public;
grant execute on function public.set_skill_winner(text,text,text) to authenticated;
grant execute on function public.set_skills_round_lock(text,boolean) to authenticated;
commit;
