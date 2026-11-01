-- Read-only spectator skills snapshot. No player claim required.
-- This function intentionally exposes only contest winners and round locks.
create or replace function public.get_spectator_skills()
returns jsonb
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;
  return jsonb_build_object(
    'skills', coalesce((select jsonb_agg(jsonb_build_object(
      'round_id', s.round_id, 'kind', s.kind, 'winner', s.winner
    )) from public.skills s), '[]'::jsonb),
    'locks', coalesce((select jsonb_agg(jsonb_build_object(
      'round_id', l.round_id
    )) from public.skills_round_locks l), '[]'::jsonb)
  );
end;
$$;
revoke all on function public.get_spectator_skills() from public, anon;
grant execute on function public.get_spectator_skills() to authenticated;
