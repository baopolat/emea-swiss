"use client";

import { TeamLogo } from "@/components/MatchCard";
import { TEAM_BY_ID } from "@/data/teams";
import { useCoarsePointer, useLongPressMove } from "@/hooks/usePointerMove";
import {
  writeDragPayload,
  readDragPayload,
  type PoolDragPayload,
  type Ro16DragPayload,
  type SwapDragPayload,
} from "@/lib/dragSwap";
import { poolForRo16Slot } from "@/lib/playoffs";
import type { MatchResult } from "@/lib/swiss";
import { cn } from "@/lib/utils";

type BracketMatchProps = {
  matchId: string;
  label: string;
  teamAId: string;
  teamBId: string;
  result?: MatchResult;
  officialWinnerId?: string;
  showPools?: boolean;
  dragging?: SwapDragPayload | null;
  dropHighlightA?: boolean;
  dropHighlightB?: boolean;
  onRo16DragStart?: (side: "a" | "b") => void;
  onRo16DragEnd?: () => void;
  onRo16Drop?: (
    side: "a" | "b",
    payload: Ro16DragPayload | PoolDragPayload,
  ) => void;
  onPick: (winnerId: string) => void;
  onClear: () => void;
};

export function BracketMatch({
  matchId,
  label,
  teamAId,
  teamBId,
  result,
  officialWinnerId,
  showPools,
  dragging,
  dropHighlightA,
  dropHighlightB,
  onRo16DragStart,
  onRo16DragEnd,
  onRo16Drop,
  onPick,
  onClear,
}: BracketMatchProps) {
  const coarse = useCoarsePointer();
  const teamA = teamAId ? TEAM_BY_ID[teamAId] : undefined;
  const teamB = teamBId ? TEAM_BY_ID[teamBId] : undefined;
  const winner = result?.winnerId;
  const bothReady = !!teamA && !!teamB;
  const decided = !!winner && bothReady;
  const diverged =
    decided && !!officialWinnerId && winner !== officialWinnerId;

  const poolA =
    showPools && matchId.startsWith("ro16")
      ? poolForRo16Slot(matchId, "a")
      : null;
  const poolB =
    showPools && matchId.startsWith("ro16")
      ? poolForRo16Slot(matchId, "b")
      : null;

  const ro16Enabled = !!showPools && !!onRo16DragStart;
  const moveActive =
    dragging?.kind === "pool" || dragging?.kind === "ro16";

  function handleDrop(side: "a" | "b", e: React.DragEvent) {
    e.preventDefault();
    if (!onRo16Drop) return;
    const payload = readDragPayload(e);
    if (payload?.kind === "ro16" || payload?.kind === "pool") {
      onRo16Drop(side, payload);
    }
  }

  function handleTapPlace(side: "a" | "b") {
    if (!onRo16Drop || !dragging) return;
    if (dragging.kind === "pool" || dragging.kind === "ro16") {
      onRo16Drop(side, dragging);
    }
  }

  return (
    <div
      className={cn(
        "w-[168px] overflow-hidden rounded-md border bg-[#0e1522]/95 text-[11px]",
        decided && !diverged && "border-[#2ecc71]/30",
        diverged && "border-[#d4a84b]/40",
        !decided && "border-[#2a3448]",
        (dropHighlightA || dropHighlightB) && "border-[#60a5fa]/60",
      )}
    >
      <div className="flex items-center justify-between border-b border-[#1a2230] bg-[#0a101a] px-1.5 py-0.5">
        <span className="text-[8px] font-bold tracking-[0.12em] text-[#5c6b82] uppercase">
          {label}
        </span>
        <span className="text-[7px] font-bold tracking-wide text-[#5c6b82] uppercase">
          Bo5
        </span>
      </div>
      <BracketRow
        team={teamA}
        placeholder={poolA != null ? `Pool ${poolA}` : "TBD"}
        selected={!!teamA && winner === teamA.id}
        dropHighlight={!!dropHighlightA}
        isDraggingSource={
          dragging?.kind === "ro16" &&
          dragging.slotKey === `${matchId}:a`
        }
        diverged={!!teamA && diverged && winner === teamA.id}
        lost={!!teamA && !!winner && winner !== teamA.id}
        canDrag={ro16Enabled && !!teamA && poolA != null && !coarse}
        longPressMove={ro16Enabled && !!teamA && poolA != null && coarse}
        moveActive={moveActive}
        onDragStart={(e) => {
          if (!teamA || poolA == null) return;
          writeDragPayload(e, {
            kind: "ro16",
            slotKey: `${matchId}:a`,
            pool: poolA,
          });
          onRo16DragStart?.("a");
        }}
        onDragEnd={() => onRo16DragEnd?.()}
        onDragOver={(e) => {
          if (!dropHighlightA) return;
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";
        }}
        onDrop={(e) => handleDrop("a", e)}
        onLongPress={() => onRo16DragStart?.("a")}
        onTapWhenMoving={
          dropHighlightA
            ? () => handleTapPlace("a")
            : dragging?.kind === "ro16" &&
                dragging.slotKey === `${matchId}:a`
              ? () => onRo16DragEnd?.()
              : undefined
        }
        onClick={() => {
          if (!teamA || !bothReady) return;
          winner === teamA.id ? onClear() : onPick(teamA.id);
        }}
      />
      <BracketRow
        team={teamB}
        placeholder={poolB != null ? `Pool ${poolB}` : "TBD"}
        selected={!!teamB && winner === teamB.id}
        dropHighlight={!!dropHighlightB}
        isDraggingSource={
          dragging?.kind === "ro16" &&
          dragging.slotKey === `${matchId}:b`
        }
        diverged={!!teamB && diverged && winner === teamB.id}
        lost={!!teamB && !!winner && winner !== teamB.id}
        canDrag={ro16Enabled && !!teamB && poolB != null && !coarse}
        longPressMove={ro16Enabled && !!teamB && poolB != null && coarse}
        moveActive={moveActive}
        onDragStart={(e) => {
          if (!teamB || poolB == null) return;
          writeDragPayload(e, {
            kind: "ro16",
            slotKey: `${matchId}:b`,
            pool: poolB,
          });
          onRo16DragStart?.("b");
        }}
        onDragEnd={() => onRo16DragEnd?.()}
        onDragOver={(e) => {
          if (!dropHighlightB) return;
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";
        }}
        onDrop={(e) => handleDrop("b", e)}
        onLongPress={() => onRo16DragStart?.("b")}
        onTapWhenMoving={
          dropHighlightB
            ? () => handleTapPlace("b")
            : dragging?.kind === "ro16" &&
                dragging.slotKey === `${matchId}:b`
              ? () => onRo16DragEnd?.()
              : undefined
        }
        onClick={() => {
          if (!teamB || !bothReady) return;
          winner === teamB.id ? onClear() : onPick(teamB.id);
        }}
      />
    </div>
  );
}

