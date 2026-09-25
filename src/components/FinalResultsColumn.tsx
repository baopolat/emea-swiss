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

  const advanced = finished.filter((s) => s.status === "advanced").length;
  const eliminated = finished.filter((s) => s.status === "eliminated").length;

  return (
    <div className="fade-up flex w-[260px] shrink-0 flex-col gap-3">
      <div className="sticky top-0 z-10 overflow-hidden rounded-xl border border-[#2a3448] bg-[#0e1522] shadow-[0_12px_24px_-12px_rgba(0,0,0,0.85)]">
        <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-[#3dd68c] via-[#d4b45a] to-[#f07178]" />
        <div className="px-3.5 py-3">
          <h2 className="font-[family-name:var(--font-display)] text-lg leading-none tracking-[0.08em] text-white uppercase">
            Final Result
          </h2>
          <p className="mt-1.5 text-[10px] leading-snug text-[#7a879c]">
            Progressive score · then Swiss seed
          </p>
          {finished.length > 0 && (
            <div className="mt-2.5 flex gap-2 text-[10px] font-semibold">
              <span className="rounded-md bg-[#3dd68c]/12 px-2 py-0.5 text-[#3dd68c]">
                {advanced} adv
              </span>
              <span className="rounded-md bg-[#f07178]/12 px-2 py-0.5 text-[#f07178]">
                {eliminated} out
              </span>
            </div>
          )}
        </div>
      </div>

      {finished.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[#2a3448] bg-[#0e1522]/40 px-3 py-8 text-center">
          <p className="text-xs font-medium text-[#8b97ab]">Waiting for exits</p>
          <p className="mt-1 text-[10px] leading-relaxed text-[#5c6b82]">
            Teams appear here at 4 wins or 4 losses.
          </p>
        </div>
      ) : (
        orderedKeys.map((key, groupIndex) => {
          const items = groups.get(key) ?? [];
          const isAdvance = items[0]?.status === "advanced";
          return (
            <div
              key={key}
              className="fade-up flex flex-col gap-1.5"
              style={{ animationDelay: `${groupIndex * 40}ms` }}
            >
              <div
                className={cn(
                  "flex items-center gap-2 px-1 text-[11px] font-bold tracking-[0.16em] uppercase",
                  isAdvance ? "text-[#3dd68c]" : "text-[#f07178]",
                )}
              >
                <span
                  className={cn(
                    "size-1.5 rounded-full",
                    isAdvance ? "bg-[#3dd68c]" : "bg-[#f07178]",
                  )}
                />
                {key}
                <span className="ml-auto font-sans text-[10px] tracking-normal text-[#5c6b82] normal-case">
                  {items.length}
                </span>
              </div>
              {items.map((s, i) => (
                <div
                  key={s.team.id}
                  className={cn(
                    "grid grid-cols-[22px_28px_minmax(0,1fr)_auto] items-center gap-1.5 rounded-xl border px-2.5 py-2 text-[12px] transition",
                    isAdvance
                      ? "border-[#3dd68c]/25 bg-[linear-gradient(135deg,#10291d_0%,#0e1a16_100%)] text-[#d8ffe8]"
                      : "border-[#f07178]/20 bg-[linear-gradient(135deg,#1a1216_0%,#140e12_100%)] text-[#e8c8cc]",
                  )}
                >
                  <span className="text-[10px] font-semibold tabular-nums text-[#8b97ab]">
                    {s.advanceSeed ?? i + 1}
                  </span>
                  <TeamLogo team={s.team} size={24} />
                  <span className="min-w-0 truncate font-bold tracking-wide uppercase">
                    {s.team.short}
                    <span className="ml-1.5 font-semibold text-[#8b97ab]">
                      +{s.progressive}
                    </span>
                  </span>
                  <span
                    className={cn(
                      "rounded px-1.5 py-0.5 text-[9px] font-bold tracking-wide uppercase",
                      isAdvance
                        ? "bg-[#3dd68c]/15 text-[#3dd68c]"
                        : "bg-[#f07178]/15 text-[#f07178]",
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
