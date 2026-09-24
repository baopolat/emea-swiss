export type Team = {
  id: string;
  name: string;
  short: string;
  seed: number;
  /** Accent for monogram badge */
  color: string;
};

/** Official Swiss Stage seeds + shortcodes for EMEA Masters Summer 2026. */
export const TEAMS: Team[] = [
  { id: "big", name: "BIG", short: "BIG", seed: 1, color: "#e10600" },
  { id: "tln", name: "TLN Pirates", short: "TLNP", seed: 2, color: "#1d4ed8" },
  { id: "g2n", name: "G2 NORD", short: "G2N", seed: 3, color: "#a3a3a3" },
  { id: "hrta", name: "Heretics Academy", short: "HRTS", seed: 4, color: "#dc2626" },
  { id: "bw", name: "Bushido Wildcats", short: "BW", seed: 5, color: "#b45309" },
  { id: "anb", name: "Anubis Gaming", short: "ANB", seed: 6, color: "#ca8a04" },
  { id: "kcb", name: "Karmine Corp Blue", short: "KCB", seed: 7, color: "#2563eb" },
  { id: "khk", name: "Kaufland Hangry Knights", short: "KHK", seed: 8, color: "#ef4444" },
  { id: "pcf", name: "PCIFIC Esports", short: "PCF", seed: 9, color: "#0ea5e9" },
  { id: "jsk", name: "JSK Esports", short: "JSK", seed: 10, color: "#7c3aed" },
  { id: "hmble", name: "HMBLE", short: "HMB", seed: 11, color: "#f59e0b" },
  { id: "val", name: "Valerion", short: "VLR", seed: 12, color: "#6366f1" },
  { id: "cg", name: "Colossal Gaming", short: "CG", seed: 13, color: "#0891b2" },
  { id: "tp", name: "Team Phantasma", short: "TP", seed: 14, color: "#8b5cf6" },
  { id: "bmb", name: "Bomba Team", short: "BOOM", seed: 15, color: "#ea580c" },
  { id: "ntb", name: "Nightbirds", short: "NBS", seed: 16, color: "#334155" },
  { id: "fec", name: "Frites Esports Club", short: "FEC", seed: 17, color: "#eab308" },
  { id: "mgz", name: "Magaza Esports", short: "MGZ", seed: 18, color: "#16a34a" },
  { id: "fsk", name: "Forsaken", short: "FSK", seed: 19, color: "#475569" },
  { id: "esb", name: "eSuba", short: "ESB", seed: 20, color: "#22c55e" },
  { id: "sns", name: "Senshi eSports", short: "SNSH", seed: 21, color: "#db2777" },
  { id: "tsc", name: "The Secret Club", short: "TSC", seed: 22, color: "#64748b" },
  { id: "wd", name: "White Dragons", short: "WD", seed: 23, color: "#e2e8f0" },
  { id: "rdy", name: "Ruddy Corporation", short: "RUD", seed: 24, color: "#b91c1c" },
  { id: "uol", name: "Unicorns of Love Sexy Edition", short: "USE", seed: 25, color: "#ec4899" },
  { id: "bar", name: "Barça eSports", short: "BAR", seed: 26, color: "#a50044" },
  { id: "ucam", name: "UCAM Esports Club", short: "UCAM", seed: 27, color: "#1e40af" },
  { id: "lds", name: "LODIS", short: "LDS", seed: 28, color: "#dc2626" },
  { id: "skc", name: "Skillcamp", short: "SC", seed: 29, color: "#0d9488" },
  { id: "avl", name: "SU Esports", short: "SU", seed: 30, color: "#f97316" },
  { id: "gsmc", name: "Gamespace Mediterranean College Esports", short: "GSMC", seed: 31, color: "#0284c7" },
  { id: "ots", name: "Otter Side", short: "OTS", seed: 32, color: "#78716c" },
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
