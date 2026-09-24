"use client";

import type { Standing } from "@/lib/swiss";
import { TeamLogo } from "@/components/MatchCard";
import { cn } from "@/lib/utils";

type FinalResultsColumnProps = {
  standings: Standing[];
};

const RECORD_ORDER = [
  "4-0",
  "4-1",
  "4-2",
  "4-3",
  "3-4",
  "2-4",
  "1-4",
  "0-4",
];

export function FinalResultsColumn({ standings }: FinalResultsColumnProps) {
  const finished = standings.filter(
    (s) => s.status === "advanced" || s.status === "eliminated",
  );

  const groups = new Map<string, Standing[]>();
  for (const s of finished) {
    const key = `${s.wins}-${s.losses}`;
    const list = groups.get(key) ?? [];
    list.push(s);
    groups.set(key, list);
  }

  const orderedKeys = [
    ...RECORD_ORDER.filter((k) => groups.has(k)),
    ...[...groups.keys()].filter((k) => !RECORD_ORDER.includes(k)),
  ];

  return (
    <div className="flex w-[240px] shrink-0 flex-col gap-3">
      <div className="sticky top-[61px] z-10 rounded-lg border border-[#243044] bg-[#101722]/95 px-3 py-2.5 backdrop-blur">
        <h2 className="text-[13px] font-bold tracking-[0.14em] text-white uppercase">
          Final Result
        </h2>
        <p className="mt-1 text-[10px] text-[#7a879c]">
          Prog score · then Swiss seed
        </p>
      </div>

      {finished.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[#2c3548] px-3 py-6 text-center text-xs text-[#5c6b82]">
          Teams land here at 4 wins or 4 losses.
        </div>
      ) : (
        orderedKeys.map((key) => {
          const items = groups.get(key) ?? [];
          const isAdvance = items[0]?.status === "advanced";
          return (
            <div key={key} className="flex flex-col gap-1.5">
              <div
                className={cn(
                  "px-1 text-[11px] font-bold tracking-[0.14em] uppercase",
                  isAdvance ? "text-[#2ecc71]" : "text-[#ef4444]",
                )}
              >
                {key}
              </div>
              {items.map((s, i) => (
                <div
                  key={s.team.id}
                  className={cn(
                    "grid grid-cols-[22px_28px_minmax(0,1fr)_auto] items-center gap-1.5 rounded-lg border px-2 py-1.5 text-[12px]",
                    isAdvance
                      ? "border-[#2ecc71]/30 bg-[#10291d] text-[#d8ffe8]"
                      : "border-[#3f242a] bg-[#1a1216] text-[#d4b8bc]",
                  )}
                >
                  <span className="text-[10px] tabular-nums text-[#8b97ab]">
                    {s.advanceSeed ?? i + 1}
                  </span>
                  <TeamLogo team={s.team} size={24} />
                  <span className="truncate font-bold tracking-wide uppercase">
                    {s.team.short}
                    <span className="ml-1 font-semibold text-[#8b97ab]">
                      +{s.progressive}
                    </span>
                  </span>
                  <span
                    className={cn(
                      "text-[9px] font-bold tracking-wide uppercase",
                      isAdvance ? "text-[#2ecc71]" : "text-[#ef4444]",
                    )}
                  >
                    {isAdvance ? "adv" : "out"}
                  </span>
                </div>
              ))}
            </div>
          );
        })
      )}
    </div>
  );
}
