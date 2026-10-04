import type { OfficialGame, OfficialStage } from "@/lib/official";

export const OVERVIEW_PAGE = "EMEA Masters/2026 Season/Summer Main Event";
const UA = "EMEA-Swiss-Calculator/1.0 (educational; official-results API)";
const API = "https://lol.fandom.com/api.php";

/** App team id → Leaguepedia display names (primary + aliases). */
const TEAM_NAMES: Record<string, string[]> = {
  big: ["BIG", "Berlin International Gaming"],
  tln: ["TLN Pirates"],
  g2n: ["G2 NORD"],
  hrts: ["Heretics Academy", "Team Heretics Academy"],
  bw: ["Bushido Wildcats"],
  anb: ["Anubis Gaming"],
  kcb: ["Karmine Corp Blue"],
  khk: ["Kaufland Hangry Knights"],
  pcf: ["PCIFIC Esports"],
  jsk: ["JSK Esports"],
  hmb: ["HMBLE"],
  vlr: ["Valerion"],
  cg: ["Colossal Gaming"],
  tp: ["Team Phantasma"],
  boom: ["Bomba Team"],
  nbs: ["Nightbirds"],
  fec: ["Frites Esports Club"],
  mgz: ["Magaza Esports"],
  fsk: ["Forsaken", "Forsaken (Polish Team)"],
  esb: ["eSuba", "ESuba"],
  snsh: ["Senshi eSports", "Senshi eSports (Benelux Team)"],
  tsc: ["The Secret Club"],
  wd: ["White Dragons"],
  rud: ["Ruddy Corporation"],
  use: ["Unicorns of Love Sexy Edition"],
  bar: ["Barça eSports", "Barca eSports"],
  ucam: ["UCAM Esports Club", "UCAM Esports", "UCAM Tokiers"],
  lds: ["LODIS", "LODIS (Polish Team)"],
  sc: ["Skillcamp"],
  su: ["SU Esports"],
  gsmc: [
    "Gamespace Mediterranean College Esports",
    "Gamespace MCE",
    "GSMC",
  ],
  ots: ["Otter Side"],
  mkf: [
    "Movistar KOI Fénix",
    "Movistar KOI Fenix",
    "MKOI Fénix",
    "MKOI Fenix",
    "KOI Fénix",
    "KOI Fenix",
  ],
  sly: ["Solary"],
  gl: ["Galions"],
};

type CargoRow = Record<string, string | undefined>;

