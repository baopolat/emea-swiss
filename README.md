# EMEA Masters Swiss Matchup Calculator

Interactive Swiss Stage simulator for **EMEA Masters Summer 2026**. Pick winners each round and the next round’s matchups are generated with the **FIDE Dutch System** ([C.04.3](https://handbook.fide.com/chapter/C0403Till2026)) via [`@echecs/swiss`](https://www.npmjs.com/package/@echecs/swiss) — the same pairing family SwissChess uses.

Round 1 is locked to the official Pool 0-0 pairings (seeds #1–#16 vs #17–#32).

## How it works

1. Round 1 is locked to the official Pool 0-0 pairings.
2. Click a team on each match card to set the winner (green = win).
3. When **every** match in a round has a result, the next round is paired with FIDE Dutch and appears as the next column.
4. The **Final Result** column lists teams that reach 4 wins (advanced) or 4 losses (eliminated), ordered by Progressive Score then Swiss seed.

Layout mirrors majors.im-style Swiss boards: horizontal round columns, score-group pools (`1-0`, `0-1`, …), Bo1/Bo3 labels on pool headers.

## Run locally

```bash
npm install
npm run dev
```

Open [http://127.0.0.1:43127](http://127.0.0.1:43127).

Results persist in `localStorage` for the current browser.

## Team logos

Square logos are cached under [`public/logos/`](public/logos/) from
[Leaguepedia](https://lol.fandom.com) (`lol.fandom.com` MediaWiki `imageinfo`).

Refresh (rate-limited — run sparingly):

```bash
npm run fetch-logos
```

## Format

- 32 teams, up to 7 rounds
- 4 wins → advance · 4 losses → eliminated
- Pairings: FIDE Dutch within score groups
- Advancement seeding for identical records:
  1. **Progressive Score** (R1 win = 7 … R7 win = 1)
  2. Initial Swiss seed