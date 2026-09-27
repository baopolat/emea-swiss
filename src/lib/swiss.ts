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
 * Keep real games involving the W–L pool so FIDE colour (A.6) and rematch
 * history stay intact. Out-of-pool opponent ids remain in the game records
 * (not registered as players, so they cannot be paired). Do not convert those
 * games to byes — byes have no colour.
 */
function adaptRoundsForPool(
  completed: CompletedRound[],
  poolIds: Set<string>,
): CompletedRound[] {
  return completed.map((round) => {
    const games: Game[] = [];

    for (const g of round.games) {
      const whiteIn = poolIds.has(g.white);
      const blackIn = poolIds.has(g.black);
      if (!whiteIn && !blackIn) continue;
      games.push(g);
    }

    return { games, byes: [] as CompletedRound["byes"] };
  });
}

/**
 * FIDE R1 colours alternate by board order (E.5 / initial-colour):
 * board 1 → higher seed white, board 2 → higher seed black, etc.
 * Later rounds use match.teamA/teamB as white/black from Dutch allocation.
 */
function gameSidesForMatch(
  match: Matchup,
  roundIndex: number,
  boardIndex: number,
): { white: string; black: string } {
  if (roundIndex === 0) {
    const higherIsWhite = boardIndex % 2 === 0;
    return higherIsWhite
      ? { white: match.teamA, black: match.teamB }
      : { white: match.teamB, black: match.teamA };
  }
  return { white: match.teamA, black: match.teamB };
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
    const matchups = rounds[r] ?? [];
    for (let i = 0; i < matchups.length; i++) {
      const match = matchups[i];
      const res = roundResults[match.id];
      if (!res) {
        complete = false;
        break;
      }
      const { white, black } = gameSidesForMatch(match, r, i);
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
 * Pair one W–L pool via FIDE Dutch. Colour + opponent history is kept for
 * pool members (including games vs other records). Rematches only if no other
 * valid same-W–L pairing exists — never float into a different record.
 */
function pairWithinPool(
  ids: string[],
  records: Records,
  completed: CompletedRound[],
): { white: string; black: string }[] {
  if (ids.length < 2) return [];

  const poolSet = new Set(ids);
  const poolPlayers = toPlayers(ids, records);
  const adapted = adaptRoundsForPool(completed, poolSet);
  const withHistory = pair(poolPlayers, adapted, {
    expectedRounds: MAX_ROUNDS,
  });

  const expectedPairs = Math.floor(ids.length / 2);
  const poolGames = withHistory.games
    .filter((g) => poolSet.has(g.white) && poolSet.has(g.black))
    .map((g) => ({ white: g.white, black: g.black }));

  if (poolGames.length >= expectedPairs) {
    return poolGames;
  }

  // Rare rematch lock inside the pool — same W–L only, allow rematches.
  const fresh = pair(poolPlayers, [], { expectedRounds: MAX_ROUNDS });
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
