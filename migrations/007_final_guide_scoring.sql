-- Migration 007: final guide permissions, score verification, lifelines, and skills no-winner.
-- Apply after 006 in Supabase SQL Editor. Existing score data is preserved.
begin;
alter table public.test_scores add column if not exists lifeline boolean not null default false;

-- Match the FINAL GUIDE physical tee groups. Jimmy may always edit any golfer.
create or replace function public.is_active_player(p_owner uuid,p_round text,p_target text)
returns boolean language sql security definer stable set search_path=public as $$
 select exists(
  select 1 from public.player_sessions s
  where s.owner=p_owner and s.last_seen>now()-interval '100 seconds'
   and (p_target <> 'Mason' or p_round in ('valley','ridge','ross','backyard'))
   and (
    s.player=p_target
    or case p_round
     when 'silver-am' then
      (s.player=any(array['Jeff','Nate','Richie']) and p_target=any(array['Jeff','Nate','Richie']))
      or (s.player=any(array['Jimmy','Brittany','Kevin']) and p_target=any(array['Jimmy','Brittany','Kevin']))
     when 'silver-pm' then
      (s.player=any(array['Jimmy','Nate','Brittany']) and p_target=any(array['Jimmy','Nate','Brittany']))
      or (s.player=any(array['Jeff','Kevin','Richie']) and p_target=any(array['Jeff','Kevin','Richie']))
     when 'valley' then
      (s.player=any(array['Jimmy','Brittany','Richie','Mason']) and p_target=any(array['Jimmy','Brittany','Richie','Mason']))
      or (s.player=any(array['Kevin','Jeff','Nate']) and p_target=any(array['Kevin','Jeff','Nate']))
     when 'ridge' then
      (s.player=any(array['Kevin','Nate','Richie','Mason']) and p_target=any(array['Kevin','Nate','Richie','Mason']))
      or (s.player=any(array['Jimmy','Brittany','Jeff']) and p_target=any(array['Jimmy','Brittany','Jeff']))
     when 'ross' then
      (s.player=any(array['Brittany','Kevin','Nate']) and p_target=any(array['Brittany','Kevin','Nate']))
      or (s.player=any(array['Jimmy','Jeff','Richie','Mason']) and p_target=any(array['Jimmy','Jeff','Richie','Mason']))
     when 'backyard' then
      (s.player=any(array['Jimmy','Kevin','Jeff']) and p_target=any(array['Jimmy','Kevin','Jeff']))
      or (s.player=any(array['Brittany','Nate','Richie','Mason']) and p_target=any(array['Brittany','Nate','Richie','Mason']))
     when 'links' then
      (s.player=any(array['Brittany','Jeff','Richie']) and p_target=any(array['Brittany','Jeff','Richie']))
      or (s.player=any(array['Jimmy','Kevin','Nate']) and p_target=any(array['Jimmy','Kevin','Nate']))
     when 'lake' then
      (s.player=any(array['Jimmy','Jeff','Nate']) and p_target=any(array['Jimmy','Jeff','Nate']))
      or (s.player=any(array['Brittany','Kevin','Richie']) and p_target=any(array['Brittany','Kevin','Richie']))
     when 'short' then
      (s.player=any(array['Kevin','Brittany','Jeff']) and p_target=any(array['Kevin','Brittany','Jeff']))
      or (s.player=any(array['Jimmy','Nate','Richie']) and p_target=any(array['Jimmy','Nate','Richie']))
     else false end
   )
 );
$$;

-- Submission now means Jimmy has physically VERIFIED and FINALIZED the scorecard.
create or replace function public.submit_scorecard(p_round text,p_player text,p_holes integer)
returns void language plpgsql security definer set search_path=public as $$
declare n integer;
begin
 if public.active_player() is distinct from 'Jimmy' then
  raise exception 'Only Jimmy may verify and finalize physical scorecards';
 end if;
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

