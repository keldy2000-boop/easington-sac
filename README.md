# Easington Sea Angling Club

The club's Points Championship website: league table, match results and angler records.

## Updating results

Each season has its own file in `data/` (listed in `data/seasons.json`). The current season, 2026/27, records bag weights in ounces and works out points automatically. To add a match to `data/2026-27.json`, add an entry to `matches`:

```json
{
  "no": 2,
  "date": "2026-10-25",
  "venue": "",
  "results": {
    "Chris Fisher": { "bag": 317, "fish": [{ "species": "Cod", "oz": 28 }] },
    "John Clark":   { "bag": 0 }
  }
}
```

- Weights are in ounces: 19lb 13oz = 19 × 16 + 13 = 317.
- `"bag": 0` means fished but didn't weigh in (1 point). Leave out anyone who didn't fish.
- Points, the Weight Championship and the Cod Challenge are all worked out by the app.
- Spell names exactly as they already appear, so their points add up.

Update `"updated"` to today's date, commit, and the website refreshes within a minute or two.

## Installing the app

The site installs like an app, with the club badge as its icon:

- **iPhone / iPad (Safari):** Share button, then **Add to Home Screen**.
- **Android (Chrome):** tap **Add to Home Screen** on the site, or â‹® menu, then **Add to Home screen**.
- **Windows / Mac (Chrome or Edge):** click **Install the app** on the site, or the install icon in the address bar.

When you change `index.html`, bump `CACHE` in `sw.js` (e.g. `esac-v2`) so installed copies pick up the new version.
