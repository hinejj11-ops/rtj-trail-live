-- Run once in Supabase SQL Editor after migration 002.
-- Allow either one physical group or two, while keeping the fixed tournament draw.
create or replace function public.set_playing_groups(p_round text,p_groups jsonb)
returns void language plpgsql security definer set search_path=public as $$
declare
  v_data jsonb;
  v_expected text[];
  v_actual text[];
begin
  if not exists(select 1 from public.player_sessions where player='Jimmy' and user_id=auth.uid() and last_seen>now()-interval '100 seconds') then
    raise exception 'Organizer access required';
  end if;
  if p_round not in ('silver-am','silver-pm','valley','ridge','ross','backyard','links','lake','short') then
    raise exception 'Unknown round';
  end if;
  if p_groups is not null then
    if jsonb_typeof(p_groups)<>'array' or jsonb_array_length(p_groups) not between 1 and 2 then
      raise exception 'One or two playing groups required';
    end if;
    if exists(select 1 from jsonb_array_elements(p_groups) g where jsonb_typeof(g)<>'array' or jsonb_array_length(g)=0) then
      raise exception 'Groups cannot be empty';
    end if;
    v_expected:=case when p_round in ('valley','ridge','ross','backyard') then array['Jimmy','Brittany','Kevin','Jeff','Nate','Richie','Mason'] else array['Jimmy','Brittany','Kevin','Jeff','Nate','Richie'] end;
    select array_agg(x order by x) into v_actual
    from (select jsonb_array_elements_text(g) as x from jsonb_array_elements(p_groups) g) q;
    if v_actual is distinct from (select array_agg(x order by x) from unnest(v_expected) x) then
      raise exception 'Each eligible golfer must appear exactly once';
    end if;
  end if;
  select value::jsonb into v_data from public.app_settings where key='playing_groups' for update;
  v_data:=coalesce(v_data,'{}'::jsonb);
  if p_groups is null then v_data:=v_data-p_round;
  else v_data:=jsonb_set(v_data,array[p_round],p_groups,true); end if;
  update public.app_settings set value=v_data::text where key='playing_groups';
end; $$;
revoke all on function public.set_playing_groups(text,jsonb) from public,anon;
grant execute on function public.set_playing_groups(text,jsonb) to authenticated;
