# RTJ Trail Championship 2026 — Live Scoring (Test Build)

Mobile-first website with forest green/gold design, seven name-based player sessions, Supabase realtime score synchronization, group score entry, handicap-stroke display, live match-play preview, and CTP/LD winner tracking.

## Set up Supabase Free

1. Create a Supabase Free project.
2. In Authentication > Providers, enable **Anonymous Sign-ins**.
3. **If you already ran the original schema:** run only [`migrations/001_original_schema_to_live_app.sql`](migrations/001_original_schema_to_live_app.sql) in SQL Editor. It preserves your existing tables and data. **Do not rerun `schema.sql` over the original database.** If creating a completely new database, `schema.sql` is a separate fresh-install path and requires corresponding app/schema alignment.
4. In Supabase Project Settings, copy the Project URL and **publishable / anon key**. Never use a service-role or secret key in Vercel.

## Deploy on Vercel

1. Import this GitHub repository in Vercel.
2. Framework: **Vite**; Build command: `npm run build`; Output directory: `dist`.
3. Environment variables:
   - `VITE_SUPABASE_URL` = your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY` = your public publishable/anon key
4. Deploy. If variables are added after the initial deployment, redeploy.

## Test Mode (run migration 002 first)

If you already ran migration 001, run [`migrations/002_test_mode.sql`](migrations/002_test_mode.sql) in Supabase SQL Editor before testing the updated app. This adds a separate `test_scores` table and organizer-only test-mode and reset functions. It does **not** erase existing official scores.

Sign in as Jimmy, open Course setup, and enable Test Mode. The Scorecard buttons will become active even while official scoring remains locked. Test scores are kept separate from official scores. To remove them, use **Clear ALL test scores** under Course setup; this affects all golfers and rounds but does not touch official scores. Disable Test Mode after testing. Other devices may need to reload after a mode change.

## Scorecard reset and submission (run migration 003 first)

Run [`migrations/003_scorecard_controls.sql`](migrations/003_scorecard_controls.sql) in Supabase SQL Editor **after 001 and 002**. This creates `scorecard_submissions`, adds secure reset and submit functions, and repairs the test reset path. It preserves existing official scores until Jimmy explicitly deletes a golfer's scores for a selected round.

At the **bottom of the Scorecard tab**, select the golfer in the current playing group:
- **Test Mode:** Any golfer in that playing group can reset the selected golfer's test scores for the selected round. Jimmy can also clear **all** test scores in Course setup.
- **Official Mode:** Jimmy can reset the selected golfer's unsubmitted official scores for that round. Other players cannot reset official scores.
- **Submit & lock:** Once all holes have scores, a golfer in the playing group can submit the selected official scorecard. The database then blocks further score changes, including direct writes. Only Jimmy can unlock it, after which it may be corrected or reset.

**For accidental official scores:** sign in as Jimmy, turn off Test Mode, select the relevant round and golfer in Scorecard, then click **Reset ... OFFICIAL scores for this round**. If already submitted, unlock first. This does not affect other golfers or rounds.

## First phone test

1. Open the Vercel URL in your phone browser.
2. Select **Jimmy** to claim the player session.
3. Go to **Course setup** and verify **all rounds' hole-by-hole pars and stroke indexes** against official scorecards. Default values are placeholders.
4. Only after verification, enable scoring using the organizer checkbox.
5. Select a round, select a player in your group, and enter a test score. Switch to Live matches and Leaderboards to view previews.
6. Record a CTP/LD winner in Skills. Sign out when finished.

## Current limitations — important

- This is a **test build**, not a fully validated tournament scoring engine.
- The five cumulative prize leaderboards (Trail Championship, RTJ Cup, Wild Card, Overall Skills, Wild Card Skills) are **not yet all implemented**. Overall/Wild Card skills point totals work as a preliminary view. The current leaderboard shows round Stableford previews, **not official championship rankings**.
- The organizer must verify actual scorecard pars and hole stroke indexes; defaults are placeholders. Heartbreaker house strokes are preconfigured, but Heartbreaker hole ranks must be entered correctly.
- Group scoring is restricted in the database to the designated playing group for the round. Name selection has no PIN; a session lock is a convenience feature, not identity verification.
- Sessions expire if their heartbeat stops for about 100 seconds.
- The score editor uses plus/minus controls. Test Mode has a separate score table and organizer-only reset; disable it before the event.
- Skills contest **hole assignments** must be verified against the championship guide before official use.
- The scoring code has not yet been verified on two devices or against every championship format. Do not settle prizes from this build.

## Local development

```bash
npm install
cp .env.example .env
npm run dev
```

## Files

- `src/main.js`: mobile UI and Supabase operations
- `src/data.js`: golfers, rounds, teams, handicap indexes
- `src/style.css`: forest-green/gold design
- `migrations/001_original_schema_to_live_app.sql`: migration for the user's existing database\n- `schema.sql`: initial alternate schema (not for use over the existing database)
- `vercel.json`: SPA routing
