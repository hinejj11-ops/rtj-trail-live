-- Apply once in Supabase SQL Editor before using Jimmy's stroke allowance controls.
-- Stores per-round, per-format, per-golfer overrides in the existing app_settings table.
create or replace function public.set_stroke_allowances(p_overrides jsonb)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  round_key text;
  format_key text;
  golfer_key text;
  val jsonb;
  valid_rounds text[] := array['silver-am','silver-pm','valley','ridge','ross','backyard','links','lake','short'];
  valid_players text[] := array['Jimmy','Brittany','Kevin','Jeff','Nate','Richie','Mason'];
begin
  if auth.uid() is null or not exists (
    select 1 from public.player_sessions ps
    where to_jsonb(ps)->>'player' = 'Jimmy'
      and auth.uid()::text = coalesce(to_jsonb(ps)->>'user_id',to_jsonb(ps)->>'auth_user_id',to_jsonb(ps)->>'auth_uid')
  ) then
    raise exception 'Only Jimmy can change stroke allowances';
  end if;
  if p_overrides is null or jsonb_typeof(p_overrides) <> 'object' then
    raise exception 'Invalid stroke allowance settings';
  end if;
  for round_key in select jsonb_object_keys(p_overrides) loop
    if not (round_key = any(valid_rounds)) or round_key = 'backyard' then
      raise exception 'Invalid or gross-only round: %', round_key;
    end if;
    if jsonb_typeof(p_overrides->round_key) <> 'object' then raise exception 'Invalid round settings'; end if;
    for format_key in select jsonb_object_keys(p_overrides->round_key) loop
      if not (
        (round_key = 'silver-pm' and format_key in ('heartbreaker','silver-short')) or
        (round_key in ('valley','ridge','ross') and format_key in ('primary','stableford')) or
        (round_key in ('silver-am','links','lake','short') and format_key = 'primary')
      ) then raise exception 'Invalid format % for %',format_key,round_key; end if;
      if jsonb_typeof(p_overrides->round_key->format_key) <> 'object' then raise exception 'Invalid format settings'; end if;
      for golfer_key in select jsonb_object_keys(p_overrides->round_key->format_key) loop
        val := p_overrides->round_key->format_key->golfer_key;
        if not (golfer_key = any(valid_players))
          or (golfer_key = 'Mason' and round_key not in ('valley','ridge','ross'))
          or jsonb_typeof(val) <> 'number'
          or val::text !~ '^[0-9]+$'
          or (val::text)::integer > 54
        then raise exception 'Invalid allowance for %',golfer_key; end if;
      end loop;
    end loop;
  end loop;
  insert into public.app_settings(key,value)
  values ('stroke_allowances',p_overrides::text)
  on conflict (key) do update set value=excluded.value;
  return true;
end;
$$;
revoke all on function public.set_stroke_allowances(jsonb) from public,anon;
grant execute on function public.set_stroke_allowances(jsonb) to authenticated;
