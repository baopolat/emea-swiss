"use client";

import { useState } from "react";
import { TEAM_BY_ID, type Team } from "@/data/teams";
import { useLongPressMove } from "@/hooks/usePointerMove";
import { cn } from "@/lib/utils";
import type { MatchResult, Matchup } from "@/lib/swiss";
import { seriesFormat } from "@/lib/brackets";

export type SeriesFormat = "Bo1" | "Bo3" | "Bo5";

export type SideDrag = {
  canDrag?: boolean;
  dropHighlight?: boolean;
  isDragging?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: () => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
  /** Mobile: long-press to pick up for move. */
  onLongPress?: () => void;
  /** Mobile: tap this row while a move is active. */
  onTapWhenMoving?: () => void;
  /** When true, short click does not pick a winner. */
  suppressClickForMove?: boolean;
};

type MatchCardProps = {
  match: Matchup;
  result?: MatchResult;
  officialWinnerId?: string;
  progressiveA?: number;
  progressiveB?: number;
  format?: SeriesFormat;
  placeholderA?: string;
  placeholderB?: string;
  dragA?: SideDrag;
  dragB?: SideDrag;
  onPick: (winnerId: string) => void;
  onClear: () => void;
};

export function MatchCard({
  match,
  result,
  officialWinnerId,
  progressiveA,
  progressiveB,
  format: formatProp,
  placeholderA,
  placeholderB,
  dragA,
  dragB,
  onPick,
  onClear,
}: MatchCardProps) {
  const teamA = match.teamA ? TEAM_BY_ID[match.teamA] : undefined;
  const teamB = match.teamB ? TEAM_BY_ID[match.teamB] : undefined;
  const winner = result?.winnerId;
  const format: SeriesFormat =
    formatProp ?? (seriesFormat(match.pool) as SeriesFormat);
  const bothReady = !!teamA && !!teamB;
  const decided = !!winner && bothReady;
  const diverged =
    decided && !!officialWinnerId && winner !== officialWinnerId;

  return (
    <div
      className={cn(
        "group/match overflow-hidden rounded-md border bg-[#0e1522]/90 text-[11px] transition duration-150",
        decided &&
          !diverged &&
          "border-[#2ecc71]/25 shadow-[0_0_0_1px_rgba(61,214,140,0.06)]",
        diverged &&
          "border-[#d4a84b]/35 shadow-[0_0_0_1px_rgba(212,168,75,0.1)]",
        !decided && "match-live border-[#2a3448] hover:border-[#3d4d66]",
        (dragA?.dropHighlight || dragB?.dropHighlight) &&
          "border-[#60a5fa]/55",
      )}
    >
      <TeamRow
        team={teamA}
        placeholder={placeholderA}
        selected={!!teamA && winner === teamA.id}
        diverged={!!teamA && diverged && winner === teamA.id}
        lost={!!teamA && !!winner && winner !== teamA.id}
        progressive={progressiveA}
        score={scoreFor(decided, !!teamA && winner === teamA.id, format)}
        drag={dragA}
        onClick={() => {
          if (!teamA || !bothReady) return;
          winner === teamA.id ? onClear() : onPick(teamA.id);
        }}
      />
      <div className="flex items-center justify-center bg-[#0a101a] py-px">
        <span className="text-[7px] font-bold tracking-[0.16em] text-[#5c6b82] uppercase">
          {format}
        </span>
      </div>
      <TeamRow
        team={teamB}
        placeholder={placeholderB}
        selected={!!teamB && winner === teamB.id}
        diverged={!!teamB && diverged && winner === teamB.id}
        lost={!!teamB && !!winner && winner !== teamB.id}
        progressive={progressiveB}
        score={scoreFor(decided, !!teamB && winner === teamB.id, format)}
        drag={dragB}
        onClick={() => {
          if (!teamB || !bothReady) return;
          winner === teamB.id ? onClear() : onPick(teamB.id);
        }}
      />
    </div>
  );
}

function scoreFor(
  decided: boolean,
  won: boolean,
  format: SeriesFormat,
): string {
  if (!decided) return "–";
  if (!won) return "0";
  if (format === "Bo5") return "3";
  if (format === "Bo3") return "2";
  return "1";
}

