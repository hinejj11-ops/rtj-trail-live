-- Run once in Supabase SQL Editor. Existing scoring tables are unchanged.
create extension if not exists pgcrypto;

create table if not exists public.tournament_photos (
  id uuid primary key default gen_random_uuid(),
  round_id text not null check (round_id in ('silver-am','silver-pm','valley','ridge','ross','backyard','links','lake','short')),
  player text not null check (player in ('Jimmy','Brittany','Kevin','Jeff','Nate','Richie','Mason')),
  storage_path text not null unique,
  created_at timestamptz not null default now()
);
alter table public.tournament_photos enable row level security;

-- The tournament app uses anonymous Supabase Auth sessions associated with active players.
create or replace function public.is_active_tournament_member()
returns boolean language sql security definer stable set search_path=public as $$
  select exists(select 1 from public.player_sessions
    where user_id=auth.uid() and last_seen>now()-interval '100 seconds');
$$;
create or replace function public.is_active_tournament_player(p_player text)
returns boolean language sql security definer stable set search_path=public as $$
  select exists(select 1 from public.player_sessions
    where user_id=auth.uid() and player=p_player and last_seen>now()-interval '100 seconds');
$$;
create or replace function public.is_active_tournament_organizer()
returns boolean language sql security definer stable set search_path=public as $$
  select public.is_active_tournament_player('Jimmy');
$$;
revoke all on function public.is_active_tournament_member(), public.is_active_tournament_player(text), public.is_active_tournament_organizer() from public,anon;
grant execute on function public.is_active_tournament_member(), public.is_active_tournament_player(text), public.is_active_tournament_organizer() to authenticated;

drop policy if exists "Tournament members view photos" on public.tournament_photos;
create policy "Tournament members view photos" on public.tournament_photos for select to authenticated using (public.is_active_tournament_member());
drop policy if exists "Players upload photo metadata" on public.tournament_photos;
create policy "Players upload photo metadata" on public.tournament_photos for insert to authenticated
with check (public.is_active_tournament_player(player) and storage_path like player || '/%');
drop policy if exists "Players delete photo metadata" on public.tournament_photos;
create policy "Players delete photo metadata" on public.tournament_photos for delete to authenticated
using (public.is_active_tournament_player(player) or public.is_active_tournament_organizer());

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('tournament-photos','tournament-photos',false,8388608,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=false,file_size_limit=8388608,allowed_mime_types=array['image/jpeg','image/png','image/webp'];

drop policy if exists "Tournament members read photos" on storage.objects;
create policy "Tournament members read photos" on storage.objects for select to authenticated
using (bucket_id='tournament-photos' and public.is_active_tournament_member());
drop policy if exists "Tournament players upload photos" on storage.objects;
create policy "Tournament players upload photos" on storage.objects for insert to authenticated
with check (bucket_id='tournament-photos' and public.is_active_tournament_player((storage.foldername(name))[1]));
drop policy if exists "Tournament players delete photos" on storage.objects;
create policy "Tournament players delete photos" on storage.objects for delete to authenticated
using (bucket_id='tournament-photos' and (public.is_active_tournament_player((storage.foldername(name))[1]) or public.is_active_tournament_organizer()));

-- For live gallery updates, add metadata to Supabase Realtime if not already published.
do $$ begin
  alter publication supabase_realtime add table public.tournament_photos;
exception when duplicate_object then null;
end $$;
