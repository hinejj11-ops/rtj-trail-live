-- Run manually in Supabase SQL Editor after reviewing the Backyard results.
-- The Backyard round designates ONLY CTP on hole 9; a legacy LD result can
-- cause set_skills_round_lock to report '2 of 1 recorded'.
-- Archive the undesignated Backyard LD record before removing it from the
-- live skills table. Never touch the Backyard CTP winner or official scores.
BEGIN;
CREATE TABLE IF NOT EXISTS public.skills_legacy_archive (
 round_id text NOT NULL, kind text NOT NULL, winner text NOT NULL,
 updated_by uuid, updated_at timestamptz,
 archived_at timestamptz NOT NULL DEFAULT now(),
 reason text NOT NULL,
 PRIMARY KEY(round_id,kind)
);
INSERT INTO public.skills_legacy_archive(round_id,kind,winner,updated_by,updated_at,reason)
SELECT round_id,kind,winner,updated_by,updated_at,
 'Undesignated Backyard LD result; only CTP on hole 9 is scheduled'
FROM public.skills WHERE round_id='backyard' AND kind='ld'
ON CONFLICT(round_id,kind) DO NOTHING;
DELETE FROM public.skills WHERE round_id='backyard' AND kind='ld'
AND EXISTS (SELECT 1 FROM public.skills_legacy_archive a
 WHERE a.round_id='backyard' AND a.kind='ld' AND a.winner=skills.winner);
COMMIT;
-- Verify: SELECT round_id,kind,winner FROM public.skills WHERE round_id='backyard';
-- Expected: only the CTP record (if a winner has been selected).
-- Then lock Backyard from the app. If it still fails, inspect the installed
-- set_skills_round_lock function; do not rerun unrelated schema migrations.
