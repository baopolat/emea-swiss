import { INVITE_TEAM_IDS } from "@/data/teams";
import type { MatchResult, Matchup, Standing } from "@/lib/swiss";

export type PlayoffPoolId = 1 | 2 | 3 | 4 | 5;

export type Ro16MatchDef = {
  id: string;
  label: string;
  poolA: PlayoffPoolId;
  poolB: PlayoffPoolId;
};

/** Fixed Ro16 pool-vs-pool template from the official draw sheet. */
export const RO16_MATCHES: Ro16MatchDef[] = [
  { id: "ro16-1", label: "Ro16 - 1", poolA: 1, poolB: 5 },
  { id: "ro16-2", label: "Ro16 - 2", poolA: 3, poolB: 3 },
  { id: "ro16-3", label: "Ro16 - 3", poolA: 2, poolB: 4 },
  { id: "ro16-4", label: "Ro16 - 4", poolA: 2, poolB: 4 },
  { id: "ro16-5", label: "Ro16 - 5", poolA: 1, poolB: 5 },
  { id: "ro16-6", label: "Ro16 - 6", poolA: 3, poolB: 4 },
  { id: "ro16-7", label: "Ro16 - 7", poolA: 1, poolB: 4 },
  { id: "ro16-8", label: "Ro16 - 8", poolA: 3, poolB: 4 },
];

export const EXPECTED_POOL_SIZES: Record<PlayoffPoolId, number> = {
  1: 3,
  2: 2,
  3: 4,
  4: 5,
  5: 2,
};

export type KoPairing = {
  matchId: string;
  label: string;
  swissTeamId: string;
  inviteTeamId: string | null;
};

/** slotKey = `${matchId}:a` | `${matchId}:b` → teamId */
export type Ro16Assignments = Record<string, string>;

export type PostSwissState = {
  koPairings: KoPairing[];
  koResults: Record<string, MatchResult>;
  ro16Assignments: Ro16Assignments;
  ro16Results: Record<string, MatchResult>;
  qfResults: Record<string, MatchResult>;
  sfResults: Record<string, MatchResult>;
  finalResults: Record<string, MatchResult>;
};

export type PlayoffPools = {
  pool1: string[];
  pool2: string[];
  pool3: string[];
  pool4: string[];
  pool5: string[];
  sizesOk: boolean;
  mismatch: string | null;
};

export function emptyPostSwissState(): PostSwissState {
  return {
    koPairings: [],
    koResults: {},
    ro16Assignments: {},
    ro16Results: {},
    qfResults: {},
    sfResults: {},
    finalResults: {},
  };
}

export function slotKey(matchId: string, side: "a" | "b"): string {
  return `${matchId}:${side}`;
}

export function parseSlotKey(
  key: string,
): { matchId: string; side: "a" | "b" } | null {
  const [matchId, side] = key.split(":");
  if (!matchId || (side !== "a" && side !== "b")) return null;
  return { matchId, side };
}

/** Swiss advanced seeds 14–16, ordered by seed. */
export function knockoutSwissTeams(advanced: Standing[]): Standing[] {
  return advanced
    .filter((s) => {
      const seed = s.advanceSeed ?? 0;
      return seed >= 14 && seed <= 16;
    })
    .sort((a, b) => (a.advanceSeed ?? 0) - (b.advanceSeed ?? 0));
}

export function swissFullyResolved(standings: Standing[]): boolean {
  return standings.every(
    (s) => s.status === "advanced" || s.status === "eliminated",
  );
}

/**
 * Fixed Knockout seats from the official sheet:
 * 1.1 WSCI #1 vs Swiss #16 · 1.2 WSCI #2 vs Swiss #15 · 1.3 WSCI #3 vs Swiss #14.
 * `swissIds` must be advance seeds 14–16 ascending.
 */
export function buildDefaultKoPairings(swissIds: string[]): KoPairing[] {
  const descending = [...swissIds].reverse();
  return descending.map((swissTeamId, i) => ({
    matchId: `ko-${i + 1}`,
    label: `1.${i + 1}`,
    swissTeamId,
    inviteTeamId: INVITE_TEAM_IDS[i] ?? null,
  }));
}

function shuffle<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function koWinners(state: PostSwissState): string[] {
  const winners: string[] = [];
  for (const p of state.koPairings) {
    const w = state.koResults[p.matchId]?.winnerId;
    if (w) winners.push(w);
  }
  return winners;
}