-- Validate every Lifeline write, including direct table upserts.
create or replace function public.validate_richie_lifeline()
returns trigger language plpgsql security definer set search_path=public as $$
declare lim integer; n integer; idx integer; already integer;
begin
 if not new.lifeline then return new; end if;
 if new.player <> 'Richie' then raise exception 'Only Richie may use Lifelines'; end if;
 lim:=case new.round_id
  when 'silver-am' then 2 when 'silver-pm' then 1 when 'valley' then 2
  when 'ridge' then 3 when 'ross' then 3 when 'links' then 2 when 'lake' then 2 else 0 end;
 if lim=0 or (new.round_id='silver-pm' and new.hole>9) then raise exception 'Lifelines are not allowed in this round'; end if;
 select stroke_index into idx from public.course_pars where round_id=new.round_id and hole=new.hole;
 idx:=coalesce(idx,new.hole);
 n:=case new.round_id when 'silver-am' then 14 when 'silver-pm' then 13
  when 'valley' then 24 when 'ridge' then 23 when 'ross' then 30
  when 'links' then 22 when 'lake' then 27 else 0 end;
 if new.round_id='silver-pm' then
  if idx>9 then idx:=idx-9; end if;
  if n/9+(case when idx<=mod(n,9) then 1 else 0 end)=0 then
   raise exception 'No handicap stroke available for Lifeline on this hole';
  end if;
 elsif n/18+(case when idx<=mod(n,18) then 1 else 0 end)=0 then
  raise exception 'No handicap stroke available for Lifeline on this hole';
 end if;
 if tg_table_name='scores' then
  select count(*) into already from public.scores
   where round_id=new.round_id and player='Richie' and lifeline and hole<>new.hole;
 else
  select count(*) into already from public.test_scores
   where round_id=new.round_id and player='Richie' and lifeline and hole<>new.hole;
 end if;
 if already>=lim then raise exception 'Richie has reached the Lifeline limit for this round'; end if;
 return new;
end $$;
drop trigger if exists check_lifeline on public.scores;
create trigger check_lifeline before insert or update on public.scores
for each row execute function public.validate_richie_lifeline();
drop trigger if exists check_lifeline on public.test_scores;
create trigger check_lifeline before insert or update on public.test_scores
for each row execute function public.validate_richie_lifeline();

create or replace function public.set_richie_lifeline(p_round text,p_hole integer,p_enabled boolean,p_test boolean)
returns void language plpgsql security definer set search_path=public as $$
begin
 if public.active_player() is distinct from 'Jimmy'
 and not public.is_active_player(auth.uid(),p_round,'Richie') then
  raise exception 'Only Richie, a groupmate, or Jimmy may edit his Lifeline';
 end if;
 if p_hole<1 or p_hole>18 then raise exception 'Invalid hole'; end if;
 if p_test then
  if (select value from public.app_settings where key='test_mode') is distinct from 'true' then
   raise exception 'Test mode is not enabled';
  end if;
  update public.test_scores set lifeline=p_enabled where round_id=p_round and player='Richie' and hole=p_hole;
 else
  if exists(select 1 from public.scorecard_submissions where round_id=p_round and player='Richie') then
   raise exception 'Scorecard is finalized; Jimmy must unlock it first';
  end if;
  if (select value from public.app_settings where key='scoring_ready') is distinct from 'true'
  or (select value from public.app_settings where key='test_mode') is distinct from 'false' then
   raise exception 'Official scoring is not enabled';
  end if;
  update public.scores set lifeline=p_enabled where round_id=p_round and player='Richie' and hole=p_hole;
 end if;
 if not found then raise exception 'Enter the gross score before selecting a Lifeline'; end if;
end $$;

-- Record an official no-qualifying-shot result as NO_WINNER; blank means unrecorded.
create or replace function public.set_skill_winner(p_round text,p_kind text,p_winner text)
returns void language plpgsql security definer set search_path=public as $$
begin
 if public.active_player() is distinct from 'Jimmy' then raise exception 'Only Jimmy may edit skills results'; end if;
 if p_round not in ('silver-am','silver-pm','valley','ridge','ross','backyard','links','lake','short')
 or p_kind not in ('ctp','ld') or (p_kind='ld' and p_round in ('backyard','short')) then
  raise exception 'Invalid skills contest';
 end if;
 if exists(select 1 from public.skills_round_locks where round_id=p_round) then
  raise exception 'Unlock this round before editing skills results';
 end if;
 if nullif(p_winner,'') is not null and p_winner not in
 ('Jimmy','Brittany','Kevin','Jeff','Nate','Richie','Mason','NO_WINNER') then
  raise exception 'Invalid winner';
 end if;
 if p_winner='Mason' and p_round not in ('valley','ridge','ross','backyard') then
  raise exception 'Mason is not eligible for this contest';
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

revoke all on function public.submit_scorecard(text,text,integer),
 public.set_richie_lifeline(text,integer,boolean,boolean),
 public.set_skill_winner(text,text,text) from public,anon;
grant execute on function public.submit_scorecard(text,text,integer),
 public.set_richie_lifeline(text,integer,boolean,boolean),
 public.set_skill_winner(text,text,text) to authenticated;
commit;
