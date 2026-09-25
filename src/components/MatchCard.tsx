"use client";

import { useState } from "react";
import { TEAM_BY_ID, type Team } from "@/data/teams";
import { cn } from "@/lib/utils";
import type { MatchResult, Matchup } from "@/lib/swiss";
import { seriesFormat } from "@/lib/brackets";

type MatchCardProps = {
  match: Matchup;
  result?: MatchResult;
  progressiveA?: number;
  progressiveB?: number;
  onPick: (winnerId: string) => void;
  onClear: () => void;
};

export function MatchCard({
  match,
  result,
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

  return (
    <div
      className={cn(
        "group/match overflow-hidden rounded-xl border bg-[#0e1522]/90 text-[13px] transition duration-200",
        decided
          ? "border-[#2ecc71]/25 shadow-[0_0_0_1px_rgba(61,214,140,0.08)]"
          : "match-live border-[#2a3448] shadow-[0_8px_24px_-16px_rgba(0,0,0,0.7)] hover:border-[#3d4d66]",
      )}
    >
      <TeamRow
        team={teamA}
        selected={winner === teamA.id}
        lost={!!winner && winner !== teamA.id}
        progressive={progressiveA}
        score={scoreFor(decided, winner === teamA.id, format)}
        onClick={() =>
          winner === teamA.id ? onClear() : onPick(teamA.id)
        }
      />
      <div className="grid grid-cols-[1fr_auto_1fr] items-center bg-[#0a101a] px-2.5 py-[3px]">
        <div className="h-px bg-gradient-to-r from-transparent to-[#2a3448]" />
        <span className="px-2.5 text-[9px] font-bold tracking-[0.2em] text-[#6b7a91] uppercase">
          {format}
        </span>
        <div className="h-px bg-gradient-to-l from-transparent to-[#2a3448]" />
      </div>
      <TeamRow
        team={teamB}
        selected={winner === teamB.id}
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
  lost,
  progressive,
  score,
  onClick,
}: {
  team: Team;
  selected: boolean;
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
        "grid w-full grid-cols-[30px_minmax(0,1fr)_auto_34px] items-center gap-2 px-2.5 py-2.5 text-left transition duration-150",
        selected &&
          "bg-[linear-gradient(90deg,#3dd68c_0%,#2ebd78_100%)] text-[#06140e]",
        !selected &&
          !lost &&
          "bg-[#141c2a] text-white hover:bg-[#1a2435] active:scale-[0.995]",
        lost && "bg-[#0c121c] text-[#65748a]",
      )}
    >
      <span className="relative inline-flex size-7 shrink-0 items-center justify-center">
        <TeamLogo team={team} lost={lost} selected={selected} />
        <span
          className={cn(
            "absolute -top-1 -left-1 flex size-3.5 items-center justify-center rounded-full text-[8px] font-black",
            selected
              ? "bg-[#06140e] text-[#3dd68c]"
              : "bg-[#070b14] text-[#c5cedd] ring-1 ring-[#2a3448]",
          )}
        >
          {team.seed}
        </span>
      </span>

      <span className="min-w-0">
        <span className="block truncate text-[13px] font-extrabold tracking-wide uppercase">
          {team.short}
        </span>
        <span
          className={cn(
            "block truncate text-[10px] leading-tight",
            selected ? "text-[#06140e]/65" : "text-[#7a879c]",
          )}
        >
          {team.name}
        </span>
      </span>

      <span
        className={cn(
          "text-[10px] font-semibold tabular-nums",
          selected ? "text-[#06140e]/60" : "text-[#5c6b82]",
        )}
      >
        {progressive != null && progressive > 0 ? `+${progressive}` : ""}
      </span>

      <span
        className={cn(
          "text-center font-[family-name:var(--font-display)] text-xl leading-none tracking-wide tabular-nums",
          selected ? "text-[#06140e]" : "text-[#e8edf5]",
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
          "flex items-center justify-center rounded-md text-[9px] font-black tracking-tight ring-1 ring-white/10",
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
        "rounded-md bg-[#070b14] object-contain p-0.5 ring-1 ring-white/10 transition",
        lost && "opacity-45 grayscale",
        selected && "ring-black/20",
      )}
      style={{ width: px, height: px }}
    />
  );
}