export function allKoDecided(state: PostSwissState): boolean {
  return (
    state.koPairings.length === 3 &&
    state.koPairings.every(
      (p) => p.inviteTeamId && state.koResults[p.matchId]?.winnerId,
    )
  );
}

export function buildPlayoffPools(
  advanced: Standing[],
  pool1Winners: string[],
): PlayoffPools {
  const pool2 = advanced
    .filter((s) => s.wins === 4 && s.losses === 0)
    .map((s) => s.team.id);
  const pool3 = advanced
    .filter((s) => s.wins === 4 && s.losses === 1)
    .map((s) => s.team.id);
  const pool4 = advanced
    .filter((s) => s.wins === 4 && s.losses === 2)
    .map((s) => s.team.id);
  const pool5 = advanced
    .filter(
      (s) =>
        s.wins === 4 &&
        s.losses === 3 &&
        (s.advanceSeed ?? 0) >= 1 &&
        (s.advanceSeed ?? 0) <= 13,
    )
    .map((s) => s.team.id);

  const pools: PlayoffPools = {
    pool1: [...pool1Winners],
    pool2,
    pool3,
    pool4,
    pool5,
    sizesOk: true,
    mismatch: null,
  };

  const issues: string[] = [];
  (Object.keys(EXPECTED_POOL_SIZES) as unknown as PlayoffPoolId[]).forEach(
    (id) => {
      const key = `pool${id}` as keyof PlayoffPools;
      const list = pools[key];
      if (!Array.isArray(list)) return;
      const expected = EXPECTED_POOL_SIZES[id];
      if (list.length !== expected) {
        issues.push(`Pool ${id}: ${list.length} (need ${expected})`);
      }
    },
  );

  if (issues.length) {
    pools.sizesOk = false;
    pools.mismatch = issues.join(" · ");
  }

  return pools;
}

function poolTeams(
  pools: PlayoffPools,
  id: PlayoffPoolId,
): string[] {
  return pools[`pool${id}` as `pool${PlayoffPoolId}`];
}

/** Slot pool for a Ro16 side. */
export function poolForRo16Slot(
  matchId: string,
  side: "a" | "b",
): PlayoffPoolId | null {
  const def = RO16_MATCHES.find((m) => m.id === matchId);
  if (!def) return null;
  return side === "a" ? def.poolA : def.poolB;
}

export function canSwapRo16Slots(keyA: string, keyB: string): boolean {
  const a = parseSlotKey(keyA);
  const b = parseSlotKey(keyB);
  if (!a || !b) return false;
  if (keyA === keyB) return false;
  const poolA = poolForRo16Slot(a.matchId, a.side);
  const poolB = poolForRo16Slot(b.matchId, b.side);
  return poolA != null && poolA === poolB;
}

export function swapRo16Slots(
  assignments: Ro16Assignments,
  keyA: string,
  keyB: string,
): Ro16Assignments {
  if (!canSwapRo16Slots(keyA, keyB)) return assignments;
  const next = { ...assignments };
  const tmp = next[keyA];
  if (next[keyB]) next[keyA] = next[keyB];
  else delete next[keyA];
  if (tmp) next[keyB] = tmp;
  else delete next[keyB];
  return next;
}

/** Find which Ro16 slot currently holds a team, if any. */
export function findRo16SlotForTeam(
  assignments: Ro16Assignments,
  teamId: string,
): string | null {
  for (const [key, id] of Object.entries(assignments)) {
    if (id === teamId) return key;
  }
  return null;
}

/**
 * Place a pool team into a Ro16 slot (same pool only).
 * If the team is already seated, swaps with the target.
 * If not seated, assigns into the target (displacing the previous occupant).
 */
export function placePoolTeamInSlot(
  assignments: Ro16Assignments,
  teamId: string,
  pool: PlayoffPoolId,
  targetKey: string,
): Ro16Assignments {
  const parsed = parseSlotKey(targetKey);
  if (!parsed) return assignments;
  const targetPool = poolForRo16Slot(parsed.matchId, parsed.side);
  if (targetPool !== pool) return assignments;

  const existingKey = findRo16SlotForTeam(assignments, teamId);
  if (existingKey === targetKey) return assignments;

  if (existingKey) {
    return swapRo16Slots(assignments, existingKey, targetKey);
  }

  const next = { ...assignments };
  next[targetKey] = teamId;
  return next;
}

