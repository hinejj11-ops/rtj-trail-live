-- Migration 005: Jimmy is the sole scorecard editor for all rounds and players.
-- Run after migrations 001-004. Preserves all existing score data and submissions.
begin;
-- Rebuild direct score write policies to require Jimmy's active session.
drop policy if exists scores_insert on public.scores;
drop policy if exists scores_update on public.scores;
drop policy if exists "write scores" on public.scores;
drop policy if exists "update scores" on public.scores;
create policy scores_insert on public.scores for insert to authenticated with check(
 public.active_player()='Jimmy'
 and not exists(select 1 from public.scorecard_submissions s where s.round_id=scores.round_id and s.player=scores.player)
 and exists(select 1 from public.app_settings where key='scoring_ready' and value='true')
 and exists(select 1 from public.app_settings where key='test_mode' and value='false')
);
create policy scores_update on public.scores for update to authenticated using(
 public.active_player()='Jimmy'
 and not exists(select 1 from public.scorecard_submissions s where s.round_id=scores.round_id and s.player=scores.player)
 and exists(select 1 from public.app_settings where key='scoring_ready' and value='true')
 and exists(select 1 from public.app_settings where key='test_mode' and value='false')
) with check(
 public.active_player()='Jimmy'
 and not exists(select 1 from public.scorecard_submissions s where s.round_id=scores.round_id and s.player=scores.player)
 and exists(select 1 from public.app_settings where key='scoring_ready' and value='true')
 and exists(select 1 from public.app_settings where key='test_mode' and value='false')
);
drop policy if exists test_scores_insert on public.test_scores;
drop policy if exists test_scores_update on public.test_scores;
create policy test_scores_insert on public.test_scores for insert to authenticated with check(
 public.active_player()='Jimmy'
 and exists(select 1 from public.app_settings where key='test_mode' and value='true')
);
create policy test_scores_update on public.test_scores for update to authenticated using(
 public.active_player()='Jimmy'
 and exists(select 1 from public.app_settings where key='test_mode' and value='true')
) with check(
 public.active_player()='Jimmy'
 and exists(select 1 from public.app_settings where key='test_mode' and value='true')
);
create or replace function public.reset_player_scorecard(p_round text,p_player text,p_test boolean)
returns integer language plpgsql security definer set search_path=public as $$
declare n integer;
begin
 if public.active_player() is distinct from 'Jimmy' then raise exception 'Only Jimmy can clear scorecards'; end if;
 if p_round not in ('silver-am','silver-pm','valley','ridge','ross','backyard','links','lake','short')
 or p_player not in ('Jimmy','Brittany','Kevin','Jeff','Nate','Richie','Mason')
 or (p_player='Mason' and p_round not in ('valley','ridge','ross','backyard')) then
  raise exception 'Invalid round or golfer';
 end if;
 if p_test then
  delete from public.test_scores where round_id=p_round and player=p_player;
 else
  if exists(select 1 from public.scorecard_submissions where round_id=p_round and player=p_player) then
   raise exception 'Scorecard is locked. Unlock before clearing.';
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
 if public.active_player() is distinct from 'Jimmy' then raise exception 'Only Jimmy can submit scorecards'; end if;
 if (select value from public.app_settings where key='test_mode') is distinct from 'false'
 or (select value from public.app_settings where key='scoring_ready') is distinct from 'true' then
  raise exception 'Official scoring must be enabled and test mode disabled';
 end if;
 if not ((p_round='backyard' and p_holes=9) or
  (p_round in ('silver-am','silver-pm','valley','ridge','ross','links','lake','short') and p_holes=18))
 or p_player not in ('Jimmy','Brittany','Kevin','Jeff','Nate','Richie','Mason')
 or (p_player='Mason' and p_round not in ('valley','ridge','ross','backyard')) then
  raise exception 'Invalid round, golfer, or hole count';
 end if;
 select count(*) into n from public.scores where round_id=p_round and player=p_player and hole between 1 and p_holes;
 if n<>p_holes then raise exception 'Scorecard incomplete: % of % holes entered',n,p_holes; end if;
 insert into public.scorecard_submissions(round_id,player,submitted_by)
 values(p_round,p_player,auth.uid()) on conflict(round_id,player) do nothing;
end $$;
revoke all on function public.reset_player_scorecard(text,text,boolean),
 public.submit_scorecard(text,text,integer) from public,anon;
grant execute on function public.reset_player_scorecard(text,text,boolean),
 public.submit_scorecard(text,text,integer) to authenticated;
commit;
