export type Team = {
  id: string;
  name: string;
  short: string;
  seed: number;
};

/** Official Swiss Stage seeds for EMEA Masters Summer 2026. */
export const TEAMS: Team[] = [
  { id: "big", name: "BIG", short: "BIG", seed: 1 },
  { id: "tln", name: "TLN Pirates", short: "TLN", seed: 2 },
  { id: "g2n", name: "G2 NORD", short: "G2N", seed: 3 },
  { id: "hrta", name: "Heretics Academy", short: "HRTA", seed: 4 },
  { id: "bw", name: "Bushido Wildcats", short: "BW", seed: 5 },
  { id: "anb", name: "Anubis Gaming", short: "ANB", seed: 6 },
  { id: "kcb", name: "Karmine Corp Blue", short: "KCB", seed: 7 },
  { id: "khk", name: "Kaufland Hangry Knights", short: "KHK", seed: 8 },
  { id: "pcf", name: "PCIFIC Esports", short: "PCF", seed: 9 },
  { id: "jsk", name: "JSK Esports", short: "JSK", seed: 10 },
  { id: "hmble", name: "HMBLE", short: "HMBLE", seed: 11 },
  { id: "val", name: "Valerion", short: "VAL", seed: 12 },
  { id: "cg", name: "Colossal Gaming", short: "CG", seed: 13 },
  { id: "tp", name: "Team Phantasma", short: "TP", seed: 14 },
  { id: "bmb", name: "Bomba Team", short: "BMB", seed: 15 },
  { id: "ntb", name: "Nightbirds", short: "NTB", seed: 16 },
  { id: "fec", name: "Frites Esports Club", short: "FEC", seed: 17 },
  { id: "mgz", name: "Magaza Esports", short: "MGZ", seed: 18 },
  { id: "fsk", name: "Forsaken", short: "FSK", seed: 19 },
  { id: "esb", name: "eSuba", short: "ESB", seed: 20 },
  { id: "sns", name: "Senshi eSports", short: "SNS", seed: 21 },
  { id: "tsc", name: "The Secret Club", short: "TSC", seed: 22 },
  { id: "wd", name: "White Dragons", short: "WD", seed: 23 },
  { id: "rdy", name: "Ruddy Corporation", short: "RDY", seed: 24 },
  { id: "uol", name: "Unicorns of Love - Sexy Edition", short: "UOL", seed: 25 },
  { id: "bar", name: "Barça eSports", short: "BAR", seed: 26 },
  { id: "ucam", name: "UCAM Esports", short: "UCAM", seed: 27 },
  { id: "lds", name: "LODIS", short: "LDS", seed: 28 },
  { id: "skc", name: "Skillcamp", short: "SKC", seed: 29 },
  { id: "avl", name: "Avella SU Esports", short: "AVL", seed: 30 },
  { id: "gsmc", name: "Gamespace Mediterranean College Esports", short: "GSMC", seed: 31 },
  { id: "ots", name: "Otter Side", short: "OTS", seed: 32 },
];

export const TEAM_BY_ID: Record<string, Team> = Object.fromEntries(
  TEAMS.map((t) => [t.id, t]),
);

export const TEAM_BY_SEED: Record<number, Team> = Object.fromEntries(
  TEAMS.map((t) => [t.seed, t]),
);

/** Higher seed number → lower rating so FIDE Dutch treats #1 as strongest. */
export function ratingFromSeed(seed: number): number {
  return 3300 - seed;
}

export const WINS_TO_ADVANCE = 4;
export const LOSSES_TO_ELIMINATE = 4;
export const MAX_ROUNDS = 7;
