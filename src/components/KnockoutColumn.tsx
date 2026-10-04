"use client";

import { MatchCard } from "@/components/MatchCard";
import type { OfficialGame } from "@/lib/official";
import { knockoutGames, officialWinnerForMatch } from "@/lib/official";
import { type KoPairing } from "@/lib/playoffs";
import type { MatchResult } from "@/lib/swiss";

type KnockoutColumnProps = {
  pairings: KoPairing[];
  results: Record<string, MatchResult>;
  officialGames: OfficialGame[];
  onPick: (matchId: string, winnerId: string) => void;
  onClear: (matchId: string) => void;
  onClearResults: () => void;
  onFillOfficial?: () => void;
  horizontal?: boolean;
};

export function KnockoutColumn({
  pairings,
  results,
  officialGames,
  onPick,
  onClear,
  onClearResults,
  onFillOfficial,
  horizontal = false,
}: KnockoutColumnProps) {
  const decided = pairings.filter((p) => results[p.matchId]).length;
  const complete = pairings.length === 3 && decided === 3;
  const koOfficial = knockoutGames(officialGames);

  const display = pairings.map((p) => ({
    id: p.matchId,
    label: p.label,
    teamA: p.inviteTeamId ?? "",
    teamB: p.swissTeamId,
    pool: "ko",
  }));

  const hasOfficial = display.some((m) =>
    officialWinnerForMatch(m, koOfficial),
  );

  const toolbar = (
    <div className="flex flex-wrap items-center gap-1">
      <span
        className={
          complete
            ? "rounded bg-[#2ecc71]/15 px-1.5 py-px text-[9px] font-bold text-[#2ecc71]"
            : "rounded bg-[#d4b45a]/12 px-1.5 py-px text-[9px] font-semibold tabular-nums text-[#d4b45a]"
        }
      >
        {decided}/3
      </span>
      {hasOfficial && onFillOfficial && (
        <button
          type="button"
          onClick={onFillOfficial}
          className="rounded border border-[#2ecc71]/30 bg-[#121820] px-1.5 py-0.5 text-[9px] font-semibold text-[#2ecc71] transition-colors hover:border-[#2ecc71]/55 hover:bg-[#0f1a14] hover:text-[#3dd68c]"
        >
          Official
        </button>
      )}
      {decided > 0 && (
        <button
          type="button"
          onClick={onClearResults}
          className="rounded px-1 py-0.5 text-[9px] text-[#5c6b82] underline-offset-2 transition-colors hover:text-white hover:underline"
        >
          Clear
        </button>
      )}
    </div>
  );

  const cards = display.map((match) => (
    <div
      key={match.id}
      className={horizontal ? "w-[200px] shrink-0" : undefined}
    >
      {horizontal && (
        <p className="mb-0.5 px-0.5 text-[8px] font-bold tracking-[0.12em] text-[#5c6b82] uppercase">
          {match.label}
        </p>
      )}
      <MatchCard
        match={match}
        result={results[match.id]}
        format="Bo5"
        placeholderA="WSCI"
        officialWinnerId={officialWinnerForMatch(match, koOfficial)}
        onPick={(winnerId) => onPick(match.id, winnerId)}
        onClear={() => onClear(match.id)}
      />
    </div>
  ));

  if (horizontal) {
    return (
      <div className="flex w-full flex-col gap-2">
        {toolbar}
        <div className="flex flex-wrap gap-2">{cards}</div>
      </div>
    );
  }

  return (
    <section className="round-enter flex h-full min-h-0 w-[200px] shrink-0 flex-col gap-1">
      <div className="shrink-0 overflow-hidden rounded-lg border border-[#2a3548] bg-[#0e141d] px-2 py-1.5">
        <h2 className="font-[family-name:var(--font-display)] text-[0.85rem] leading-none tracking-[0.06em] text-white uppercase">
          Knockout
        </h2>
        <p className="mt-1 text-[9px] leading-snug text-[#5c6b82]">
          WSCI #1–3 vs Swiss #16–14 · Bo5
        </p>
        <div className="mt-1.5">{toolbar}</div>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto overflow-x-hidden">
        {cards}
      </div>
    </section>
  );
}