function TeamRow({
  team,
  placeholder,
  selected,
  diverged,
  lost,
  progressive,
  score,
  drag,
  onClick,
}: {
  team?: Team;
  placeholder?: string;
  selected: boolean;
  diverged: boolean;
  lost: boolean;
  progressive?: number;
  score: string;
  drag?: SideDrag;
  onClick: () => void;
}) {
  const drop = !!drag?.dropHighlight;
  const dragging = !!drag?.isDragging;
  const longPress = useLongPressMove({
    enabled: !!drag?.onLongPress,
    onLongPress: () => drag?.onLongPress?.(),
    onClick: () => {
      if (drag?.onTapWhenMoving) {
        drag.onTapWhenMoving();
        return;
      }
      if (drag?.suppressClickForMove) return;
      onClick();
    },
  });

  if (!team) {
    return (
      <div
        onDragOver={drag?.onDragOver}
        onDrop={drag?.onDrop}
        onClick={() => drag?.onTapWhenMoving?.()}
        className={cn(
          "grid w-full grid-cols-[22px_minmax(0,1fr)_auto_18px] items-center gap-1 px-1.5 py-[3px] text-left",
          drop
            ? "bg-[#1e3a5f] text-[#93c5fd] ring-1 ring-inset ring-[#60a5fa]/70"
            : "bg-[#0c121c] text-[#5c6b82]",
        )}
      >
        <span className="size-5 shrink-0 rounded border border-dashed border-[#2a3448]" />
        <span className="min-w-0 truncate text-[10px] font-semibold tracking-wide uppercase">
          {placeholder ?? "TBD"}
        </span>
        <span />
        <span className="text-center text-[#4f5d73]">–</span>
      </div>
    );
  }

  return (
    <button
      type="button"
      draggable={!!drag?.canDrag}
      title={`${team.name} (#${team.seed}) · ${drag?.canDrag ? "drag to swap · " : ""}${drag?.onLongPress ? "long-press to move · " : ""}click to ${selected ? "clear" : "pick winner"}`}
      onDragStart={drag?.onDragStart}
      onDragEnd={drag?.onDragEnd}
      onDragOver={drag?.onDragOver}
      onDrop={drag?.onDrop}
      {...(drag?.onLongPress || drag?.onTapWhenMoving || drag?.suppressClickForMove
        ? longPress
        : { onClick })}
      className={cn(
        "grid w-full grid-cols-[22px_minmax(0,1fr)_auto_18px] items-center gap-1 px-1.5 py-[3px] text-left transition duration-100 touch-manipulation",
        drag?.canDrag && "cursor-grab active:cursor-grabbing",
        dragging && "opacity-40",
        drop &&
          "bg-[#1e3a5f] text-[#93c5fd] ring-1 ring-inset ring-[#60a5fa]/70",
        selected &&
          !diverged &&
          !drop &&
          "bg-[linear-gradient(90deg,#3dd68c_0%,#2ebd78_100%)] text-[#06140e]",
        selected &&
          diverged &&
          !drop &&
          "bg-[linear-gradient(90deg,#e0b85c_0%,#d4a84b_100%)] text-[#1a1206]",
        !selected &&
          !lost &&
          !drop &&
          "bg-[#141c2a] text-white hover:bg-[#1a2435] active:scale-[0.995]",
        lost && !drop && "bg-[#0c121c] text-[#65748a]",
      )}
    >
      <span className="relative inline-flex size-5 shrink-0 items-center justify-center">
        <TeamLogo team={team} lost={lost} selected={selected} size={18} />
        <span
          className={cn(
            "absolute -top-0.5 -left-0.5 flex size-2.5 items-center justify-center rounded-full text-[6px] font-black leading-none",
            selected && !diverged && !drop && "bg-[#06140e] text-[#3dd68c]",
            selected && diverged && !drop && "bg-[#1a1206] text-[#e0b85c]",
            (!selected || drop) &&
              "bg-[#070b14] text-[#c5cedd] ring-1 ring-[#2a3448]",
          )}
        >
          {team.seed > 100 ? "★" : team.seed}
        </span>
      </span>

      <span className="min-w-0 truncate text-[11px] font-extrabold tracking-wide uppercase">
        {team.short}
      </span>

      <span
        className={cn(
          "text-[8px] font-semibold tabular-nums",
          selected && !diverged && !drop && "text-[#06140e]/55",
          selected && diverged && !drop && "text-[#1a1206]/55",
          (!selected || drop) && "text-[#5c6b82]",
        )}
      >
        {progressive != null && progressive > 0 ? `+${progressive}` : ""}
      </span>

      <span
        className={cn(
          "text-center font-[family-name:var(--font-display)] text-sm leading-none tabular-nums",
          selected && !diverged && !drop && "text-[#06140e]",
          selected && diverged && !drop && "text-[#1a1206]",
          !selected && !drop && "text-[#e8edf5]",
          lost && !drop && "text-[#4f5d73]",
        )}
      >
        {score}
      </span>
    </button>
  );
}

export function TeamLogo({
  team,
  lost = false,
  selected = false,
  size = 28,
}: {
  team: Team;
  lost?: boolean;
  selected?: boolean;
  size?: number;
}) {
  const [failed, setFailed] = useState(false);
  const px = `${size}px`;

  if (failed) {
    const badgeText =
      team.short.length > 3 ? team.short.slice(0, 2) : team.short.slice(0, 3);
    return (
      <span
        className={cn(
          "flex items-center justify-center rounded text-[7px] font-black tracking-tight ring-1 ring-white/10",
          lost && "opacity-55 grayscale",
        )}
        style={{
          width: px,
          height: px,
          backgroundColor: selected ? "#06140e" : team.color,
          color: "#fff",
        }}
      >
        {badgeText}
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={team.logo}
      alt=""
      width={size}
      height={size}
      onError={() => setFailed(true)}
      className={cn(
        "rounded bg-[#070b14] object-contain p-px ring-1 ring-white/10 transition",
        lost && "opacity-45 grayscale",
        selected && "ring-black/20",
      )}
      style={{ width: px, height: px }}
    />
  );
}
