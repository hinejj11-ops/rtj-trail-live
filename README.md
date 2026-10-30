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
- The five cumulative prize leaderboards are implemented, but must still be verified against complete real-world scorecards and a live Supabase deployment before prizes are awarded. Official championship points require Jimmy's physical-scorecard verification.
- The organizer must verify actual scorecard pars and hole stroke indexes; defaults are placeholders. Published Heartbreaker and Silver Lakes Short strokes are preconfigured, but each nine's stroke indexes must be entered correctly.
- Group scoring is restricted in the database to the designated playing group for the round. Name selection has no PIN; a session lock is a convenience feature, not identity verification.
- Sessions expire if their heartbeat stops for about 100 seconds.
- The score editor uses plus/minus controls. Test Mode has a separate score table and organizer-only reset; disable it before the event.
- Skills contest holes match the final guide; verify the combined Silver Lakes hole numbering (MB #2 = hole 11, Short #8 = hole 17).
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

## Backyard skins — confirmed house rule

For both RTJ Cup two-person team gross skins and Wild Card seven-player individual gross skins, tied lowest gross scores carry the outstanding skins forward to the next hole. A unique lowest gross score wins the current hole and all carried skins. **Any skins still carried after hole 9 expire without a winner**; there is no playoff or additional tiebreak hole. This rule was confirmed by the organizer and must be used by the championship leaderboard scoring engine.


## 2026 final championship guide alignment (October 30)

The authoritative rules are the finalized six-page RTJ Championship Guide. Code changes include Brittany HI 10.0, revised physical playing groups, the published Silver Lakes Short and GN Short stroke allocations, 90% Triple Threat and 95% Stableford allowances, gross-first double-par/par-5-nine Vegas caps, 3/2/1 nine-hole placement points, and Richie Lifeline controls. Skills contests may be marked **No qualifying shot** and locked without awarding a point.

**Required database step:** run `migrations/007_final_guide_scoring.sql` in Supabase SQL Editor after migration 006. This adds Lifeline support to test scores, corrects physical group access permissions, reserves scorecard finalization for Jimmy, and supports skills no-winner outcomes. Existing score data is retained. Previously submitted cards remain locked and should be checked by Jimmy before treating them as physically verified.

**Operational flow:** group members enter or correct gross scores during play; Richie or his groupmates can flag eligible Lifeline holes. After each round, Jimmy compares each player's physical scorecard against the app, corrects any discrepancies, then selects **Verify & finalize**. Championship points post only after all eligible scorecards for that event have been verified. Jimmy can unlock and clear any player's scorecard. Test-mode standings do not require physical verification.

**Validation:** `npm test` runs final-guide regression tests. These do not replace browser, live Supabase, multi-device, or real-scorecard validation. Confirm every course par and stroke index in Course setup before official scoring; the app still uses placeholders where course data is absent.
