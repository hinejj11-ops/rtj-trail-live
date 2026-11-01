-- Permit authenticated spectators to read in-progress official scores and
-- submission status without claiming a player session.
-- No changes to score data or existing write permissions.
begin;

grant select on public.scores, public.scorecard_submissions to authenticated;

drop policy if exists scores_spectator_read on public.scores;
create policy scores_spectator_read
on public.scores as permissive for select to authenticated using (true);

drop policy if exists scorecard_submissions_spectator_read on public.scorecard_submissions;
create policy scorecard_submissions_spectator_read
on public.scorecard_submissions as permissive for select to authenticated using (true);

commit;
