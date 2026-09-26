import { pair } from "@echecs/swiss";
import type { CompletedRound, Game, Player } from "@echecs/swiss";
import { ROUND1_MATCHES } from "@/data/round1";
import {
  LOSSES_TO_ELIMINATE,
  MAX_ROUNDS,
  TEAM_BY_ID,
  TEAMS,
  WINS_TO_ADVANCE,
  ratingFromSeed,
  type Team,
} from "@/data/teams";
import { progressiveScore } from "@/lib/progressive";

export type MatchResult = {
  winnerId: string;
};

/** Results keyed by match id per round (0-indexed). */
export type RoundResults = Record<string, MatchResult>;

export type Matchup = {
  id: string;
  label: string;
  teamA: string;
  teamB: string;
  /** Score pool before this match, e.g. "1-0". */
  pool: string;
};

export type TeamStatus = "playing" | "advanced" | "eliminated";

export type Standing = {
  team: Team;
  wins: number;
  losses: number;
  progressive: number;
  winRounds: number[];
  status: TeamStatus;
  /** Placement among advanced teams (1-based), if advanced. */
  advanceSeed?: number;
};

export type SwissSnapshot = {
  standings: Standing[];
  /** Matchups for each round that should be shown (0-indexed). */
  rounds: Matchup[][];
  advanced: Standing[];
  eliminated: Standing[];
};

type Records = Record<
  string,
  { wins: number; losses: number; winRounds: number[] }
>;

function emptyRecords(): Records {
  return Object.fromEntries(
    TEAMS.map((t) => [t.id, { wins: 0, losses: 0, winRounds: [] as number[] }]),
  );
}

function applyResults(
  records: Records,
  rounds: Matchup[][],
  results: RoundResults[],
): void {
  for (let r = 0; r < rounds.length; r++) {
    const roundResults = results[r] ?? {};
    for (const match of rounds[r] ?? []) {
      const res = roundResults[match.id];
      if (!res) continue;
      if (res.winnerId !== match.teamA && res.winnerId !== match.teamB) continue;
      const loserId = res.winnerId === match.teamA ? match.teamB : match.teamA;
      records[res.winnerId].wins += 1;
      records[res.winnerId].winRounds.push(r + 1);
      records[loserId].losses += 1;
    }
  }
}

function statusFor(wins: number, losses: number): TeamStatus {
  if (wins >= WINS_TO_ADVANCE) return "advanced";
  if (losses >= LOSSES_TO_ELIMINATE) return "eliminated";
  return "playing";
}

function poolKey(wins: number, losses: number): string {
  return `${wins}-${losses}`;
}

function isActive(wins: number, losses: number): boolean {
  return statusFor(wins, losses) === "playing";
}

function round1Matchups(): Matchup[] {
  return ROUND1_MATCHES.map((m) => ({
    id: m.id,
    label: m.label,
    teamA: m.teamA,
    teamB: m.teamB,
    pool: "0-0",
  }));
}

function toPlayers(activeIds: string[], records: Records): Player[] {
  return activeIds
    .map((id) => TEAM_BY_ID[id])
    .sort((a, b) => a.seed - b.seed)
    .map((t, index) => ({
      id: t.id,
      name: t.name,
      rating: ratingFromSeed(t.seed),
      points: records[t.id].wins,
      rank: index + 1,
      startingRank: t.seed,
    }));
}

/**
 * Convert full game history so @echecs/swiss only sees active players.
 * Games vs departed opponents become pairing byes that preserve points.
 */
function adaptRoundsForActive(
  completed: CompletedRound[],
  activeIds: Set<string>,
): CompletedRound[] {
  return completed.map((round) => {
    const games: Game[] = [];
    const byes = [...round.byes];

    for (const g of round.games) {
      const whiteActive = activeIds.has(g.white);
      const blackActive = activeIds.has(g.black);

      if (whiteActive && blackActive) {
        games.push(g);
        continue;
      }

      if (whiteActive && !blackActive) {
        const whiteWon = g.result === "white";
        byes.push({
          player: g.white,
          kind: whiteWon ? "pairing" : "zero",
        });
        continue;
      }

      if (!whiteActive && blackActive) {
        const blackWon = g.result === "black";
        byes.push({
          player: g.black,
          kind: blackWon ? "pairing" : "zero",
        });
      }
    }

    return { games, byes };
  });
}

function completedRoundsFromResults(
  rounds: Matchup[][],
  results: RoundResults[],
): CompletedRound[] {
  const completed: CompletedRound[] = [];
  for (let r = 0; r < rounds.length; r++) {
    const roundResults = results[r] ?? {};
    const games: Game[] = [];
    let complete = true;
    for (const match of rounds[r] ?? []) {
      const res = roundResults[match.id];
      if (!res) {
        complete = false;
        break;
      }
      const white = match.teamA;
      const black = match.teamB;
      const result: "white" | "black" =
        res.winnerId === white ? "white" : "black";
      games.push({ white, black, result });
    }
    if (!complete) break;
    completed.push({ games, byes: [] });
  }
  return completed;
}

