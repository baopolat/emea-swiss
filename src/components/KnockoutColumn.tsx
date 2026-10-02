"use client";

import { MatchCard } from "@/components/MatchCard";
import type { OfficialGame } from "@/lib/official";
import { officialWinnerForMatch } from "@/lib/official";
import {
  writeDragPayload,
  readDragPayload,
  type KoDragPayload,
  type SwapDragPayload,
} from "@/lib/dragSwap";
import { type KoPairing } from "@/lib/playoffs";
import type { MatchResult } from "@/lib/swiss";
import { useCoarsePointer } from "@/hooks/usePointerMove";

type KnockoutColumnProps = {
  pairings: KoPairing[];
  results: Record<string, MatchResult>;
  officialGames: OfficialGame[];
  dragging: SwapDragPayload | null;
  onDragStart: (matchId: string) => void;
  onDragEnd: () => void;
  onDropInvite: (targetMatchId: string, payload: KoDragPayload) => void;
  onRandomize: () => void;
  onPick: (matchId: string, winnerId: string) => void;
  onClear: (matchId: string) => void;
  onClearResults: () => void;
  horizontal?: boolean;
};

export function KnockoutColumn({
  pairings,
  results,
  officialGames,
  dragging,
  onDragStart,
  onDragEnd,
  onDropInvite,
  onRandomize,
  onPick,
  onClear,
  onClearResults,
  horizontal = false,
}: KnockoutColumnProps) {
  const coarse = useCoarsePointer();
  const decided = pairings.filter((p) => results[p.matchId]).length;
  const invitesSet = pairings.every((p) => p.inviteTeamId);
  const complete = pairings.length === 3 && decided === 3;
  const koDragging = dragging?.kind === "ko" ? dragging.matchId : null;

  const display = pairings.map((p) => ({
    id: p.matchId,
    label: p.label,
    teamA: p.swissTeamId,
    teamB: p.inviteTeamId ?? "",
    pool: "ko",
  }));

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
      <button
        type="button"
        onClick={onRandomize}
        className="rounded border border-[#2a3548] bg-[#121820] px-1.5 py-0.5 text-[9px] font-semibold text-[#c5cedd] transition-colors hover:border-[#3d4d66] hover:text-white"
      >
        Randomize
      </button>
      {decided > 0 && (
        <button
          type="button"
          onClick={onClearResults}
          className="rounded px-1 py-0.5 text-[9px] text-[#5c6b82] underline-offset-2 transition-colors hover:text-white hover:underline"
        >
          Clear
        </button>
      )}
      <span className="text-[8px] text-[#5c6b82]">
        {coarse
          ? "Long-press invite to move · tap another seated invite to swap"
          : "Drag invites between seated matches to swap"}
      </span>
      {!invitesSet && (
        <span className="text-[8px] text-[#d4a84b]">
          · Randomize to seat invites
        </span>
      )}
    </div>
  );

  const cards = display.map((match) => {
    const isSource = koDragging === match.id;
    // Only swap onto matches that already have an invite seated
    const isValidTarget =
      !!koDragging &&
      koDragging !== match.id &&
      !!match.teamB;
    return (
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
          placeholderB="Invite"
          officialWinnerId={officialWinnerForMatch(match, officialGames)}
          dragB={{
            canDrag: !!match.teamB && !coarse,
            isDragging: isSource,
            dropHighlight: isValidTarget,
            onDragStart: (e) => {
              if (!match.teamB) return;
              writeDragPayload(e, { kind: "ko", matchId: match.id });
              onDragStart(match.id);
            },
            onDragEnd,
            onDragOver: (e) => {
              if (!isValidTarget) return;
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
            },
            onDrop: (e) => {
              e.preventDefault();
              if (!match.teamB) return;
              const payload = readDragPayload(e);
              if (payload?.kind === "ko") onDropInvite(match.id, payload);
            },
            onLongPress: match.teamB
              ? () => onDragStart(match.id)
              : undefined,
            onTapWhenMoving: isValidTarget
              ? () => {
                  if (!koDragging) return;
                  onDropInvite(match.id, {
                    kind: "ko",
                    matchId: koDragging,
                  });
                }
              : isSource
                ? () => onDragEnd()
                : undefined,
            suppressClickForMove: !!koDragging,
          }}
          onPick={(winnerId) => onPick(match.id, winnerId)}
          onClear={() => onClear(match.id)}
        />
      </div>
    );
  });

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
          Seeds 14–16 vs WSCI · Bo5
        </p>
        <div className="mt-1.5">{toolbar}</div>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto overflow-x-hidden">
        {cards}
      </div>
    </section>
  );
}
