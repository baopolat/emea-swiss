"use client";

import type { Standing } from "@/lib/swiss";
import { cn } from "@/lib/utils";

type StandingsProps = {
  standings: Standing[];
  advanced: Standing[];
  eliminated: Standing[];
};

export function Standings({ standings, advanced, eliminated }: StandingsProps) {
  return (
    <aside className="flex flex-col gap-6">
      <StatusStrip
        title="Advanced"
        subtitle="4 wins · seeded by Progressive Score, then Swiss seed"
        items={advanced}
        tone="advance"
      />
      <StatusStrip
        title="Eliminated"
        subtitle="4 losses"
        items={eliminated}
        tone="elim"
      />

      <section className="overflow-hidden rounded-lg border border-white/10 bg-black/25">
        <header className="border-b border-white/10 px-4 py-3">
          <h2 className="font-[family-name:var(--font-display)] text-lg tracking-[0.08em] text-white uppercase">
            Standings
          </h2>
          <p className="mt-1 text-xs text-[var(--mist)]">
            Sort: record → Progressive Score → seed
          </p>
        </header>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[28rem] text-left text-sm">
            <thead className="bg-white/4 text-[10px] tracking-[0.16em] text-[var(--mist)] uppercase">
              <tr>
                <th className="px-3 py-2 font-medium">#</th>
                <th className="px-3 py-2 font-medium">Team</th>
                <th className="px-3 py-2 font-medium">W-L</th>
                <th className="px-3 py-2 font-medium">Prog</th>
                <th className="px-3 py-2 font-medium">Seed</th>
                <th className="px-3 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {standings.map((s, i) => (
                <tr
                  key={s.team.id}
                  className={cn(
                    "border-t border-white/6",
                    s.status === "advanced" && "bg-[var(--gold)]/8",
                    s.status === "eliminated" && "bg-red-500/5 text-white/50",
                  )}
                >
                  <td className="px-3 py-2 text-[var(--mist)]">{i + 1}</td>
                  <td className="px-3 py-2 font-[family-name:var(--font-display)] tracking-wide text-white">
                    {s.team.name}
                  </td>
                  <td className="px-3 py-2 tabular-nums">
                    {s.wins}-{s.losses}
                  </td>
                  <td className="px-3 py-2 tabular-nums text-[var(--gold)]">
                    {s.progressive}
                  </td>
                  <td className="px-3 py-2 tabular-nums text-[var(--mist)]">
                    #{s.team.seed}
                  </td>
                  <td className="px-3 py-2 capitalize">
                    {s.status === "advanced" && s.advanceSeed
                      ? `Adv #${s.advanceSeed}`
                      : s.status}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </aside>
  );
}

function StatusStrip({
  title,
  subtitle,
  items,
  tone,
}: {
  title: string;
  subtitle: string;
  items: Standing[];
  tone: "advance" | "elim";
}) {
  return (
    <section
      className={cn(
        "rounded-lg border px-4 py-3",
        tone === "advance"
          ? "border-[var(--gold)]/30 bg-[var(--gold)]/8"
          : "border-white/10 bg-black/20",
      )}
    >
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-[family-name:var(--font-display)] text-base tracking-[0.1em] text-white uppercase">
          {title}
          <span className="ml-2 text-[var(--mist)] normal-case tracking-normal">
            {items.length}
          </span>
        </h2>
      </div>
      <p className="mt-1 text-xs text-[var(--mist)]">{subtitle}</p>
      {items.length === 0 ? (
        <p className="mt-3 text-sm text-white/35">None yet</p>
      ) : (
        <ul className="mt-3 flex flex-wrap gap-2">
          {items.map((s) => (
            <li
              key={s.team.id}
              className={cn(
                "rounded-sm border px-2 py-1 text-xs",
                tone === "advance"
                  ? "border-[var(--gold)]/40 bg-black/20 text-[var(--gold)]"
                  : "border-white/10 bg-black/30 text-white/60",
              )}
            >
              {tone === "advance" && s.advanceSeed
                ? `#${s.advanceSeed} `
                : null}
              {s.team.short}{" "}
              <span className="opacity-70">
                {s.wins}-{s.losses}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
