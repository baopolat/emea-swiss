"use client";

import { TEAM_BY_ID } from "@/data/teams";
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
        "overflow-hidden rounded-md border border-[#2a3344] bg-[#151b27] text-[13px] shadow-sm transition",
        decided && "border-[#3d4a5c]",
      )}
    >
      <TeamRow
        seed={teamA.seed}
        name={teamA.short}
        fullName={teamA.name}
        selected={winner === teamA.id}
        lost={!!winner && winner !== teamA.id}
        progressive={progressiveA}
        score={
          decided
            ? winner === teamA.id
              ? format === "Bo3"
                ? "2"
                : "1"
              : "0"
            : "–"
        }
        onClick={() =>
          winner === teamA.id ? onClear() : onPick(teamA.id)
        }
      />
      <div className="h-px bg-[#2a3344]" />
      <TeamRow
        seed={teamB.seed}
        name={teamB.short}
        fullName={teamB.name}
        selected={winner === teamB.id}
        lost={!!winner && winner !== teamB.id}
        progressive={progressiveB}
        score={
          decided
            ? winner === teamB.id
              ? format === "Bo3"
                ? "2"
                : "1"
              : "0"
            : "–"
        }
        onClick={() =>
          winner === teamB.id ? onClear() : onPick(teamB.id)
        }
      />
    </div>
  );
}

function TeamRow({
  seed,
  name,
  fullName,
  selected,
  lost,
  progressive,
  score,
  onClick,
}: {
  seed: number;
  name: string;
  fullName: string;
  selected: boolean;
  lost: boolean;
  progressive?: number;
  score: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={fullName}
      onClick={onClick}
      className={cn(
        "grid w-full grid-cols-[18px_1fr_auto_28px] items-center gap-1.5 px-2 py-1.5 text-left transition",
        selected && "bg-[#2ecc71] text-[#0b1220]",
        !selected && !lost && "bg-[#1a2230] text-white hover:bg-[#222b3c]",
        lost && "bg-[#121823] text-[#7a8699]",
      )}
    >
      <span
        className={cn(
          "text-[10px] font-semibold tabular-nums",
          selected ? "text-[#0b1220]/70" : "text-[#8b97ab]",
        )}
      >
        {seed}
      </span>
      <span className="truncate font-semibold tracking-wide uppercase">
        {name}
      </span>
      <span
        className={cn(
          "text-[10px] tabular-nums",
          selected ? "text-[#0b1220]/70" : "text-[#6b778c]",
        )}
      >
        {progressive != null && progressive > 0 ? `+${progressive}` : ""}
      </span>
      <span
        className={cn(
          "text-center text-sm font-bold tabular-nums",
          selected ? "text-[#0b1220]" : "text-[#c5cedd]",
        )}
      >
        {score}
      </span>
    </button>
  );
}