/** Remove whoever sits in a Ro16 slot (returns them to the pool list). */
export function unseatRo16Slot(
  assignments: Ro16Assignments,
  targetKey: string,
): Ro16Assignments {
  if (!assignments[targetKey]) return assignments;
  const next = { ...assignments };
  delete next[targetKey];
  return next;
}

/**
 * Draw remaining empty Ro16 slots at random within each pool.
 * Keeps any seats already filled (as long as that team still belongs to the slot's pool).
 * Only runs a full fill when pool sizes match the template.
 */
export function randomizeRo16Draw(
  pools: PlayoffPools,
  existing: Ro16Assignments = {},
): Ro16Assignments {
  if (!pools.sizesOk) return { ...existing };

  const seated = new Set<string>();
  const next: Ro16Assignments = {};

  // Keep valid existing seats first
  for (const m of RO16_MATCHES) {
    for (const side of ["a", "b"] as const) {
      const key = slotKey(m.id, side);
      const teamId = existing[key];
      if (!teamId) continue;
      const pool = side === "a" ? m.poolA : m.poolB;
      const inPool = poolTeams(pools, pool).includes(teamId);
      if (!inPool || seated.has(teamId)) continue;
      next[key] = teamId;
      seated.add(teamId);
    }
  }

  const bags: Record<PlayoffPoolId, string[]> = {
    1: shuffle(poolTeams(pools, 1).filter((id) => !seated.has(id))),
    2: shuffle(poolTeams(pools, 2).filter((id) => !seated.has(id))),
    3: shuffle(poolTeams(pools, 3).filter((id) => !seated.has(id))),
    4: shuffle(poolTeams(pools, 4).filter((id) => !seated.has(id))),
    5: shuffle(poolTeams(pools, 5).filter((id) => !seated.has(id))),
  };

  for (const m of RO16_MATCHES) {
    const keyA = slotKey(m.id, "a");
    const keyB = slotKey(m.id, "b");
    if (!next[keyA]) {
      const a = bags[m.poolA].shift();
      if (a) next[keyA] = a;
    }
    if (!next[keyB]) {
      const b = bags[m.poolB].shift();
      if (b) next[keyB] = b;
    }
  }
  return next;
}

export function ro16FullyAssigned(assignments: Ro16Assignments): boolean {
  return RO16_MATCHES.every(
    (m) =>
      assignments[slotKey(m.id, "a")] && assignments[slotKey(m.id, "b")],
  );
}

export function koMatchups(pairings: KoPairing[]): Matchup[] {
  return pairings
    .filter((p) => p.inviteTeamId)
    .map((p) => ({
      id: p.matchId,
      label: p.label,
      teamA: p.inviteTeamId!,
      teamB: p.swissTeamId,
      pool: "ko",
    }));
}

export function ro16Matchups(assignments: Ro16Assignments): Matchup[] {
  return RO16_MATCHES.map((m) => {
    const teamA = assignments[slotKey(m.id, "a")] ?? "";
    const teamB = assignments[slotKey(m.id, "b")] ?? "";
    return {
      id: m.id,
      label: m.label,
      teamA,
      teamB,
      pool: `P${m.poolA}/P${m.poolB}`,
    };
  });
}

type BracketFeed = {
  id: string;
  label: string;
  fromA: { stage: "ro16" | "qf" | "sf"; matchId: string };
  fromB: { stage: "ro16" | "qf" | "sf"; matchId: string };
};

export const QF_MATCHES: BracketFeed[] = [
  {
    id: "qf-1",
    label: "QF 1",
    fromA: { stage: "ro16", matchId: "ro16-1" },
    fromB: { stage: "ro16", matchId: "ro16-2" },
  },
  {
    id: "qf-2",
    label: "QF 2",
    fromA: { stage: "ro16", matchId: "ro16-3" },
    fromB: { stage: "ro16", matchId: "ro16-4" },
  },
  {
    id: "qf-3",
    label: "QF 3",
    fromA: { stage: "ro16", matchId: "ro16-5" },
    fromB: { stage: "ro16", matchId: "ro16-6" },
  },
  {
    id: "qf-4",
    label: "QF 4",
    fromA: { stage: "ro16", matchId: "ro16-7" },
    fromB: { stage: "ro16", matchId: "ro16-8" },
  },
];

