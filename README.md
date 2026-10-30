# RTJ Trail Championship — Live scoring web app

Mobile-first green/gold web app for all seven golfers. Built from the finalized **RTJ Trail Championship Guide — Expedition Edition**.

## Features

- One active player identity at a time: select name, server-side exclusive 100-second renewable lease; other players can be signed in simultaneously.
- Each player enters their own gross scores, sees allocated hole strokes and net scores, and can mark Richie's Lifelines.
- Supabase Realtime synchronizes scores, skills winners, live match status and leaderboards to everyone's phone.
- Trail, RTJ Cup, Wild Card, Overall Skills and Wild Card Skills leaderboards.
- Silver Lakes Heartbreaker house handicap strokes; gross-only Silver Lakes Short and Backyard.
- Full itinerary, tee groups, official teams and prize pools encoded.

## Setup — about 15–30 minutes

1. Create a **Supabase** project at https://supabase.com. In Authentication → Providers, enable **Anonymous Sign-ins**.
2. Open SQL Editor and run **schema.sql** in full. This creates data tables, row-level security, real-time publication and exclusive player-session functions.
3. Copy `.env.example` to `.env`. Add the Supabase Project URL and the public **publishable/anon** key (never the service-role key).
4. In this folder run `npm install`, then `npm run dev`. Open the displayed URL on your computer.
5. Log in as Jimmy. Open **Rules** and verify/correct **every hole's par** against actual course scorecards. Also verify the **hole handicap stroke indexes** in `src/data.js`. The app intentionally starts with official scoring **disabled** until Jimmy confirms the scorecard values.
6. After verification, Jimmy checks the readiness checkbox in Rules. Each player may then enter scores.
7. Deploy to Vercel/Netlify (import repository, set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` environment variables, build `npm run build`, output directory `dist`). Share the HTTPS URL with the group. Live sync requires everyone to use the **same Supabase project**.

## Important operational and rules notes

- **Not yet hosted:** This ZIP is the source project. A publicly accessible live URL requires deployment and a configured Supabase project.
- **Hole-by-hole pars are provisional placeholders** on regulation courses. Course total pars and ratings/slopes are from the guide, but detailed hole pars were not available in the guide. Verify them before live play; scores and Stableford standings depend on accurate pars. Likewise, the combined Silver Lakes Backbreaker/Mindbreaker 18-hole handicap rankings were approximated from the two nine-hole scorecards; verify official 18-hole stroke allocation and update `src/data.js` before play.
- **Exclusive sessions:** Claims are atomic at the database. A second distinct device cannot claim a currently active player. When the first device disconnects, the claim expires after ~100 seconds. If a player opens two tabs with the same browser session, they share one identity; this is not a password-based proof of identity. Anyone with the link can claim a currently free name. For higher assurance, add individual invitation PINs or email authentication.
- **Scores:** Players can only write their own scores. All signed-in players can view all scores and record/edit Skills contest winners. Only Jimmy can edit course pars and enable scoring. This is a friendly private group tool, not a tamper-proof tournament system.
- **Lifelines:** The app adds one stroke back to the player's net score on a hole when a Lifeline is used, implementing forfeiture of one allocated stroke. It does not currently enforce the 2/3-use limits automatically; players should observe the guide's limits.
- **Match-play:** Live head-to-head progress displays holes won; official Trail match points accumulate as holes are entered. Final bonus match points can change before 18 holes are complete. Event-placement points for Stableford, skins and finale are awarded after all eligible players finish the applicable round/nine.
- **Vegas:** Heartbreaker and Short nines are ranked separately with equal weight. The guide also mentions a 15-point head-to-head hole-margin cap; this version uses capped team digits and equal-weight nine rankings, and does **not** apply the head-to-head margin cap to a separate cumulative matchup ledger. Confirm this scoring interpretation before using Vegas results for prizes.
- **Skills:** The guide's nine CTP + seven LD designated holes are preloaded. Mason can win only on his four participating rounds. Overall Skills excludes Mason. Both boards award one point per contest win.
- **Wild Card:** The three regulation-round seven-person Stableford contests use course handicaps relative to Jimmy. Backyard is seven-person gross individual skins. All seven have equal eligibility.
- **Backyard:** The app uses gross scores only and back tees (911 yards). Carrying skins forward follows the guide; unresolved final carry is not distributed in the computed skins totals.
- **Data persistence:** Supabase holds all scores; closing a phone does not erase them. Back up Supabase before the trip and consider an admin CSV export before each day's play.

## Privacy and security

The public URL is not sufficient to authenticate real-world player identity. The database enforces one active session per name and per-user score writes, but does not establish that the person choosing "Jimmy" is Jimmy. To prevent impersonation, add a PIN per player and validate it server-side (never store raw PINs in the frontend).
