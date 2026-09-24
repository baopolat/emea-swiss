import { TEAM_BY_SEED } from "./teams";

export type FixedMatch = {
  id: string;
  label: string;
  teamA: string;
  teamB: string;
};

/** Official Pool 0-0 Swiss Round 1 (Bo1) pairings. */
export const ROUND1_MATCHES: FixedMatch[] = [
  { id: "r1-1", label: "1.1", teamA: TEAM_BY_SEED[1].id, teamB: TEAM_BY_SEED[17].id },
  { id: "r1-2", label: "1.2", teamA: TEAM_BY_SEED[2].id, teamB: TEAM_BY_SEED[18].id },
  { id: "r1-3", label: "1.3", teamA: TEAM_BY_SEED[3].id, teamB: TEAM_BY_SEED[19].id },
  { id: "r1-4", label: "1.4", teamA: TEAM_BY_SEED[4].id, teamB: TEAM_BY_SEED[20].id },
  { id: "r1-5", label: "1.5", teamA: TEAM_BY_SEED[5].id, teamB: TEAM_BY_SEED[21].id },
  { id: "r1-6", label: "1.6", teamA: TEAM_BY_SEED[6].id, teamB: TEAM_BY_SEED[22].id },
  { id: "r1-7", label: "1.7", teamA: TEAM_BY_SEED[7].id, teamB: TEAM_BY_SEED[23].id },
  { id: "r1-8", label: "1.8", teamA: TEAM_BY_SEED[8].id, teamB: TEAM_BY_SEED[24].id },
  { id: "r1-9", label: "1.9", teamA: TEAM_BY_SEED[9].id, teamB: TEAM_BY_SEED[25].id },
  { id: "r1-10", label: "1.10", teamA: TEAM_BY_SEED[10].id, teamB: TEAM_BY_SEED[26].id },
  { id: "r1-11", label: "1.11", teamA: TEAM_BY_SEED[11].id, teamB: TEAM_BY_SEED[27].id },
  { id: "r1-12", label: "1.12", teamA: TEAM_BY_SEED[12].id, teamB: TEAM_BY_SEED[28].id },
  { id: "r1-13", label: "1.13", teamA: TEAM_BY_SEED[13].id, teamB: TEAM_BY_SEED[29].id },
  { id: "r1-14", label: "1.14", teamA: TEAM_BY_SEED[14].id, teamB: TEAM_BY_SEED[30].id },
  { id: "r1-15", label: "1.15", teamA: TEAM_BY_SEED[15].id, teamB: TEAM_BY_SEED[31].id },
  { id: "r1-16", label: "1.16", teamA: TEAM_BY_SEED[16].id, teamB: TEAM_BY_SEED[32].id },
];
