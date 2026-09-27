/**
 * Smoke checks for Swiss pairing:
 * 1) FIDE colour history → R3 transpose ANB–SC + KCB–NBS
 * 2) Same W–L only on a full 32-team board via buildSwissSnapshot
 */
import { pair } from "@echecs/swiss";
import { ROUND1_MATCHES } from "../src/data/round1.ts";
import { TEAMS, TEAM_BY_ID } from "../src/data/teams.ts";
import { buildSwissSnapshot } from "../src/lib/swiss.ts";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function pairKey(a, b) {
  return [a, b].sort().join(":");
}

// --- Colour transpose (history keeps out-of-pool foe ids; not registered) ---
{
  const pool = ["anb", "kcb", "nbs", "sc"];
  const poolSet = new Set(pool);
  // Colours that force Dutch S2: ANB WW, KCB WB, NBS WW, SC BB
  const r1 = {
    games: [
      { white: "anb", black: "tsc", result: "white" },
      { white: "kcb", black: "wd", result: "white" },
      { white: "nbs", black: "ots", result: "white" },
      { white: "esb", black: "sc", result: "black" },
    ],
    byes: [],
  };
  const r2 = {
    games: [
      { white: "anb", black: "fec", result: "white" },
      { white: "mgz", black: "kcb", result: "black" },
      { white: "nbs", black: "fsk", result: "white" },
      { white: "cg", black: "sc", result: "black" },
    ],
    byes: [],
  };

  const players = pool.map((id, i) => ({
    id,
    rating: 3300 - TEAM_BY_ID[id].seed,
    points: 2,
    rank: i + 1,
    startingRank: TEAM_BY_ID[id].seed,
  }));

  const withColour = pair(players, [r1, r2], { expectedRounds: 7 });
  const colourKeys = new Set(
    withColour.games
      .filter((g) => poolSet.has(g.white) && poolSet.has(g.black))
      .map((g) => pairKey(g.white, g.black)),
  );
  assert(
    colourKeys.has(pairKey("anb", "sc")) &&
      colourKeys.has(pairKey("kcb", "nbs")),
    `colour transpose failed: got ${[...colourKeys].join(", ")} (want anb:sc + kcb:nbs)`,
  );

  const noColour = pair(players, [], { expectedRounds: 7 });
  const emptyKeys = new Set(
    noColour.games.map((g) => pairKey(g.white, g.black)),
  );
  assert(
    emptyKeys.has(pairKey("anb", "nbs")) &&
      emptyKeys.has(pairKey("kcb", "sc")),
    `empty-history baseline should be S1, got ${[...emptyKeys].join(", ")}`,
  );

  console.log("colour OK: ANB–SC + KCB–NBS (S1 without colour history)");
}

// --- Same W–L on full board ---
{
  const r1Results = Object.fromEntries(
    ROUND1_MATCHES.map((m) => [m.id, { winnerId: m.teamA }]),
  );

  let snap = buildSwissSnapshot([r1Results]);
  assert(snap.rounds.length >= 2, "R2 should appear after R1 complete");

  const r2Results = Object.fromEntries(
    snap.rounds[1].map((m) => [m.id, { winnerId: m.teamA }]),
  );

  snap = buildSwissSnapshot([r1Results, r2Results]);
  assert(snap.rounds.length >= 3, "R3 should appear after R2 complete");

  const wins = Object.fromEntries(TEAMS.map((t) => [t.id, 0]));
  const losses = Object.fromEntries(TEAMS.map((t) => [t.id, 0]));
  for (let r = 0; r < 2; r++) {
    const roundResults = r === 0 ? r1Results : r2Results;
    for (const m of snap.rounds[r]) {
      const res = roundResults[m.id];
      const loser = res.winnerId === m.teamA ? m.teamB : m.teamA;
      wins[res.winnerId] += 1;
      losses[loser] += 1;
    }
  }

  for (const m of snap.rounds[2]) {
    const poolA = `${wins[m.teamA]}-${losses[m.teamA]}`;
    const poolB = `${wins[m.teamB]}-${losses[m.teamB]}`;
    assert(
      poolA === poolB && poolA === m.pool,
      `same W–L violated: ${m.teamA} (${poolA}) vs ${m.teamB} (${poolB}), label ${m.pool}`,
    );
  }

  // Rematch check: no R3 pair repeats an R1/R2 pair
  const prior = new Set();
  for (let r = 0; r < 2; r++) {
    for (const m of snap.rounds[r]) {
      prior.add(pairKey(m.teamA, m.teamB));
    }
  }
  for (const m of snap.rounds[2]) {
    assert(
      !prior.has(pairKey(m.teamA, m.teamB)),
      `unexpected rematch in R3: ${m.teamA} vs ${m.teamB}`,
    );
  }

  const twoOh = TEAMS.filter((t) => wins[t.id] === 2 && losses[t.id] === 0);
  console.log(`full-board: 2-0 pool size ${twoOh.length} (same W–L + no rematch OK)`);
}

// --- Live official R1/R2 → R3 colour transpose (ANB–SC, KCB–NBS) ---
{
  const { readFileSync, existsSync } = await import("node:fs");
  const livePath = new URL("./_official-live.json", import.meta.url);
  if (existsSync(livePath)) {
    const live = JSON.parse(readFileSync(livePath, "utf8"));
    const byPair = new Map(
      live.games.map((g) => [pairKey(g.teamAId, g.teamBId), g.winnerId]),
    );
    const results = [];
    for (;;) {
      const snap = buildSwissSnapshot(results);
      const matchups = snap.rounds[results.length];
      if (!matchups?.length) break;
      const roundRes = {};
      let hits = 0;
      for (const m of matchups) {
        const winnerId = byPair.get(pairKey(m.teamA, m.teamB));
        if (!winnerId || (winnerId !== m.teamA && winnerId !== m.teamB)) {
          continue;
        }
        roundRes[m.id] = { winnerId };
        hits += 1;
      }
      if (hits === 0) break;
      results.push(roundRes);
      if (hits < matchups.length) break;
    }
    const snap = buildSwissSnapshot(results);
    assert(snap.rounds[2], "official path should reach R3");
    const keys = new Set(
      snap.rounds[2].map((m) => pairKey(m.teamA, m.teamB)),
    );
    assert(
      keys.has(pairKey("anb", "sc")) && keys.has(pairKey("kcb", "nbs")),
      `official R3 should be ANB–SC + KCB–NBS, got ${[...keys].join(", ")}`,
    );
    assert(
      !keys.has(pairKey("anb", "nbs")) && !keys.has(pairKey("kcb", "sc")),
      "official R3 should not keep S1 ANB–NBS / KCB–SC",
    );
    console.log("official live R3 OK: ANB–SC + KCB–NBS");
  } else {
    console.log("official live R3 skipped (no scripts/_official-live.json)");
  }
}

console.log("smoke passed");
