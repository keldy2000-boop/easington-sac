# Easington Sea Angling Club

The club's Points Championship website: league table, match results and angler records.

## Updating results

All results live in [`data/league.json`](data/league.json). To add a match, add an entry to `matches`:

```json
{
  "no": 11,
  "date": "2026-10-19",
  "venue": "Easington beach",
  "results": { "J Critchley": 20, "J Evans": 19, "M Brown": 1 }
}
```

- Points: 20 for the winner, one less for each place behind.
- Anglers who fish but don't weigh in get 1 point.
- Leave out anyone who didn't fish.
- Spell names exactly as they already appear, so their points add up.

Update `"updated"` to today's date, commit, and the website refreshes within a minute or two.
