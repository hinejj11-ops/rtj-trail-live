-- Migration 003: per-round scorecard submission, organizer resets, and reliable test reset.
-- Run after 001 and 002. Preserves existing scores and test scores until explicitly reset.
begin;
create table if not exists public.scorecard_submissions (
 round_id text not null, player text not null,
 submitted_at timestamptz not null default now(),
 submitted_by uuid not null,
 primary key(round_id,player)
);
alter table public.scorecard_submissions enable row level security;
grant select on public.scorecard_submissions to authenticated;
drop policy if exists scorecard_submissions_read on public.scorecard_submissions;
create policy scorecard_submissions_read on public.scorecard_submissions
for select to authenticated using(public.active_player() is not null);

-- All destructive operations go through server-side functions; no direct client delete permissions.
revoke delete on public.scores,public.test_scores from authenticated;
drop policy if exists scores_delete on public.scores;
drop policy if exists test_scores_delete on public.test_scores;

create or replace function public.clear_test_scores()
returns integer language plpgsql security definer set search_path=public as $$
declare n integer;
begin
 if public.active_player() is distinct from 'Jimmy' then raise exception 'Only Jimmy can clear test scores'; end if;
 delete from public.test_scores;
 get diagnostics n=row_count;
 return n;
end $$;

-- Reset a single golfer's scorecard for a single round, in the chosen mode.
-- Only Jimmy may reset official scores. A playing-group member may reset test scores.
create or replace function public.reset_player_scorecard(p_round text,p_player text,p_test boolean)
returns integer language plpgsql security definer set search_path=public as $$
declare n integer;
begin
 if p_test then
   if not public.is_active_player(auth.uid(),p_round,p_player) then raise exception 'Not in this playing group'; end if;
   delete from public.test_scores where round_id=p_round and player=p_player;
 else
   if public.active_player() is distinct from 'Jimmy' then raise exception 'Only Jimmy can reset official scorecards'; end if;
   if exists(select 1 from public.scorecard_submissions where round_id=p_round and player=p_player) then
     raise exception 'Scorecard submitted. Unlock it before resetting.';
   end if;
   delete from public.scores where round_id=p_round and player=p_player;
 end if;
 get diagnostics n=row_count;
 return n;
end $$;

create or replace function public.submit_scorecard(p_round text,p_player text,p_holes integer)
returns void language plpgsql security definer set search_path=public as $$
declare n integer;
begin
 if not public.is_active_player(auth.uid(),p_round,p_player) then raise exception 'Not in this playing group'; end if;
 if (select value from public.app_settings where key='test_mode') is distinct from 'false'
    or (select value from public.app_settings where key='scoring_ready') is distinct from 'true' then
   raise exception 'Official scoring must be enabled and test mode disabled';
 end if;
 if not ((p_round = 'backyard' and p_holes = 9)
    or (p_round in ('silver-am','silver-pm','valley','ridge','ross','links','lake','short') and p_holes = 18)) then
   raise exception 'Invalid round or hole count';
 end if;
 select count(*) into n from public.scores where round_id=p_round and player=p_player and hole between 1 and p_holes;
 if n<>p_holes then raise exception 'Scorecard incomplete: % of % holes entered',n,p_holes; end if;
 insert into public.scorecard_submissions(round_id,player,submitted_by)
 values(p_round,p_player,auth.uid()) on conflict(round_id,player) do nothing;
end $$;

create or replace function public.unlock_scorecard(p_round text,p_player text)
returns void language plpgsql security definer set search_path=public as $$
begin
 if public.active_player() is distinct from 'Jimmy' then raise exception 'Only Jimmy can unlock scorecards'; end if;
 delete from public.scorecard_submissions where round_id=p_round and player=p_player;
end $$;

-- Replace write policies so submitted cards cannot be changed via direct table access.
drop policy if exists scores_insert on public.scores;
drop policy if exists scores_update on public.scores;
create policy scores_insert on public.scores for insert to authenticated with check(
 public.is_active_player(auth.uid(),round_id,player)
 and not exists(select 1 from public.scorecard_submissions s where s.round_id=scores.round_id and s.player=scores.player)
 and exists(select 1 from public.app_settings where key='scoring_ready' and value='true')
 and exists(select 1 from public.app_settings where key='test_mode' and value='false')
);
create policy scores_update on public.scores for update to authenticated using(
 public.is_active_player(auth.uid(),round_id,player)
 and not exists(select 1 from public.scorecard_submissions s where s.round_id=scores.round_id and s.player=scores.player)
 and exists(select 1 from public.app_settings where key='scoring_ready' and value='true')
 and exists(select 1 from public.app_settings where key='test_mode' and value='false')
) with check(
 public.is_active_player(auth.uid(),round_id,player)
 and not exists(select 1 from public.scorecard_submissions s where s.round_id=scores.round_id and s.player=scores.player)
 and exists(select 1 from public.app_settings where key='scoring_ready' and value='true')
 and exists(select 1 from public.app_settings where key='test_mode' and value='false')
);

-- Disallow switching to official readiness while test mode is enabled.
create or replace function public.set_scoring_ready(p_ready boolean)
returns void language plpgsql security definer set search_path=public as $$
begin
 if public.active_player() is distinct from 'Jimmy' then raise exception 'Only Jimmy may change readiness'; end if;
 if p_ready and (select value from public.app_settings where key='test_mode')='true'
 then raise exception 'Disable test mode before enabling official scoring'; end if;
 update public.app_settings set value=case when p_ready then 'true' else 'false' end where key='scoring_ready';
end $$;

revoke all on function public.clear_test_scores(),
 public.reset_player_scorecard(text,text,boolean),
 public.submit_scorecard(text,text,integer),
 public.unlock_scorecard(text,text) from public,anon;
grant execute on function public.clear_test_scores(),
 public.reset_player_scorecard(text,text,boolean),
 public.submit_scorecard(text,text,integer),
 public.unlock_scorecard(text,text) to authenticated;
do $$begin alter publication supabase_realtime add table public.scorecard_submissions;
exception when duplicate_object then null;end$$;
commit;
