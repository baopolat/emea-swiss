"use client";

import type { Standing } from "@/lib/swiss";
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
    <div className="flex w-[220px] shrink-0 flex-col gap-3">
      <div className="sticky top-0 z-10 border-b border-[#2a3344] bg-[#0b1220]/95 px-1 pb-2 backdrop-blur">
        <h2 className="text-sm font-bold tracking-wide text-white uppercase">
          Final Result
        </h2>
        <p className="text-[10px] text-[#8b97ab]">
          Prog score · then Swiss seed
        </p>
      </div>

      {finished.length === 0 ? (
        <p className="px-1 text-xs text-[#6b778c]">
          Teams appear here at 4 wins or 4 losses.
        </p>
      ) : (
        orderedKeys.map((key) => {
          const items = groups.get(key) ?? [];
          const isAdvance = items[0]?.status === "advanced";
          return (
            <div key={key} className="flex flex-col gap-1">
              <div
                className={cn(
                  "px-1 text-[11px] font-semibold tracking-wide uppercase",
                  isAdvance ? "text-[#2ecc71]" : "text-[#e74c3c]",
                )}
              >
                {key}
              </div>
              {items.map((s, i) => (
                <div
                  key={s.team.id}
                  className={cn(
                    "grid grid-cols-[20px_1fr_auto] items-center gap-1 rounded-md border px-2 py-1.5 text-[12px]",
                    isAdvance
                      ? "border-[#2ecc71]/35 bg-[#143528] text-[#d8ffe8]"
                      : "border-[#3a2228] bg-[#1a1216] text-[#c9b4b8]",
                  )}
                >
                  <span className="tabular-nums text-[#8b97ab]">
                    {s.advanceSeed ?? i + 1}
                  </span>
                  <span className="truncate font-semibold tracking-wide uppercase">
                    {s.team.short}
                    <span className="ml-1 font-normal text-[#8b97ab]">
                      +{s.progressive}
                    </span>
                  </span>
                  <span
                    className={cn(
                      "text-[10px] font-medium uppercase",
                      isAdvance ? "text-[#2ecc71]" : "text-[#e74c3c]",
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
