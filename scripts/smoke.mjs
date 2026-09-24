import { pair } from "@echecs/swiss";

const players = Array.from({ length: 32 }, (_, i) => ({
  id: `t${i + 1}`,
  rating: 3300 - (i + 1),
  points: 0,
  rank: i + 1,
  startingRank: i + 1,
}));

const r1Games = Array.from({ length: 16 }, (_, i) => ({
  white: `t${i + 1}`,
  black: `t${i + 17}`,
  result: "white",
}));

for (const p of players) {
  const g = r1Games.find((x) => x.white === p.id || x.black === p.id);
  const won =
    (g.white === p.id && g.result === "white") ||
    (g.black === p.id && g.result === "black");
  p.points = won ? 1 : 0;
}
players.sort((a, b) => b.points - a.points || a.startingRank - b.startingRank);
players.forEach((p, i) => (p.rank = i + 1));

const r2 = pair(players, [{ games: r1Games, byes: [] }], { expectedRounds: 7 });
console.log("R2 count", r2.games.length);
for (const g of r2.games) {
  const a = players.find((p) => p.id === g.white);
  const b = players.find((p) => p.id === g.black);
  console.log(`${a.startingRank}(${a.points}) vs ${b.startingRank}(${b.points})`);
}
