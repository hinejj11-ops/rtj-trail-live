-- Allow anonymous-authenticated spectators to read the saved course setup.
-- Spectators authenticate with Supabase but do not claim a player session.
-- Existing player/organizer write policies are unchanged.
-- Safe to run repeatedly; does not modify any course data.
begin;

grant select on table public.course_pars to authenticated;

drop policy if exists course_pars_spectator_read on public.course_pars;
create policy course_pars_spectator_read
on public.course_pars
as permissive
for select
to authenticated
using (true);

commit;
