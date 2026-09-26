#!/usr/bin/env node
/**
 * Fetch team square logos from Leaguepedia (lol.fandom.com MediaWiki API)
 * and write them to public/logos/{id}.png
 *
 * Usage: npm run fetch-logos
 *
 * Optional auth: set LEAGUEPEDIA_BOT_USERNAME / LEAGUEPEDIA_BOT_PASSWORD in .env
 * (Fandom Special:BotPasswords — username is YourUser@BotName).
 *
 * Be polite — Leaguepedia rate-limits unauthenticated requests.
 * This script prefers imageinfo filename resolution with delays.
 */
import { writeFileSync, mkdirSync, readFileSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUT = join(ROOT, "public", "logos");
const MAP = join(__dirname, "logo-map.json");
const UA = "EMEA-Swiss-Calculator/1.0 (educational; logo cache script)";
const API = "https://lol.fandom.com/api.php";

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

const TEAMS = [
  ["big", "BIG"],
  ["tln", "TLN Pirates"],
  ["g2n", "G2 NORD"],
  ["hrts", "Team Heretics Academy"],
  ["bw", "Bushido Wildcats"],
  ["anb", "Anubis Gaming"],
  ["kcb", "Karmine Corp Blue"],
  ["khk", "Kaufland Hangry Knights"],
  ["pcf", "PCIFIC Esports"],
  ["jsk", "JSK Esports"],
  ["hmb", "HMBLE"],
  ["vlr", "Valerion"],
  ["cg", "Colossal Gaming"],
  ["tp", "Team Phantasma"],
  ["boom", "Bomba Team"],
  ["nbs", "Nightbirds"],
  ["fec", "Frites Esports Club"],
  ["mgz", "Magaza Esports"],
  ["fsk", "Forsaken (Polish Team)"],
  ["esb", "ESuba"],
  ["snsh", "Senshi eSports (Benelux Team)"],
  ["tsc", "The Secret Club"],
  ["wd", "White Dragons"],
  ["rud", "Ruddy Corporation"],
  ["use", "Unicorns of Love Sexy Edition"],
  ["bar", "Barça eSports"],
  ["ucam", "UCAM Esports Club"],
  ["lds", "LODIS (Polish Team)"],
  ["sc", "Skillcamp"],
  ["su", "SU Esports"],
  ["gsmc", "Gamespace Mediterranean College Esports"],
  ["ots", "Otter Side"],
];

async function api(params, { method = "GET", body } = {}) {
  const url = new URL(API);
  const headers = { "User-Agent": UA };
  const cookie = cookieHeader();
  if (cookie) headers.Cookie = cookie;

  let res;
  if (method === "POST") {
    headers["Content-Type"] = "application/x-www-form-urlencoded";
    const form = new URLSearchParams({ format: "json", ...params });
    if (body) for (const [k, v] of Object.entries(body)) form.set(k, v);
    res = await fetch(url, { method: "POST", headers, body: form });
  } else {
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    if (!url.searchParams.has("format")) url.searchParams.set("format", "json");
    res = await fetch(url, { headers });
  }

  storeCookies(res);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
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

async function main() {
  mkdirSync(OUT, { recursive: true });
  await loginWithBotPassword();

  // imageinfo in batches of 20
  const mapping = existsSync(MAP) ? JSON.parse(readFileSync(MAP, "utf8")) : {};
  for (let i = 0; i < TEAMS.length; i += 20) {
    const slice = TEAMS.slice(i, i + 20);
    const batchTitles = slice
      .map(([, name]) => `File:${name}logo square.png`)
      .join("|");
    const data = await api({
      action: "query",
      format: "json",
      prop: "imageinfo",
      iiprop: "url",
      titles: batchTitles,
    });
    const pages = Object.values(data.query?.pages ?? {});
    for (const page of pages) {
      if (page.missing) continue;
      const file = page.title.replace(/^File:/, "");
      const url = page.imageinfo?.[0]?.url;
      if (!url) continue;
      const team = slice.find(([, name]) => file.startsWith(name));
      if (!team) {
        // fuzzy: match by checking which name is prefix of file
        const hit = TEAMS.find(([, name]) => file.startsWith(`${name}logo`));
        if (hit) mapping[hit[0]] = { file, url };
        continue;
      }
      mapping[team[0]] = { file, url };
    }
    await sleep(1200);
  }

  // download
  for (const [id] of TEAMS) {
    const info = mapping[id];
    if (!info?.url) {
      console.warn("missing", id);
      continue;
    }
    const base = info.url.split("?")[0];
    const dl = base.includes("/revision/latest")
      ? `${base}/scale-to-width-down/128`
      : base;
    const headers = {
      "User-Agent": UA,
      Referer: "https://lol.fandom.com/",
      Accept: "image/*,*/*",
    };
    const cookie = cookieHeader();
    if (cookie) headers.Cookie = cookie;
    const res = await fetch(dl, { headers });
    if (!res.ok) {
      console.warn("download fail", id, res.status);
      continue;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    writeFileSync(join(OUT, `${id}.png`), buf);
    console.log("saved", id, buf.length);
    await sleep(300);
  }

  writeFileSync(MAP, JSON.stringify(mapping, null, 2));
  console.log("wrote", MAP);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
