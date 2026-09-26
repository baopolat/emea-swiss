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

  const playoff = finished.filter(
    (s) => s.status === "advanced" && (s.advanceSeed ?? 0) <= 13,
  ).length;
  const knockout = finished.filter(
    (s) => s.status === "advanced" && (s.advanceSeed ?? 0) >= 14,
  ).length;
  const eliminated = finished.filter((s) => s.status === "eliminated").length;

  return (
    <div className="fade-up flex h-full min-h-0 w-[200px] shrink-0 flex-col gap-1 overflow-hidden">
      <div className="relative shrink-0 overflow-hidden rounded-lg border border-[#2a3448] bg-[#0e1522]">
        <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-[#3dd68c] via-[#d4b45a] to-[#f07178]" />
        <div className="px-2 py-1.5">
          <h2 className="font-[family-name:var(--font-display)] text-[0.85rem] leading-none tracking-[0.06em] text-white uppercase">
            Final
          </h2>
          {finished.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1 text-[9px] font-semibold">
              <span className="rounded bg-[#3dd68c]/12 px-1.5 py-px text-[#3dd68c]">
                {playoff} adv
              </span>
              {knockout > 0 && (
                <span className="rounded bg-[#d4b45a]/12 px-1.5 py-px text-[#d4b45a]">
                  {knockout} ko
                </span>
              )}
              <span className="rounded bg-[#f07178]/12 px-1.5 py-px text-[#f07178]">
                {eliminated} out
              </span>
            </div>
          )}
        </div>
      </div>

      {finished.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[#2a3448] bg-[#0e1522]/40 px-2 py-4 text-center">
          <p className="text-[10px] font-medium text-[#8b97ab]">Waiting</p>
          <p className="mt-0.5 text-[9px] leading-relaxed text-[#5c6b82]">
            4W / 4L appear here
          </p>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto overflow-x-hidden">
          {orderedKeys.map((key, groupIndex) => {
            const items = groups.get(key) ?? [];
            const isAdvance = items[0]?.status === "advanced";
            return (
              <div
                key={key}
                className="fade-up flex flex-col gap-0.5"
                style={{ animationDelay: `${groupIndex * 30}ms` }}
              >
                <div
                  className={cn(
                    "flex items-center gap-1 px-0.5 text-[9px] font-bold tracking-[0.12em] uppercase",
                    isAdvance ? "text-[#3dd68c]" : "text-[#f07178]",
                  )}
                >
                  <span
                    className={cn(
                      "size-1 rounded-full",
                      isAdvance ? "bg-[#3dd68c]" : "bg-[#f07178]",
                    )}
                  />
                  {key}
                  <span className="ml-auto font-sans text-[8px] tracking-normal text-[#5c6b82] normal-case">
                    {items.length}
                  </span>
                </div>
                {items.map((s, i) => {
                  const seed = s.advanceSeed ?? i + 1;
                  const isKnockout =
                    isAdvance && seed >= 14 && seed <= 16;
                  return (
                    <div
                      key={s.team.id}
                      className={cn(
                        "grid grid-cols-[16px_18px_minmax(0,1fr)_auto] items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px]",
                        isKnockout
                          ? "border-[#d4b45a]/30 bg-[linear-gradient(135deg,#292010_0%,#1a150e_100%)] text-[#f5e6c8]"
                          : isAdvance
                            ? "border-[#3dd68c]/25 bg-[linear-gradient(135deg,#10291d_0%,#0e1a16_100%)] text-[#d8ffe8]"
                            : "border-[#f07178]/20 bg-[linear-gradient(135deg,#1a1216_0%,#140e12_100%)] text-[#e8c8cc]",
                      )}
                    >
                      <span className="text-[8px] font-semibold tabular-nums text-[#8b97ab]">
                        {seed}
                      </span>
                      <TeamLogo team={s.team} size={16} />
                      <span className="min-w-0 truncate font-bold tracking-wide uppercase">
                        {s.team.short}
                        <span className="ml-1 font-semibold text-[#8b97ab]">
                          +{s.progressive}
                        </span>
                      </span>
                      <span
                        className={cn(
                          "rounded px-1 py-px text-[8px] font-bold tracking-wide uppercase",
                          isKnockout
                            ? "bg-[#d4b45a]/15 text-[#d4b45a]"
                            : isAdvance
                              ? "bg-[#3dd68c]/15 text-[#3dd68c]"
                              : "bg-[#f07178]/15 text-[#f07178]",
                        )}
                      >
                        {isKnockout ? "ko" : isAdvance ? "adv" : "out"}
                      </span>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
