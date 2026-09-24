import type { Matchup } from "@/lib/swiss";

export type PoolGroup = {
  pool: string;
  label: string;
  matches: Matchup[];
};

const POOL_LABELS: Record<string, string> = {
  "0-0": "Opening (0-0)",
  "1-0": "High (1-0)",
  "0-1": "Low (0-1)",
  "2-0": "High (2-0)",
  "1-1": "Mid (1-1)",
  "0-2": "Low (0-2)",
  "3-0": "Qualification (3-0)",
  "2-1": "High (2-1)",
  "1-2": "Low (1-2)",
  "0-3": "Elimination (0-3)",
  "3-1": "Qualification (3-1)",
  "2-2": "Mid (2-2)",
  "1-3": "Elimination (1-3)",
  "3-2": "Qualification (3-2)",
  "2-3": "Elimination (2-3)",
};

function poolOrderKey(pool: string): number {
  const [w, l] = pool.split("-").map(Number);
  // Higher wins first, then fewer losses, keep qualification pools visually high.
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
      label: POOL_LABELS[pool] ?? `Pool (${pool})`,
      matches,
    }));
}
