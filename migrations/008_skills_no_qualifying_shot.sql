-- Migration 008: permit a confirmed skills contest with no qualifying shot.
-- Run after migration 007. Existing skills results and locks are preserved.
begin;

alter table public.skills
  drop constraint if exists skills_winner_check;

alter table public.skills
  add constraint skills_winner_check
  check (winner in (
    'Jimmy','Brittany','Kevin','Jeff','Nate','Richie','Mason','NO_WINNER'
  ));

commit;
