import type { Matchup } from "@/lib/swiss";

export type PoolGroup = {
  pool: string;
  label: string;
  format: "Bo1" | "Bo3";
  matches: Matchup[];
};

/** Qualification / elimination pools are Bo3; all others Bo1. */
export function seriesFormat(pool: string): "Bo1" | "Bo3" {
  const primary = pool.split("/")[0] ?? pool;
  const [w, l] = primary.split("-").map(Number);
  if (Number.isNaN(w) || Number.isNaN(l)) return "Bo1";
  // Playing for 4th win or 4th loss
  if (w >= 3 || l >= 3) return "Bo3";
  return "Bo1";
}

function poolLabel(pool: string): string {
  const format = seriesFormat(pool);
  return `${pool} (${format})`;
}

function poolOrderKey(pool: string): number {
  const primary = pool.split("/")[0] ?? pool;
  const [w, l] = primary.split("-").map(Number);
  return -(w * 10 - l);
}

export function groupMatchupsByPool(matchups: Matchup[]): PoolGroup[] {
  const map = new Map<string, Matchup[]>();
  for (const m of matchups) {
    const list = map.get(m.pool) ?? [];
    list.push(m);
    map.set(m.pool, list);
  }

  return [...map.entries()]
    .sort(([a], [b]) => poolOrderKey(a) - poolOrderKey(b))
    .map(([pool, matches]) => ({
      pool,
      label: poolLabel(pool),
      format: seriesFormat(pool),
      matches,
    }));
}