function comparePoolKeys(a: string, b: string): number {
  const [aw, al] = a.split("-").map(Number);
  const [bw, bl] = b.split("-").map(Number);
  if (bw !== aw) return bw - aw;
  return al - bl;
}

/**
 * Pair one W-L pool. Prefer FIDE Dutch (avoids rematches); if that leaves
 * someone unpaired in an even pool, retry with empty history so rematches
 * are allowed rather than floating into a different score group.
 */
function pairWithinPool(
  ids: string[],
  records: Records,
  completed: CompletedRound[],
): { white: string; black: string }[] {
  if (ids.length < 2) return [];

  const players = toPlayers(ids, records);
  const poolSet = new Set(ids);
  const adapted = adaptRoundsForActive(completed, poolSet);
  const withHistory = pair(players, adapted, { expectedRounds: MAX_ROUNDS });

  const expectedPairs = Math.floor(ids.length / 2);
  if (withHistory.games.length >= expectedPairs) {
    return withHistory.games.map((g) => ({ white: g.white, black: g.black }));
  }

  // Rematch wall inside the pool — keep same-record matches, allow rematches.
  const fresh = pair(players, [], { expectedRounds: MAX_ROUNDS });
  return fresh.games.map((g) => ({ white: g.white, black: g.black }));
}

/**
 * Pair every W-L pool on its own for all rounds after R1 (incl. R4/R5):
 * 3-0 vs 3-0, 2-1 vs 2-1, 2-2 vs 2-2, etc. Never float across records.
 */
function pairNextRound(
  roundIndex: number,
  records: Records,
  priorRounds: Matchup[][],
  results: RoundResults[],
): Matchup[] {
  const activeIds = TEAMS.filter((t) =>
    isActive(records[t.id].wins, records[t.id].losses),
  ).map((t) => t.id);

  if (activeIds.length < 2) return [];

  const completed = completedRoundsFromResults(priorRounds, results);

  const byPool = new Map<string, string[]>();
  for (const id of activeIds) {
    const key = poolKey(records[id].wins, records[id].losses);
    const list = byPool.get(key) ?? [];
    list.push(id);
    byPool.set(key, list);
  }

  const poolOrder = [...byPool.keys()].sort(comparePoolKeys);
  const matchups: Matchup[] = [];
  let matchNum = 0;

  for (const pool of poolOrder) {
    const ids = byPool.get(pool) ?? [];
    const games = pairWithinPool(ids, records, completed);

    for (const p of games) {
      matchNum += 1;
      matchups.push({
        id: `r${roundIndex + 1}-${matchNum}`,
        label: `${roundIndex + 1}.${matchNum}`,
        teamA: p.white,
        teamB: p.black,
        pool,
      });
    }
  }

  return matchups;
}

function compareStandings(a: Standing, b: Standing): number {
  if (b.wins !== a.wins) return b.wins - a.wins;
  if (a.losses !== b.losses) return a.losses - b.losses;
  if (b.progressive !== a.progressive) return b.progressive - a.progressive;
  return a.team.seed - b.team.seed;
}

/**
 * Build the full Swiss snapshot from user-entered results.
 * Round 1 is fixed; later rounds pair within each W-L pool via FIDE Dutch.
 */
export function buildSwissSnapshot(results: RoundResults[]): SwissSnapshot {
  const rounds: Matchup[][] = [round1Matchups()];

  for (let r = 0; r < MAX_ROUNDS - 1; r++) {
    const records = emptyRecords();
    applyResults(records, rounds, results);

    const roundComplete = (rounds[r] ?? []).every((m) => results[r]?.[m.id]);
    if (!roundComplete) break;

    const stillActive = TEAMS.some((t) =>
      isActive(records[t.id].wins, records[t.id].losses),
    );
    if (!stillActive) break;

    const next = pairNextRound(r + 1, records, rounds, results);
    if (next.length === 0) break;
    rounds.push(next);
  }

  const finalRecords = emptyRecords();
  applyResults(finalRecords, rounds, results);

  const standings: Standing[] = TEAMS.map((team) => {
    const rec = finalRecords[team.id];
    return {
      team,
      wins: rec.wins,
      losses: rec.losses,
      winRounds: rec.winRounds,
      progressive: progressiveScore(rec.winRounds),
      status: statusFor(rec.wins, rec.losses),
    };
  }).sort(compareStandings);

  const advanced = standings
    .filter((s) => s.status === "advanced")
    .map((s, i) => ({ ...s, advanceSeed: i + 1 }));
  const eliminated = standings.filter((s) => s.status === "eliminated");

  const advanceMap = Object.fromEntries(
    advanced.map((s) => [s.team.id, s.advanceSeed]),
  );
  for (const s of standings) {
    if (advanceMap[s.team.id] != null) s.advanceSeed = advanceMap[s.team.id];
  }

  return { standings, rounds, advanced, eliminated };
}

export function isRoundComplete(
  matchups: Matchup[],
  roundResults: RoundResults | undefined,
): boolean {
  if (!matchups.length) return false;
  return matchups.every((m) => roundResults?.[m.id]);
}
