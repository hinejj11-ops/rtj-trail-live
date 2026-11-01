-- Run once in Supabase SQL Editor before using the Settings group editor.
insert into public.app_settings(key,value) values ('playing_groups','{}') on conflict (key) do nothing;

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
    if jsonb_typeof(p_groups)<>'array' or jsonb_array_length(p_groups)<>2
      or jsonb_typeof(p_groups->0)<>'array' or jsonb_typeof(p_groups->1)<>'array'
      or jsonb_array_length(p_groups->0)=0 or jsonb_array_length(p_groups->1)=0 then
      raise exception 'Two nonempty groups are required';
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

create or replace function public.is_active_player(p_owner uuid,p_round text,p_target text)
returns boolean language sql security definer stable set search_path=public as $$
select exists(
  select 1 from public.player_sessions s
  where s.user_id=p_owner and s.last_seen>now()-interval '100 seconds'
  and (
    s.player='Jimmy' or s.player=p_target
    or case
      when exists(select 1 from public.app_settings cfg where cfg.key='playing_groups' and (cfg.value::jsonb ? p_round))
      then exists(
        select 1 from public.app_settings cfg,
        jsonb_array_elements(cfg.value::jsonb -> p_round) g
        where cfg.key='playing_groups' and g ? s.player and g ? p_target
      )
      else case p_round
        when 'silver-am' then (s.player=any(array['Jeff','Nate','Richie']) and p_target=any(array['Jeff','Nate','Richie'])) or (s.player=any(array['Jimmy','Brittany','Kevin']) and p_target=any(array['Jimmy','Brittany','Kevin']))
        when 'silver-pm' then (s.player=any(array['Jimmy','Nate','Brittany']) and p_target=any(array['Jimmy','Nate','Brittany'])) or (s.player=any(array['Jeff','Kevin','Richie']) and p_target=any(array['Jeff','Kevin','Richie']))
        when 'valley' then (s.player=any(array['Jimmy','Brittany','Richie','Mason']) and p_target=any(array['Jimmy','Brittany','Richie','Mason'])) or (s.player=any(array['Kevin','Jeff','Nate']) and p_target=any(array['Kevin','Jeff','Nate']))
        when 'ridge' then (s.player=any(array['Kevin','Nate','Richie','Mason']) and p_target=any(array['Kevin','Nate','Richie','Mason'])) or (s.player=any(array['Jimmy','Brittany','Jeff']) and p_target=any(array['Jimmy','Brittany','Jeff']))
        when 'ross' then (s.player=any(array['Brittany','Kevin','Nate']) and p_target=any(array['Brittany','Kevin','Nate'])) or (s.player=any(array['Jimmy','Jeff','Richie','Mason']) and p_target=any(array['Jimmy','Jeff','Richie','Mason']))
        when 'backyard' then (s.player=any(array['Jimmy','Kevin','Jeff']) and p_target=any(array['Jimmy','Kevin','Jeff'])) or (s.player=any(array['Brittany','Nate','Richie','Mason']) and p_target=any(array['Brittany','Nate','Richie','Mason']))
        when 'links' then (s.player=any(array['Brittany','Jeff','Richie']) and p_target=any(array['Brittany','Jeff','Richie'])) or (s.player=any(array['Jimmy','Kevin','Nate']) and p_target=any(array['Jimmy','Kevin','Nate']))
        when 'lake' then (s.player=any(array['Jimmy','Jeff','Nate']) and p_target=any(array['Jimmy','Jeff','Nate'])) or (s.player=any(array['Brittany','Kevin','Richie']) and p_target=any(array['Brittany','Kevin','Richie']))
        when 'short' then (s.player=any(array['Kevin','Brittany','Jeff']) and p_target=any(array['Kevin','Brittany','Jeff'])) or (s.player=any(array['Jimmy','Nate','Richie']) and p_target=any(array['Jimmy','Nate','Richie']))
        else false
      end
    end
  )
); $$;

revoke all on function public.is_active_player(uuid,text,text) from public,anon;
grant execute on function public.is_active_player(uuid,text,text) to authenticated;
