"use client";

import { TEAM_BY_ID } from "@/data/teams";
import { cn } from "@/lib/utils";
import type { MatchResult, Matchup } from "@/lib/swiss";

type MatchCardProps = {
  match: Matchup;
  result?: MatchResult;
  onPick: (winnerId: string) => void;
  onClear: () => void;
};

export function MatchCard({ match, result, onPick, onClear }: MatchCardProps) {
  const teamA = TEAM_BY_ID[match.teamA];
  const teamB = TEAM_BY_ID[match.teamB];
  const winner = result?.winnerId;

  return (
    <div
      className={cn(
        "match-card group relative grid grid-cols-[1fr_auto_1fr] items-stretch gap-1 rounded-md border border-white/10 bg-[color-mix(in_oklab,var(--ink)_88%,black)] p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition duration-200",
        winner && "border-[var(--gold)]/35",
      )}
    >
      <TeamButton
        seed={teamA.seed}
        name={teamA.name}
        short={teamA.short}
        selected={winner === teamA.id}
        lost={!!winner && winner !== teamA.id}
        align="left"
        onClick={() =>
          winner === teamA.id ? onClear() : onPick(teamA.id)
        }
      />
      <div className="flex flex-col items-center justify-center px-1 text-[10px] font-medium tracking-[0.18em] text-[var(--mist)] uppercase">
        <span>VS</span>
        <span className="mt-0.5 text-[9px] tracking-normal text-white/35 normal-case">
          {match.label}
        </span>
      </div>
      <TeamButton
        seed={teamB.seed}
        name={teamB.name}
        short={teamB.short}
        selected={winner === teamB.id}
        lost={!!winner && winner !== teamB.id}
        align="right"
        onClick={() =>
          winner === teamB.id ? onClear() : onPick(teamB.id)
        }
      />
    </div>
  );
}

function TeamButton({
  seed,
  name,
  short,
  selected,
  lost,
  align,
  onClick,
}: {
  seed: number;
  name: string;
  short: string;
  selected: boolean;
  lost: boolean;
  align: "left" | "right";
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex min-h-14 flex-col justify-center rounded-sm px-2.5 py-2 text-left transition duration-150",
        align === "right" && "items-end text-right",
        selected &&
          "bg-[var(--gold)] text-[var(--ink)] shadow-[0_0_0_1px_rgba(232,197,71,0.45)]",
        !selected && !lost && "hover:bg-white/6 text-white",
        lost && "bg-transparent text-white/35 line-through decoration-white/25",
      )}
    >
      <span
        className={cn(
          "font-[family-name:var(--font-display)] text-[11px] tracking-[0.14em] uppercase",
          selected ? "text-[var(--ink)]/70" : "text-[var(--mist)]",
        )}
      >
        #{seed}
      </span>
      <span className="font-[family-name:var(--font-display)] text-sm leading-tight tracking-wide sm:hidden">
        {short}
      </span>
      <span className="hidden font-[family-name:var(--font-display)] text-sm leading-tight tracking-wide sm:inline">
        {name}
      </span>
    </button>
  );
}
