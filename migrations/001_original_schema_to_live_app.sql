-- Migration from original RTJ schema to the current live app.
-- Run ONCE in Supabase SQL Editor, after the original schema from the setup guide.
-- Keeps existing scores, skills, player sessions and app settings.
begin;
alter table public.course_pars add column if not exists stroke_index integer;
alter table public.scores add column if not exists updated_by uuid;
-- Ensure existing original table names are retained; app uses course_pars.
create or replace function public.is_active_player(p_owner uuid,p_round text,p_target text)
returns boolean language sql security definer stable set search_path=public as $$
select exists(select 1 from public.player_sessions s where s.user_id=p_owner and s.last_seen>now()-interval '100 seconds' and (
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
revoke all on function public.is_active_player(uuid,text,text) from public,anon;
grant execute on function public.is_active_player(uuid,text,text) to authenticated;
drop policy if exists scores_insert on public.scores;
drop policy if exists scores_update on public.scores;
create policy scores_insert on public.scores for insert to authenticated with check(public.is_active_player(auth.uid(),round_id,player));
create policy scores_update on public.scores for update to authenticated using(public.is_active_player(auth.uid(),round_id,player)) with check(public.is_active_player(auth.uid(),round_id,player));
-- Make a scored hole editable from the same playing group, not the entire tournament.
drop policy if exists scores_delete on public.scores;
create policy scores_delete on public.scores for delete to authenticated using(public.is_active_player(auth.uid(),round_id,player));
-- Existing course_pars and skills RLS policies remain in effect.
do $$begin
 alter publication supabase_realtime add table public.course_pars;
 exception when duplicate_object then null;
end$$;
commit;
