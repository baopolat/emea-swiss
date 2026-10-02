export type Team = {
  id: string;
  name: string;
  short: string;
  seed: number;
  /** Accent fallback if logo fails to load */
  color: string;
  /** Local path under /public from Leaguepedia square logo */
  logo: string;
};

/** Official Swiss Stage seeds + shortcodes for EMEA Masters Summer 2026. */
export const TEAMS: Team[] = [
  { id: "big", name: "BIG", short: "BIG", seed: 1, color: "#e10600", logo: "/logos/big.png" },
  { id: "tln", name: "TLN Pirates", short: "TLNP", seed: 2, color: "#1d4ed8", logo: "/logos/tln.png" },
  { id: "g2n", name: "G2 NORD", short: "G2N", seed: 3, color: "#a3a3a3", logo: "/logos/g2n.png" },
  { id: "hrts", name: "Heretics Academy", short: "HRTS", seed: 4, color: "#dc2626", logo: "/logos/hrts.png" },
  { id: "bw", name: "Bushido Wildcats", short: "BW", seed: 5, color: "#b45309", logo: "/logos/bw.png" },
  { id: "anb", name: "Anubis Gaming", short: "ANB", seed: 6, color: "#ca8a04", logo: "/logos/anb.png" },
  { id: "kcb", name: "Karmine Corp Blue", short: "KCB", seed: 7, color: "#2563eb", logo: "/logos/kcb.png" },
  { id: "khk", name: "Kaufland Hangry Knights", short: "KHK", seed: 8, color: "#ef4444", logo: "/logos/khk.png" },
  { id: "pcf", name: "PCIFIC Esports", short: "PCF", seed: 9, color: "#0ea5e9", logo: "/logos/pcf.png" },
  { id: "jsk", name: "JSK Esports", short: "JSK", seed: 10, color: "#7c3aed", logo: "/logos/jsk.png" },
  { id: "hmb", name: "HMBLE", short: "HMB", seed: 11, color: "#f59e0b", logo: "/logos/hmb.png" },
  { id: "vlr", name: "Valerion", short: "VLR", seed: 12, color: "#6366f1", logo: "/logos/vlr.png" },
  { id: "cg", name: "Colossal Gaming", short: "CG", seed: 13, color: "#0891b2", logo: "/logos/cg.png" },
  { id: "tp", name: "Team Phantasma", short: "TP", seed: 14, color: "#8b5cf6", logo: "/logos/tp.png" },
  { id: "boom", name: "Bomba Team", short: "BOOM", seed: 15, color: "#ea580c", logo: "/logos/boom.png" },
  { id: "nbs", name: "Nightbirds", short: "NBS", seed: 16, color: "#334155", logo: "/logos/nbs.png" },
  { id: "fec", name: "Frites Esports Club", short: "FEC", seed: 17, color: "#eab308", logo: "/logos/fec.png" },
  { id: "mgz", name: "Magaza Esports", short: "MGZ", seed: 18, color: "#16a34a", logo: "/logos/mgz.png" },
  { id: "fsk", name: "Forsaken", short: "FSK", seed: 19, color: "#475569", logo: "/logos/fsk.png" },
  { id: "esb", name: "eSuba", short: "ESB", seed: 20, color: "#22c55e", logo: "/logos/esb.png" },
  { id: "snsh", name: "Senshi eSports", short: "SNSH", seed: 21, color: "#db2777", logo: "/logos/snsh.png" },
  { id: "tsc", name: "The Secret Club", short: "TSC", seed: 22, color: "#64748b", logo: "/logos/tsc.png" },
  { id: "wd", name: "White Dragons", short: "WD", seed: 23, color: "#e2e8f0", logo: "/logos/wd.png" },
  { id: "rud", name: "Ruddy Corporation", short: "RUD", seed: 24, color: "#b91c1c", logo: "/logos/rud.png" },
  { id: "use", name: "Unicorns of Love Sexy Edition", short: "USE", seed: 25, color: "#ec4899", logo: "/logos/use.png" },
  { id: "bar", name: "Barça eSports", short: "BAR", seed: 26, color: "#a50044", logo: "/logos/bar.png" },
  { id: "ucam", name: "UCAM Esports Club", short: "UCAM", seed: 27, color: "#1e40af", logo: "/logos/ucam.png" },
  { id: "lds", name: "LODIS", short: "LDS", seed: 28, color: "#dc2626", logo: "/logos/lds.png" },
  { id: "sc", name: "Skillcamp", short: "SC", seed: 29, color: "#0d9488", logo: "/logos/sc.png" },
  { id: "su", name: "SU Esports", short: "SU", seed: 30, color: "#f97316", logo: "/logos/su.png" },
  { id: "gsmc", name: "Gamespace Mediterranean College Esports", short: "GSMC", seed: 31, color: "#0284c7", logo: "/logos/gsmc.png" },
  { id: "ots", name: "Otter Side", short: "OTS", seed: 32, color: "#78716c", logo: "/logos/ots.png" },
];

/**
 * WSCI invite teams for Knockout Matches (not in Swiss Stage).
 * Order = WSCI EMEA ranking (#1–#3); paired reverse vs Swiss advance seeds 16–14.
 */
export const INVITE_TEAMS: Team[] = [
  {
    id: "gl",
    name: "Galions",
    short: "GL",
    seed: 101,
    color: "#a855f7",
    logo: "/logos/gl.png",
  },
  {
    id: "sly",
    name: "Solary",
    short: "SLY",
    seed: 102,
    color: "#f97316",
    logo: "/logos/sly.png",
  },
  {
    id: "mkf",
    name: "Movistar KOI Fénix",
    short: "MKF",
    seed: 103,
    color: "#0ea5e9",
    logo: "/logos/mkf.png",
  },
];

/** WSCI #1–#3 in ranking order (Galions, Solary, MKOI Fénix). */
export const INVITE_TEAM_IDS = INVITE_TEAMS.map((t) => t.id);

/** Swiss + invite teams for match cards / Leaguepedia resolution. */
export const ALL_TEAMS: Team[] = [...TEAMS, ...INVITE_TEAMS];

export const TEAM_BY_ID: Record<string, Team> = Object.fromEntries(
  ALL_TEAMS.map((t) => [t.id, t]),
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
