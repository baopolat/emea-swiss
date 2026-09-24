# EMEA Masters Swiss Matchup Calculator

Interactive Swiss Stage simulator for **EMEA Masters Summer 2026**. Pick winners each round and the next round’s matchups are generated with the **FIDE Dutch System** ([C.04.3](https://handbook.fide.com/chapter/C0403Till2026)) via [`@echecs/swiss`](https://www.npmjs.com/package/@echecs/swiss) — the same pairing family SwissChess uses.

Round 1 is locked to the official Pool 0-0 pairings (seeds #1–#16 vs #17–#32).

## Format

- 32 teams, up to 7 rounds
- 4 wins → advance · 4 losses → eliminated
- Pairings: FIDE Dutch within score groups (top half vs bottom half by seed/rating, rematch avoidance)
- Advancement seeding for identical records:
  1. **Progressive Score** (R1 win = 7 … R7 win = 1)
  2. Initial Swiss seed

## Run locally

```bash
npm install
npm run dev
```

Open [http://127.0.0.1:43127](http://127.0.0.1:43127).

Results persist in `localStorage` for the current browser.

## Stack

- Next.js (App Router) + TypeScript + Tailwind + shadcn/ui
- `@echecs/swiss` for Dutch pairing