function normalizeName(name: string): string {
  return String(name ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function buildNameIndex(): Map<string, string> {
  const index = new Map<string, string>();
  for (const [id, names] of Object.entries(TEAM_NAMES)) {
    for (const name of names) {
      index.set(normalizeName(name), id);
    }
  }
  return index;
}

function resolveTeamId(
  name: string | undefined,
  index: Map<string, string>,
): string | null {
  const key = normalizeName(name ?? "");
  if (!key) return null;
  if (index.has(key)) return index.get(key) ?? null;
  for (const [k, id] of index) {
    if (k.startsWith(key) || key.startsWith(k)) return id;
  }
  return null;
}

/** Classify MatchSchedule Tab into swiss / knockout / playoff. LCQ excluded. */
export function classifyTab(tab: string | undefined): OfficialStage | null {
  const t = String(tab ?? "").toLowerCase();
  if (/lcq|last chance/i.test(t)) return null;
  if (/knockout|\bko\b/i.test(t)) return "knockout";
  if (/playoff|quarter|semi|final|bracket/i.test(t)) return "playoff";
  return "swiss";
}

/** True when series scores reach the wins needed for BestOf (ignores mid-series). */
export function seriesComplete(
  bestOf: string | number | undefined,
  score1: number,
  score2: number,
): boolean {
  if (!Number.isFinite(score1) || !Number.isFinite(score2) || score1 === score2) {
    return false;
  }
  const bo = Number(bestOf);
  const need = Number.isFinite(bo) && bo > 0 ? Math.ceil(bo / 2) : 1;
  return Math.max(score1, score2) >= need;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function fetchLeaguepediaGames(): Promise<{
  games: OfficialGame[];
  overviewPage: string;
}> {
  const cookieJar = new Map<string, string>();

  function storeCookies(res: Response) {
    const raw = res.headers.getSetCookie?.() ?? [];
    for (const header of raw) {
      const pair = header.split(";")[0];
      const eq = pair.indexOf("=");
      if (eq === -1) continue;
      cookieJar.set(pair.slice(0, eq), pair.slice(eq + 1));
    }
  }

  function cookieHeader() {
    if (cookieJar.size === 0) return undefined;
    return [...cookieJar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
  }

  async function api(
    params: Record<string, string>,
    options: { method?: "GET" | "POST" } = {},
  ) {
    const url = new URL(API);
    const headers: Record<string, string> = { "User-Agent": UA };
    const cookie = cookieHeader();
    if (cookie) headers.Cookie = cookie;

    let res: Response;
    if (options.method === "POST") {
      headers["Content-Type"] = "application/x-www-form-urlencoded";
      res = await fetch(url, {
        method: "POST",
        headers,
        body: new URLSearchParams({ format: "json", ...params }),
        cache: "no-store",
      });
    } else {
      for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
      if (!url.searchParams.has("format")) url.searchParams.set("format", "json");
      res = await fetch(url, { headers, cache: "no-store" });
    }

    storeCookies(res);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as {
      error?: { code?: string; info?: string };
      cargoquery?: { title: CargoRow }[];
      query?: { tokens?: { logintoken?: string } };
      login?: { result?: string; reason?: string; lgusername?: string };
    };
    if (data.error) {
      throw new Error(
        `API error ${data.error.code}: ${data.error.info ?? "unknown"}`,
      );
    }
    return data;
  }

  const username = process.env.LEAGUEPEDIA_BOT_USERNAME?.trim();
  const password = process.env.LEAGUEPEDIA_BOT_PASSWORD?.trim();
  if (username && password) {
    const tokenData = await api({
      action: "query",
      meta: "tokens",
      type: "login",
    });
    const loginToken = tokenData.query?.tokens?.logintoken;
    if (!loginToken) throw new Error("Could not get MediaWiki login token");
    const login = await api(
      {
        action: "login",
        lgname: username,
        lgpassword: password,
        lgtoken: loginToken,
      },
      { method: "POST" },
    );
    if (login.login?.result !== "Success") {
      throw new Error(
        `Leaguepedia login failed: ${login.login?.result ?? "unknown"} (${login.login?.reason ?? "check bot password"})`,
      );
    }
    await sleep(300);
  }

  async function cargoQueryAll(fields: string, where: string) {
    const rows: CargoRow[] = [];
    let offset = 0;
    const limit = 100;
    for (;;) {
      const data = await api({
        action: "cargoquery",
        tables: "MatchSchedule",
        fields,
        where,
        limit: String(limit),
        offset: String(offset),
      });
      const batch = data.cargoquery ?? [];
      for (const item of batch) {
        rows.push((item.title ?? item) as CargoRow);
      }
      if (batch.length < limit) break;
      offset += limit;
      await sleep(400);
    }
    return rows;
  }

  const fields =
    "Team1,Team2,Team1Score,Team2Score,Winner,Tab,BestOf,IsTiebreaker";
  // Include score-complete series even when Winner is still empty on Cargo.
  const where = `OverviewPage="${OVERVIEW_PAGE}" AND (IsTiebreaker IS NULL OR IsTiebreaker != "1") AND (Winner IS NOT NULL OR (Team1Score IS NOT NULL AND Team2Score IS NOT NULL))`;

  let rows: CargoRow[];
  try {
    rows = await cargoQueryAll(fields, where);
  } catch {
    await sleep(500);
    rows = await cargoQueryAll(
      "Team1,Team2,Team1Score,Team2Score,Winner,Tab,BestOf",
      `OverviewPage="${OVERVIEW_PAGE}" AND (Winner IS NOT NULL OR (Team1Score IS NOT NULL AND Team2Score IS NOT NULL))`,
    );
  }

  const index = buildNameIndex();
  const games: OfficialGame[] = [];

  for (const row of rows) {
    const stage = classifyTab(row.Tab);
    if (!stage) continue;
    if (String(row.IsTiebreaker) === "1") continue;

    const team1Id = resolveTeamId(row.Team1, index);
    const team2Id = resolveTeamId(row.Team2, index);
    if (!team1Id || !team2Id) continue;

    const s1 = Number(row.Team1Score);
    const s2 = Number(row.Team2Score);
    const scoresComplete = seriesComplete(row.BestOf, s1, s2);

    let winnerId: string | null = null;
    const w = String(row.Winner ?? "").trim();
    if (w === "1") winnerId = team1Id;
    else if (w === "2") winnerId = team2Id;
    else if (w) {
      winnerId = resolveTeamId(w, index);
    }
    if (!winnerId && scoresComplete) {
      winnerId = s1 > s2 ? team1Id : team2Id;
    }
    // Skip in-progress series with no Winner field.
    if (!winnerId && !scoresComplete) continue;

    if (!winnerId || (winnerId !== team1Id && winnerId !== team2Id)) continue;

    games.push({
      teamAId: team1Id,
      teamBId: team2Id,
      winnerId,
      stage,
    });
  }

  // Prefer playoff > knockout > swiss when the same pair appears twice
  const stageRank: Record<OfficialStage, number> = {
    swiss: 1,
    knockout: 2,
    playoff: 3,
  };
  const byPair = new Map<string, OfficialGame>();
  for (const g of games) {
    const key = [g.teamAId, g.teamBId].sort().join("|");
    const prev = byPair.get(key);
    if (
      !prev ||
      stageRank[g.stage ?? "swiss"] >= stageRank[prev.stage ?? "swiss"]
    ) {
      byPair.set(key, {
        teamAId: g.teamAId,
        teamBId: g.teamBId,
        winnerId: g.winnerId,
        stage: g.stage,
      });
    }
  }

  return {
    overviewPage: OVERVIEW_PAGE,
    games: [...byPair.values()],
  };
}
