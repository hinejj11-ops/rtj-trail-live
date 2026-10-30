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
- The score editor uses plus/minus controls; test data must be cleared before the event. There is no built-in reset yet.
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
