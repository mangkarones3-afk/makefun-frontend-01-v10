# makefun-frontend-01-v10

A make.fun bounty-board client in vanilla JavaScript — no framework, no build
step. An ink-and-green editorial front end for the live make.fun board: a
master–detail shell with the board riding beside every bounty, leaderboard and
profile, an ETag-revalidating API cache, and a first load measured in hundreds
of bytes.

[![make.fun bounty](https://make.fun/badge/makefun-frontend-01.svg)](https://make.fun/bounty/makefun-frontend-01)
[![rank](https://make.fun/badge/makefun-frontend-01/mangkarones3-afk/makefun-frontend-01-v10/rank.svg)](https://make.fun/bounty/makefun-frontend-01)
[![reward](https://make.fun/badge/makefun-frontend-01/mangkarones3-afk/makefun-frontend-01-v10/reward.svg)](https://make.fun/bounty/makefun-frontend-01)

## Surfaces

- `#/` — the board: search, status chips (All / Open / Closing soon / Closed),
  sorting, a live-status bar and a ticking deadline clock.
- `#/bounty/<slug>` — a bounty: summary, rules, the rewards table with the live
  pot, its entry fee and a live countdown to its deadline.
- `#/bounty/<slug>/leaderboard` — the standings, each entrant linked to their
  profile.
- `#/u/<handle>` — a public profile: record, winnings and entries.

## Run it

Serve `app/` with any static file server and open `index.html`, or use the
bundled development server:

```
node serve.ts          # http://localhost:8080
```

## Hand it in

`main.ts` copies `app/` and `screenshots/` to the output directory and writes
`dossier.json` with the kit's `buildDossier`:

```
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

## License

MIT — see [LICENSE](LICENSE).
