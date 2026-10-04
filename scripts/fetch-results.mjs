#!/usr/bin/env node
/**
 * Fetch completed Swiss match results from Leaguepedia MatchSchedule Cargo
 * and write src/data/official-results.json
 *
 * Usage: npm run fetch-results
 *
 * OverviewPage: EMEA Masters/2026 Season/Summer Main Event
 * Optional auth: LEAGUEPEDIA_BOT_USERNAME / LEAGUEPEDIA_BOT_PASSWORD in .env
 */
import { writeFileSync, readFileSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUT = join(ROOT, "src", "data", "official-results.json");
const UA = "EMEA-Swiss-Calculator/1.0 (educational; results cache script)";
const API = "https://lol.fandom.com/api.php";
const OVERVIEW_PAGE = "EMEA Masters/2026 Season/Summer Main Event";

/** App team id → Leaguepedia display names (primary + aliases). */
const TEAM_NAMES = {
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

loadEnvFile(join(ROOT, ".env"));

const cookieJar = new Map();

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

function storeCookies(res) {
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

async function api(params, { method = "GET" } = {}) {
  const url = new URL(API);
  const headers = { "User-Agent": UA };
  const cookie = cookieHeader();
  if (cookie) headers.Cookie = cookie;

  let res;
  if (method === "POST") {
    headers["Content-Type"] = "application/x-www-form-urlencoded";
    const form = new URLSearchParams({ format: "json", ...params });
    res = await fetch(url, { method: "POST", headers, body: form });
  } else {
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    if (!url.searchParams.has("format")) url.searchParams.set("format", "json");
    res = await fetch(url, { headers });
  }

  storeCookies(res);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  if (data.error) {
    throw new Error(
      `API error ${data.error.code}: ${data.error.info ?? "unknown"}`,
    );
  }
  return data;
}

async function loginWithBotPassword() {
  const username = process.env.LEAGUEPEDIA_BOT_USERNAME?.trim();
  const password = process.env.LEAGUEPEDIA_BOT_PASSWORD?.trim();
  if (!username || !password) {
    console.warn(
      "No LEAGUEPEDIA_BOT_USERNAME/PASSWORD in .env — running unauthenticated",
    );
    return false;
  }

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

  const result = login.login?.result;
  if (result !== "Success") {
    throw new Error(
      `Leaguepedia login failed: ${result ?? "unknown"} (${login.login?.reason ?? login.error?.info ?? "check bot password"})`,
    );
  }
  console.log("logged in as", login.login?.lgusername ?? username);
  return true;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function buildNameIndex() {
  const index = new Map();
  for (const [id, names] of Object.entries(TEAM_NAMES)) {
    for (const name of names) {
      index.set(normalizeName(name), id);
    }
  }
  return index;
}

function normalizeName(name) {
  return String(name ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function resolveTeamId(name, index) {
  const key = normalizeName(name);
  if (!key) return null;
  if (index.has(key)) return index.get(key);
  // Prefix / contains fallback for slight naming drift
  for (const [k, id] of index) {
    if (k.startsWith(key) || key.startsWith(k)) return id;
  }
  return null;
}

function classifyTab(tab) {
  const t = String(tab ?? "").toLowerCase();
  if (/lcq|last chance/i.test(t)) return null;
  if (/knockout|\bko\b/i.test(t)) return "knockout";
  if (/playoff|quarter|semi|final|bracket/i.test(t)) return "playoff";
  return "swiss";
}

function seriesComplete(bestOf, score1, score2) {
  if (!Number.isFinite(score1) || !Number.isFinite(score2) || score1 === score2) {
    return false;
  }
  const bo = Number(bestOf);
  const need = Number.isFinite(bo) && bo > 0 ? Math.ceil(bo / 2) : 1;
  return Math.max(score1, score2) >= need;
}

async function cargoQueryAll(fields, where) {
  const rows = [];
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
    for (const item of batch) rows.push(item.title ?? item);
    if (batch.length < limit) break;
    offset += limit;
    await sleep(800);
  }
  return rows;
}

async function main() {
  await loginWithBotPassword();
  await sleep(500);

  const fields =
    "Team1,Team2,Team1Score,Team2Score,Winner,Tab,BestOf,IsTiebreaker";
  const where = `OverviewPage="${OVERVIEW_PAGE}" AND (IsTiebreaker IS NULL OR IsTiebreaker != "1") AND (Winner IS NOT NULL OR (Team1Score IS NOT NULL AND Team2Score IS NOT NULL))`;

  console.log("querying MatchSchedule for", OVERVIEW_PAGE);
  let rows;
  try {
    rows = await cargoQueryAll(fields, where);
  } catch (err) {
    // Some wikis omit IsTiebreaker; retry without it
    console.warn("primary query failed, retrying without IsTiebreaker:", err.message);
    await sleep(1000);
    rows = await cargoQueryAll(
      "Team1,Team2,Team1Score,Team2Score,Winner,Tab,BestOf",
      `OverviewPage="${OVERVIEW_PAGE}" AND (Winner IS NOT NULL OR (Team1Score IS NOT NULL AND Team2Score IS NOT NULL))`,
    );
  }

  console.log("raw scored/completed matches:", rows.length);
  const tabs = [...new Set(rows.map((r) => r.Tab).filter(Boolean))];
  console.log("tabs:", tabs.join(" | ") || "(none)");

  const index = buildNameIndex();
  const games = [];
  const skipped = [];

  for (const row of rows) {
    const stage = classifyTab(row.Tab);
    if (!stage) {
      skipped.push({ reason: "excluded-tab", tab: row.Tab, team1: row.Team1 });
      continue;
    }
    if (String(row.IsTiebreaker) === "1") continue;

    const team1Id = resolveTeamId(row.Team1, index);
    const team2Id = resolveTeamId(row.Team2, index);
    if (!team1Id || !team2Id) {
      skipped.push({
        reason: "unmapped-team",
        team1: row.Team1,
        team2: row.Team2,
        tab: row.Tab,
      });
      continue;
    }

    const s1 = Number(row.Team1Score);
    const s2 = Number(row.Team2Score);
    const scoresComplete = seriesComplete(row.BestOf, s1, s2);

    // Winner is usually "1" or "2" (side), sometimes a team name
    let winnerId = null;
    const w = String(row.Winner ?? "").trim();
    if (w === "1") winnerId = team1Id;
    else if (w === "2") winnerId = team2Id;
    else if (w) {
      winnerId = resolveTeamId(w, index);
    }
    if (!winnerId && scoresComplete) {
      winnerId = s1 > s2 ? team1Id : team2Id;
    }
    if (!winnerId && !scoresComplete) {
      skipped.push({
        reason: "in-progress",
        team1: row.Team1,
        team2: row.Team2,
        score: `${row.Team1Score}-${row.Team2Score}`,
      });
      continue;
    }

    if (!winnerId || (winnerId !== team1Id && winnerId !== team2Id)) {
      skipped.push({
        reason: "no-winner",
        team1: row.Team1,
        team2: row.Team2,
        winner: row.Winner,
      });
      continue;
    }

    games.push({
      teamAId: team1Id,
      teamBId: team2Id,
      winnerId,
      stage,
      tab: row.Tab ?? null,
    });
  }

  // Prefer playoff > knockout > swiss when the same pair appears twice
  const stageRank = { swiss: 1, knockout: 2, playoff: 3 };
  const byPair = new Map();
  for (const g of games) {
    const key = [g.teamAId, g.teamBId].sort().join("|");
    const prev = byPair.get(key);
    if (!prev || stageRank[g.stage] >= stageRank[prev.stage ?? "swiss"]) {
      byPair.set(key, {
        teamAId: g.teamAId,
        teamBId: g.teamBId,
        winnerId: g.winnerId,
        stage: g.stage,
      });
    }
  }
  const uniqueGames = [...byPair.values()];

  const payload = {
    fetchedAt: new Date().toISOString(),
    overviewPage: OVERVIEW_PAGE,
    games: uniqueGames,
    // rounds are derived at runtime in src/lib/official.ts via FIDE Dutch
    rounds: [],
  };

  writeFileSync(OUT, JSON.stringify(payload, null, 2) + "\n");
  console.log("wrote", OUT);
  console.log(
    "unique games:",
    uniqueGames.length,
    `(swiss ${uniqueGames.filter((g) => g.stage === "swiss").length}, ko ${uniqueGames.filter((g) => g.stage === "knockout").length}, playoff ${uniqueGames.filter((g) => g.stage === "playoff").length})`,
  );
  if (skipped.length) {
    console.warn("skipped", skipped.length, "rows (showing up to 12):");
    for (const s of skipped.slice(0, 12)) console.warn(" ", s);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
