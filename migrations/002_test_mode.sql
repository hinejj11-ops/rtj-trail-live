-- Run in Supabase SQL Editor after migration 001.
-- Test scores are stored separately and cannot overwrite official scores.
begin;
create table if not exists public.test_scores (
 round_id text not null, player text not null, hole integer not null check(hole between 1 and 18),
 gross integer not null check(gross between 1 and 20),
 updated_by uuid, updated_at timestamptz not null default now(),
 primary key(round_id,player,hole)
);
alter table public.test_scores enable row level security;
grant select,insert,update,delete on public.test_scores to authenticated;
drop policy if exists test_scores_read on public.test_scores;
drop policy if exists test_scores_insert on public.test_scores;
drop policy if exists test_scores_update on public.test_scores;
create policy test_scores_read on public.test_scores for select to authenticated using(public.active_player() is not null);
create policy test_scores_insert on public.test_scores for insert to authenticated with check(public.is_active_player(auth.uid(),round_id,player));
create policy test_scores_update on public.test_scores for update to authenticated using(public.is_active_player(auth.uid(),round_id,player)) with check(public.is_active_player(auth.uid(),round_id,player));
insert into public.app_settings(key,value) values('test_mode','false') on conflict(key) do nothing;
create or replace function public.set_test_mode(p_enabled boolean)
returns void language plpgsql security definer set search_path=public as $$
begin
 if public.active_player() is distinct from 'Jimmy' then raise exception 'Only Jimmy may change test mode'; end if;
 if p_enabled and exists(select 1 from public.app_settings where key='scoring_ready' and value='true') then
   raise exception 'Disable official scoring before enabling test mode';
 end if;
 update public.app_settings set value=case when p_enabled then 'true' else 'false' end where key='test_mode';
end $$;
create or replace function public.clear_test_scores()
returns integer language plpgsql security definer set search_path=public as $$
declare n integer;
begin
 if public.active_player() is distinct from 'Jimmy' then raise exception 'Only Jimmy may clear test scores'; end if;
 delete from public.test_scores;
 get diagnostics n=row_count;
 return n;
end $$;
-- Prevent score writes in test mode and prevent test writes when test mode is off.
drop policy if exists scores_insert on public.scores;
drop policy if exists scores_update on public.scores;
create policy scores_insert on public.scores for insert to authenticated with check(
 public.is_active_player(auth.uid(),round_id,player)
 and exists(select 1 from public.app_settings where key='scoring_ready' and value='true')
 and exists(select 1 from public.app_settings where key='test_mode' and value='false')
);
create policy scores_update on public.scores for update to authenticated using(
 public.is_active_player(auth.uid(),round_id,player)
 and exists(select 1 from public.app_settings where key='scoring_ready' and value='true')
 and exists(select 1 from public.app_settings where key='test_mode' and value='false')
) with check(
 public.is_active_player(auth.uid(),round_id,player)
 and exists(select 1 from public.app_settings where key='scoring_ready' and value='true')
 and exists(select 1 from public.app_settings where key='test_mode' and value='false')
);
drop policy if exists test_scores_insert on public.test_scores;
drop policy if exists test_scores_update on public.test_scores;
create policy test_scores_insert on public.test_scores for insert to authenticated with check(
 public.is_active_player(auth.uid(),round_id,player)
 and exists(select 1 from public.app_settings where key='test_mode' and value='true')
);
create policy test_scores_update on public.test_scores for update to authenticated using(
 public.is_active_player(auth.uid(),round_id,player)
 and exists(select 1 from public.app_settings where key='test_mode' and value='true')
) with check(
 public.is_active_player(auth.uid(),round_id,player)
 and exists(select 1 from public.app_settings where key='test_mode' and value='true')
);
revoke all on function public.set_test_mode(boolean),public.clear_test_scores() from public,anon;
grant execute on function public.set_test_mode(boolean),public.clear_test_scores() to authenticated;
do $$begin alter publication supabase_realtime add table public.test_scores;
exception when duplicate_object then null; end$$;
commit;
