import officialData from "@/data/official-results.json";
import { TEAM_BY_ID } from "@/data/teams";
import {
  mergeOfficialIntoPostSwiss,
  type PostSwissState,
} from "@/lib/playoffs";
import {
  buildSwissSnapshot,
  type Matchup,
  type RoundResults,
} from "@/lib/swiss";

export type OfficialStage = "swiss" | "knockout" | "playoff";

export type OfficialGame = {
  teamAId: string;
  teamBId: string;
  winnerId: string;
  /** Omitted on older static cache entries → treated as swiss. */
  stage?: OfficialStage;
};

export type OfficialResultsFile = {
  fetchedAt: string;
  overviewPage: string;
  games: OfficialGame[];
  rounds?: RoundResults[];
};

const data = officialData as OfficialResultsFile;

export const OFFICIAL_OVERVIEW_PAGE = data.overviewPage;
export const OFFICIAL_FETCHED_AT = data.fetchedAt;
export const OFFICIAL_GAMES: OfficialGame[] = data.games ?? [];

export const OFFICIAL_POLL_MS = 5 * 60 * 1000;

export function pairKey(teamA: string, teamB: string): string {
  return [teamA, teamB].sort().join("|");
}

export function swissGames(
  games: OfficialGame[] = OFFICIAL_GAMES,
): OfficialGame[] {
  return games.filter((g) => !g.stage || g.stage === "swiss");
}

export function winnerMapFromGames(
  games: OfficialGame[],
): Map<string, string> {
  return new Map(
    games.map((g) => [pairKey(g.teamAId, g.teamBId), g.winnerId]),
  );
}

/** Official winner for a matchup pair, if Leaguepedia has a completed result. */
export function officialWinnerFor(
  teamA: string,
  teamB: string,
  games: OfficialGame[] = OFFICIAL_GAMES,
): string | undefined {
  if (!teamA || !teamB) return undefined;
  return winnerMapFromGames(games).get(pairKey(teamA, teamB));
}

export function isOfficialPick(
  teamA: string,
  teamB: string,
  winnerId: string | undefined,
  games: OfficialGame[] = OFFICIAL_GAMES,
): boolean {
  if (!winnerId) return false;
  const official = officialWinnerFor(teamA, teamB, games);
  if (!official) return true;
  return official === winnerId;
}

/**
 * Walk FIDE Dutch pairings round-by-round and assign Leaguepedia winners
 * onto the matching team pairs (partial rounds allowed).
 * Uses swiss-stage games only so KO/playoff pairs do not poison Swiss.
 */
export function buildOfficialRounds(
  games: OfficialGame[] = OFFICIAL_GAMES,
): RoundResults[] {
  const swiss = swissGames(games);
  if (!swiss.length) return [];

  const byPair = winnerMapFromGames(swiss);
  const results: RoundResults[] = [];

  for (;;) {
    const snap = buildSwissSnapshot(results);
    const roundIndex = results.length;
    const matchups = snap.rounds[roundIndex];
    if (!matchups?.length) break;

    const roundRes: RoundResults = {};
    let hits = 0;
    for (const m of matchups) {
      const winnerId = byPair.get(pairKey(m.teamA, m.teamB));
      if (!winnerId) continue;
      if (winnerId !== m.teamA && winnerId !== m.teamB) continue;
      roundRes[m.id] = { winnerId };
      hits += 1;
    }

    if (hits === 0) break;
    results.push(roundRes);

    if (hits < matchups.length) break;
  }

  return results;
}

export const OFFICIAL_ROUNDS: RoundResults[] =
  data.rounds && data.rounds.length > 0
    ? data.rounds
    : buildOfficialRounds(OFFICIAL_GAMES);

export function cloneOfficialRounds(
  games: OfficialGame[] = OFFICIAL_GAMES,
): RoundResults[] {
  return buildOfficialRounds(games).map((r) => ({ ...r }));
}

export function officialWinnerForMatch(
  match: Matchup,
  games: OfficialGame[] = OFFICIAL_GAMES,
): string | undefined {
  return officialWinnerFor(match.teamA, match.teamB, games);
}

/**
 * Fill undecided matchups from Leaguepedia without overwriting user picks.
 * Newly completed official games unlock further rounds when a round completes.
 */
export function mergeOfficialIntoUserResults(
  user: RoundResults[],
  games: OfficialGame[],
): RoundResults[] {
  const swiss = swissGames(games);
  if (!swiss.length) return user.map((r) => ({ ...r }));

  const byPair = winnerMapFromGames(swiss);
  let results = user.map((r) => ({ ...r }));

  for (let guard = 0; guard < 8; guard++) {
    const snap = buildSwissSnapshot(results);
    let changed = false;

    for (let ri = 0; ri < snap.rounds.length; ri++) {
      while (results.length <= ri) results.push({});
      const round = { ...results[ri] };
      for (const m of snap.rounds[ri] ?? []) {
        if (round[m.id]) continue;
        const winnerId = byPair.get(pairKey(m.teamA, m.teamB));
        if (!winnerId) continue;
        if (winnerId !== m.teamA && winnerId !== m.teamB) continue;
        round[m.id] = { winnerId };
        changed = true;
      }
      results[ri] = round;
    }

    if (!changed) break;
  }

  return results;
}

export function mergeOfficialPostSwiss(
  state: PostSwissState,
  games: OfficialGame[],
): PostSwissState {
  if (!games.length) return state;
  return mergeOfficialIntoPostSwiss(state, winnerMapFromGames(games));
}

/** Higher seed = lower seed number. */
export function higherSeedWinner(match: Matchup): string {
  const a = TEAM_BY_ID[match.teamA];
  const b = TEAM_BY_ID[match.teamB];
  if (!a || !b) return match.teamA || match.teamB;
  return a.seed <= b.seed ? a.id : b.id;
}

export function randomWinner(match: Matchup): string {
  if (!match.teamA) return match.teamB;
  if (!match.teamB) return match.teamA;
  return Math.random() < 0.5 ? match.teamA : match.teamB;
}
