#!/usr/bin/env node
/**
 * Fetch team square logos from Leaguepedia (lol.fandom.com MediaWiki API)
 * and write them to public/logos/{id}.png
 *
 * Usage: npm run fetch-logos
 *
 * Be polite — Leaguepedia rate-limits unauthenticated Cargo queries.
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

async function api(params) {
  const url = new URL("https://lol.fandom.com/api.php");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const titles = TEAMS.map(([, name]) => `File:${name}logo square.png`).join(
    "|",
  );

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
    const res = await fetch(dl, {
      headers: {
        "User-Agent": UA,
        Referer: "https://lol.fandom.com/",
        Accept: "image/*,*/*",
      },
    });
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