export const SF_MATCHES: BracketFeed[] = [
  {
    id: "sf-1",
    label: "SF 1",
    fromA: { stage: "qf", matchId: "qf-1" },
    fromB: { stage: "qf", matchId: "qf-2" },
  },
  {
    id: "sf-2",
    label: "SF 2",
    fromA: { stage: "qf", matchId: "qf-3" },
    fromB: { stage: "qf", matchId: "qf-4" },
  },
];

export const FINAL_MATCHES: BracketFeed[] = [
  {
    id: "final-1",
    label: "Final",
    fromA: { stage: "sf", matchId: "sf-1" },
    fromB: { stage: "sf", matchId: "sf-2" },
  },
];

function winnerFrom(
  state: PostSwissState,
  feed: { stage: "ro16" | "qf" | "sf"; matchId: string },
): string {
  if (feed.stage === "ro16") return state.ro16Results[feed.matchId]?.winnerId ?? "";
  if (feed.stage === "qf") return state.qfResults[feed.matchId]?.winnerId ?? "";
  return state.sfResults[feed.matchId]?.winnerId ?? "";
}

export function bracketMatchups(
  defs: BracketFeed[],
  state: PostSwissState,
): Matchup[] {
  return defs.map((d) => ({
    id: d.id,
    label: d.label,
    teamA: winnerFrom(state, d.fromA),
    teamB: winnerFrom(state, d.fromB),
    pool: "playoff",
  }));
}

/** Clear Ro16+ when KO changes. */
export function clearFromRo16(state: PostSwissState): PostSwissState {
  return {
    ...state,
    ro16Assignments: {},
    ro16Results: {},
    qfResults: {},
    sfResults: {},
    finalResults: {},
  };
}

/** Clear QF+ when Ro16 changes. */
export function clearFromQf(state: PostSwissState): PostSwissState {
  return {
    ...state,
    qfResults: {},
    sfResults: {},
    finalResults: {},
  };
}

export function clearFromSf(state: PostSwissState): PostSwissState {
  return {
    ...state,
    sfResults: {},
    finalResults: {},
  };
}

/**
 * Ensure KO pairings track current Swiss 14–16.
 * Resets post-Swiss when the Swiss knockout set changes.
 */
export function syncKoPairingsToSwiss(
  state: PostSwissState,
  advanced: Standing[],
): PostSwissState {
  const koSwiss = knockoutSwissTeams(advanced);
  if (koSwiss.length < 3) {
    if (state.koPairings.length === 0) return state;
    return emptyPostSwissState();
  }

  const ids = koSwiss.map((s) => s.team.id);
  const expected = buildDefaultKoPairings(ids);
  const same =
    state.koPairings.length === 3 &&
    state.koPairings.every(
      (p, i) =>
        p.matchId === expected[i]?.matchId &&
        p.swissTeamId === expected[i]?.swissTeamId &&
        p.inviteTeamId === expected[i]?.inviteTeamId &&
        p.label === expected[i]?.label,
    );

  if (same) return state;

  return {
    ...emptyPostSwissState(),
    koPairings: expected,
  };
}

export type OfficialPairMaps = {
  /** Knockout-stage pairs only — never Swiss rematches. */
  knockout: Map<string, string>;
  /** Playoff-stage pairs only — never Swiss/KO rematches. */
  playoff: Map<string, string>;
};

/**
 * Fill undecided post-Swiss results from official games (pair match).
 * Does not overwrite existing picks. Stage maps must already be filtered
 * so Swiss results cannot fill KO/playoff slots.
 */
export function mergeOfficialIntoPostSwiss(
  state: PostSwissState,
  byStage: OfficialPairMaps,
): PostSwissState {
  let next = { ...state };
  let changed = false;

  function fill(
    matchups: Matchup[],
    resultsKey:
      | "koResults"
      | "ro16Results"
      | "qfResults"
      | "sfResults"
      | "finalResults",
    byPair: Map<string, string>,
  ) {
    const results = { ...next[resultsKey] };
    for (const m of matchups) {
      if (!m.teamA || !m.teamB) continue;
      if (results[m.id]) continue;
      const key = [m.teamA, m.teamB].sort().join("|");
      const winnerId = byPair.get(key);
      if (!winnerId) continue;
      if (winnerId !== m.teamA && winnerId !== m.teamB) continue;
      results[m.id] = { winnerId };
      changed = true;
    }
    next = { ...next, [resultsKey]: results };
  }

  fill(koMatchups(next.koPairings), "koResults", byStage.knockout);

  if (allKoDecided(next) && Object.keys(next.ro16Assignments).length === 0) {
    // Don't auto-draw Ro16 from Leaguepedia — only fill winners once drawn
  }

  fill(ro16Matchups(next.ro16Assignments), "ro16Results", byStage.playoff);
  fill(bracketMatchups(QF_MATCHES, next), "qfResults", byStage.playoff);
  fill(bracketMatchups(SF_MATCHES, next), "sfResults", byStage.playoff);
  fill(bracketMatchups(FINAL_MATCHES, next), "finalResults", byStage.playoff);

  return changed ? next : state;
}

