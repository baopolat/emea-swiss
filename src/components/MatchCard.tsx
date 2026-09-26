"use client";

import { useState } from "react";
import { TEAM_BY_ID, type Team } from "@/data/teams";
import { cn } from "@/lib/utils";
import type { MatchResult, Matchup } from "@/lib/swiss";
import { seriesFormat } from "@/lib/brackets";

type MatchCardProps = {
  match: Matchup;
  result?: MatchResult;
  /** Leaguepedia official winner for this pair, if known. */
  officialWinnerId?: string;
  progressiveA?: number;
  progressiveB?: number;
  onPick: (winnerId: string) => void;
  onClear: () => void;
};

export function MatchCard({
  match,
  result,
  officialWinnerId,
  progressiveA,
  progressiveB,
  onPick,
  onClear,
}: MatchCardProps) {
  const teamA = TEAM_BY_ID[match.teamA];
  const teamB = TEAM_BY_ID[match.teamB];
  const winner = result?.winnerId;
  const format = seriesFormat(match.pool);
  const decided = !!winner;
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
        !decided &&
          "match-live border-[#2a3448] hover:border-[#3d4d66]",
      )}
    >
      <TeamRow
        team={teamA}
        selected={winner === teamA.id}
        diverged={diverged && winner === teamA.id}
        lost={!!winner && winner !== teamA.id}
        progressive={progressiveA}
        score={scoreFor(decided, winner === teamA.id, format)}
        onClick={() =>
          winner === teamA.id ? onClear() : onPick(teamA.id)
        }
      />
      <div className="flex items-center justify-center bg-[#0a101a] py-px">
        <span className="text-[7px] font-bold tracking-[0.16em] text-[#5c6b82] uppercase">
          {format}
        </span>
      </div>
      <TeamRow
        team={teamB}
        selected={winner === teamB.id}
        diverged={diverged && winner === teamB.id}
        lost={!!winner && winner !== teamB.id}
        progressive={progressiveB}
        score={scoreFor(decided, winner === teamB.id, format)}
        onClick={() =>
          winner === teamB.id ? onClear() : onPick(teamB.id)
        }
      />
    </div>
  );
}

function scoreFor(
  decided: boolean,
  won: boolean,
  format: "Bo1" | "Bo3",
): string {
  if (!decided) return "–";
  if (!won) return "0";
  return format === "Bo3" ? "2" : "1";
}

function TeamRow({
  team,
  selected,
  diverged,
  lost,
  progressive,
  score,
  onClick,
}: {
  team: Team;
  selected: boolean;
  diverged: boolean;
  lost: boolean;
  progressive?: number;
  score: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={`${team.name} (#${team.seed}) · click to ${selected ? "clear" : "pick winner"}`}
      onClick={onClick}
      className={cn(
        "grid w-full grid-cols-[22px_minmax(0,1fr)_auto_18px] items-center gap-1 px-1.5 py-[3px] text-left transition duration-100",
        selected &&
          !diverged &&
          "bg-[linear-gradient(90deg,#3dd68c_0%,#2ebd78_100%)] text-[#06140e]",
        selected &&
          diverged &&
          "bg-[linear-gradient(90deg,#e0b85c_0%,#d4a84b_100%)] text-[#1a1206]",
        !selected &&
          !lost &&
          "bg-[#141c2a] text-white hover:bg-[#1a2435] active:scale-[0.995]",
        lost && "bg-[#0c121c] text-[#65748a]",
      )}
    >
      <span className="relative inline-flex size-5 shrink-0 items-center justify-center">
        <TeamLogo team={team} lost={lost} selected={selected} size={18} />
        <span
          className={cn(
            "absolute -top-0.5 -left-0.5 flex size-2.5 items-center justify-center rounded-full text-[6px] font-black leading-none",
            selected && !diverged && "bg-[#06140e] text-[#3dd68c]",
            selected && diverged && "bg-[#1a1206] text-[#e0b85c]",
            !selected && "bg-[#070b14] text-[#c5cedd] ring-1 ring-[#2a3448]",
          )}
        >
          {team.seed}
        </span>
      </span>

      <span className="min-w-0 truncate text-[11px] font-extrabold tracking-wide uppercase">
        {team.short}
      </span>

      <span
        className={cn(
          "text-[8px] font-semibold tabular-nums",
          selected && !diverged && "text-[#06140e]/55",
          selected && diverged && "text-[#1a1206]/55",
          !selected && "text-[#5c6b82]",
        )}
      >
        {progressive != null && progressive > 0 ? `+${progressive}` : ""}
      </span>

      <span
        className={cn(
          "text-center font-[family-name:var(--font-display)] text-sm leading-none tabular-nums",
          selected && !diverged && "text-[#06140e]",
          selected && diverged && "text-[#1a1206]",
          !selected && "text-[#e8edf5]",
          lost && "text-[#4f5d73]",
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
