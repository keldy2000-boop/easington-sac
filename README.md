# Easington Sea Angling Club

The club's Points Championship website: league table, match results and angler records.

## Updating results

From 2026/27 the results and the list of anglers live in the club's Google Sheet, **Easington SAC Results 2026-27** (linked in `data/seasons.json`). The app reads it each time it opens, so new results show within a minute or two. The sheet must stay shared as *Anyone with the link: Viewer*.

- **Results** tab: one row per angler per match (bag, biggest fish, cod caught, flats).
- **Anglers** tab: one row per angler, with Yes under Silverware Challenge (£20) and Cod Challenge (£15).
- The **Club** menu and phone form come from `apps-script/Code.gs`; see `apps-script/README.md`.

If the sheet can't be reached, the app falls back to `data/2026-27.json`. Last season (2025/26) is in `data/2025-26.json`.

Only Silverware Challenge entrants score in the Points and Weight tables. The Cod Challenge is won by most cod caught, with total cod weight splitting ties.

## Installing the app

The site installs like an app, with the club badge as its icon:

- **iPhone / iPad (Safari):** Share button, then **Add to Home Screen**.
- **Android (Chrome):** tap **Add to Home Screen** on the site, or ⋮ menu, then **Add to Home screen**.
- **Windows / Mac (Chrome or Edge):** click **Install the app** on the site, or the install icon in the address bar.

When you change `index.html`, bump `CACHE` in `sw.js` (e.g. `esac-v2`) so installed copies pick up the new version.