function BracketRow({
  team,
  placeholder,
  selected,
  dropHighlight,
  isDraggingSource,
  diverged,
  lost,
  canDrag,
  longPressMove,
  moveActive,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  onLongPress,
  onTapWhenMoving,
  onClick,
}: {
  team?: (typeof TEAM_BY_ID)[string];
  placeholder: string;
  selected: boolean;
  dropHighlight?: boolean;
  isDraggingSource?: boolean;
  diverged: boolean;
  lost: boolean;
  canDrag?: boolean;
  longPressMove?: boolean;
  moveActive?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: () => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
  onLongPress?: () => void;
  onTapWhenMoving?: () => void;
  onClick: () => void;
}) {
  const longPress = useLongPressMove({
    enabled: !!longPressMove || !!onTapWhenMoving || !!moveActive,
    onLongPress: () => onLongPress?.(),
    onClick: () => {
      if (onTapWhenMoving) {
        onTapWhenMoving();
        return;
      }
      if (moveActive) return;
      onClick();
    },
  });

  if (!team) {
    return (
      <div
        onDragOver={onDragOver}
        onDrop={onDrop}
        onClick={() => onTapWhenMoving?.()}
        className={cn(
          "flex w-full items-center gap-1.5 px-1.5 py-1.5 text-left touch-manipulation",
          dropHighlight
            ? "bg-[#1e3a5f] text-[#93c5fd] ring-1 ring-inset ring-[#60a5fa]/70"
            : "bg-[#0c121c] text-[#5c6b82]",
        )}
      >
        <span className="size-4 shrink-0 rounded border border-dashed border-[#2a3448]" />
        <span className="truncate text-[10px] font-semibold uppercase">
          {placeholder}
        </span>
      </div>
    );
  }

  return (
    <button
      type="button"
      draggable={!!canDrag}
      title={`${team.name} · ${canDrag ? "drag to swap · " : ""}${longPressMove ? "long-press to move · " : ""}click to ${selected ? "clear" : "pick"}`}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDrop={onDrop}
      {...(longPressMove || onTapWhenMoving || moveActive
        ? longPress
        : { onClick })}
      className={cn(
        "flex w-full items-center gap-1.5 px-1.5 py-1.5 text-left transition touch-manipulation",
        canDrag && "cursor-grab active:cursor-grabbing",
        isDraggingSource && "opacity-40",
        dropHighlight &&
          "bg-[#1e3a5f] text-[#93c5fd] ring-1 ring-inset ring-[#60a5fa]/70",
        selected &&
          !diverged &&
          !dropHighlight &&
          "bg-[linear-gradient(90deg,#3dd68c_0%,#2ebd78_100%)] text-[#06140e]",
        selected &&
          diverged &&
          !dropHighlight &&
          "bg-[linear-gradient(90deg,#e0b85c_0%,#d4a84b_100%)] text-[#1a1206]",
        !selected &&
          !lost &&
          !dropHighlight &&
          "bg-[#141c2a] text-white hover:bg-[#1a2435]",
        lost && !dropHighlight && "bg-[#0c121c] text-[#65748a]",
      )}
    >
      <TeamLogo team={team} lost={lost} selected={selected} size={16} />
      <span className="min-w-0 truncate text-[11px] font-extrabold tracking-wide uppercase">
        {team.short}
      </span>
      {selected && !dropHighlight && (
        <span className="ml-auto text-[10px] font-bold tabular-nums">3</span>
      )}
      {lost && !dropHighlight && (
        <span className="ml-auto text-[10px] font-bold tabular-nums opacity-60">
          0
        </span>
      )}
    </button>
  );
}
