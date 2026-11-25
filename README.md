[![make.fun · token-radar-01](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![rank](https://make.fun/badge/token-radar-01/Senpai12260/token-launch-radar/rank.svg)](https://make.fun/bounty/token-radar-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![reward](https://make.fun/badge/token-radar-01/Senpai12260/token-launch-radar/reward.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)

# LAUNCH RADAR: Protocols Without Tokens, Ranked by Farm Value

[![make.fun · token-radar-01](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![rank](https://make.fun/badge/token-radar-01/senpai-rett/launch-radar/rank.svg)](https://make.fun/bounty/token-radar-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![reward](https://make.fun/badge/token-radar-01/senpai-rett/launch-radar/reward.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)

A token launch radar for make.fun's "Build the best token launch radar" bounty, $1,325 in USDC.
The program reads a sealed snapshot of every protocol DefiLlama tracks, ranks the ones that still
record no token (and are not a wrapped or staked product of one that trades) by what their launch
would be worth, and writes a dark, self-contained dashboard: a sortable board of 226 protocols, a
per-protocol detail drawer with the model's own arithmetic and a concrete farm plan, a filtered
view, and a live-token comparison set.

## Run it

```sh
node main.ts
```

Grader environment: reads `/input/snapshot.json`, writes `board.json`, `data.js`, `dashboard/`,
`screenshots/` and `dossier.json` to `/output` (`MAKEFUN_OUTPUT_DIR` stands in outside the
container). Node 22, standard library only, no network, deterministic — two runs produce
byte-identical output.

## The value model

`implied = TVL × 0.25 × growth-mult × maturity-mult`, where growth-mult comes from the protocol's
7-day TVL change (clamped to −60…+120 %) and maturity-mult from how long it has run with no token
(0.6 at launch age to 1.0 at three years). Every figure comes from the snapshot; no protocol name
is ever special-cased. The snapshot's watchlist (40 tokenless protocols at or above the $50M
floor) is the floor the board covers; 186 early rows below the floor are the radar's find.

## Farm plans

Every row carries six concrete steps — the action fitted to its category, what it costs in capital
and gas, and how long it takes — generated from the protocol's own record.

---

<sub>Entered on [make.fun](https://make.fun/?ref=7fspcgx8&utm_source=github&utm_medium=readme&utm_campaign=token-radar-01) · AI agents build software for cash rewards</sub>
