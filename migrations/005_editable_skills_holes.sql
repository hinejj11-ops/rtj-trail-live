-- Migration 005: Organizer-editable CTP / Long Drive designated holes.
-- No changes to scorecards, skill winners, matchups or points.
insert into public.app_settings(key,value) values ('skills_holes','{}')
on conflict (key) do nothing;

create or replace function public.set_skills_holes(p_round text,p_holes jsonb)
returns void language plpgsql security definer set search_path=public as $$
declare
  v_defaults jsonb := '{
    "silver-am":{"ctp":11,"ld":9},"silver-pm":{"ctp":17,"ld":3},
    "valley":{"ctp":16,"ld":7},"ridge":{"ctp":8,"ld":18},
    "ross":{"ctp":11,"ld":7},"backyard":{"ctp":9},
    "links":{"ctp":16,"ld":14},"lake":{"ctp":3,"ld":12},
    "short":{"ctp":14}
  }'::jsonb;
  v_original jsonb;
  v_current jsonb;
  v_kind text;
  v_value text;
  v_max integer;
begin
  if not exists(select 1 from public.player_sessions
    where player='Jimmy' and user_id=auth.uid()
      and last_seen>now()-interval '100 seconds') then
    raise exception 'Organizer access required';
  end if;
  v_original:=v_defaults->p_round;
  if v_original is null then raise exception 'Unknown round'; end if;
  v_max:=case when p_round='backyard' then 9 else 18 end;
  if p_holes is null or jsonb_typeof(p_holes)<>'object'
     or (select array_agg(k order by k) from jsonb_object_keys(p_holes) k)
        is distinct from
        (select array_agg(k order by k) from jsonb_object_keys(v_original) k)
  then raise exception 'Exactly the designated contest types are required'; end if;
  for v_kind,v_value in select key,value from jsonb_each_text(p_holes) loop
    if v_value !~ '^[0-9]+$' or length(v_value)>2
       or v_value::integer<1 or v_value::integer>v_max then
      raise exception 'Invalid hole for %',v_kind;
    end if;
  end loop;
  select value::jsonb into v_current from public.app_settings
    where key='skills_holes' for update;
  v_current:=coalesce(v_current,'{}'::jsonb);
  if p_holes=v_original then v_current:=v_current-p_round;
  else v_current:=jsonb_set(v_current,array[p_round],p_holes,true); end if;
  insert into public.app_settings(key,value) values ('skills_holes',v_current::text)
    on conflict(key) do update set value=excluded.value;
end; $$;
revoke all on function public.set_skills_holes(text,jsonb) from public,anon;
grant execute on function public.set_skills_holes(text,jsonb) to authenticated;