/** Overwrite results with official winners where the pair is known. */
export function applyOfficialToResults(
  matchups: Matchup[],
  existing: Record<string, MatchResult>,
  byPair: Map<string, string>,
): { results: Record<string, MatchResult>; changed: boolean } {
  const results = { ...existing };
  let changed = false;
  for (const m of matchups) {
    if (!m.teamA || !m.teamB) continue;
    const winnerId = byPair.get([m.teamA, m.teamB].sort().join("|"));
    if (!winnerId || (winnerId !== m.teamA && winnerId !== m.teamB)) continue;
    if (results[m.id]?.winnerId === winnerId) continue;
    results[m.id] = { winnerId };
    changed = true;
  }
  return { results, changed };
}

export function matchupsHaveOfficial(
  matchups: Matchup[],
  byPair: Map<string, string>,
): boolean {
  return matchups.some((m) => {
    if (!m.teamA || !m.teamB) return false;
    const winnerId = byPair.get([m.teamA, m.teamB].sort().join("|"));
    return !!winnerId && (winnerId === m.teamA || winnerId === m.teamB);
  });
}

/** Force-fill Knockout from official results; clears Ro16+ when anything changes. */
export function fillOfficialKnockout(
  state: PostSwissState,
  byPair: Map<string, string>,
): PostSwissState {
  const { results, changed } = applyOfficialToResults(
    koMatchups(state.koPairings),
    state.koResults,
    byPair,
  );
  if (!changed) return state;
  return clearFromRo16({ ...state, koResults: results });
}

/**
 * Force-fill Ro16 → Final from official results.
 * Clears later rounds when an earlier round's winners change.
 */
export function fillOfficialBracket(
  state: PostSwissState,
  byPair: Map<string, string>,
): PostSwissState {
  let next = state;
  let any = false;

  const ro16 = applyOfficialToResults(
    ro16Matchups(next.ro16Assignments),
    next.ro16Results,
    byPair,
  );
  if (ro16.changed) {
    next = clearFromQf({ ...next, ro16Results: ro16.results });
    any = true;
  }

  const qf = applyOfficialToResults(
    bracketMatchups(QF_MATCHES, next),
    next.qfResults,
    byPair,
  );
  if (qf.changed) {
    next = clearFromSf({ ...next, qfResults: qf.results });
    any = true;
  }

  const sf = applyOfficialToResults(
    bracketMatchups(SF_MATCHES, next),
    next.sfResults,
    byPair,
  );
  if (sf.changed) {
    next = { ...next, sfResults: sf.results, finalResults: {} };
    any = true;
  }

  const fin = applyOfficialToResults(
    bracketMatchups(FINAL_MATCHES, next),
    next.finalResults,
    byPair,
  );
  if (fin.changed) {
    next = { ...next, finalResults: fin.results };
    any = true;
  }

  return any ? next : state;
}

export function knockoutHasOfficial(
  state: PostSwissState,
  byPair: Map<string, string>,
): boolean {
  return matchupsHaveOfficial(koMatchups(state.koPairings), byPair);
}

export function bracketHasOfficial(
  state: PostSwissState,
  byPair: Map<string, string>,
): boolean {
  return (
    matchupsHaveOfficial(ro16Matchups(state.ro16Assignments), byPair) ||
    matchupsHaveOfficial(bracketMatchups(QF_MATCHES, state), byPair) ||
    matchupsHaveOfficial(bracketMatchups(SF_MATCHES, state), byPair) ||
    matchupsHaveOfficial(bracketMatchups(FINAL_MATCHES, state), byPair)
  );
}
