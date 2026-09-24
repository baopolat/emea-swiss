"use client";

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
        "overflow-hidden rounded-lg border border-[#2c3548] bg-[#121820] text-[13px] shadow-[0_1px_0_rgba(255,255,255,0.04)] transition duration-150",
        decided && "border-[#3a465c]",
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
      <div className="grid grid-cols-[1fr_auto_1fr] items-center bg-[#0e141d] px-2 py-0.5">
        <div className="h-px bg-[#2c3548]" />
        <span className="px-2 text-[9px] font-semibold tracking-[0.18em] text-[#5c6b82] uppercase">
          {format}
        </span>
        <div className="h-px bg-[#2c3548]" />
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
  const badgeText =
    team.short.length > 3 ? team.short.slice(0, 2) : team.short.slice(0, 3);

  return (
    <button
      type="button"
      title={`${team.name} (#${team.seed})`}
      onClick={onClick}
      className={cn(
        "grid w-full grid-cols-[28px_minmax(0,1fr)_auto_32px] items-center gap-2 px-2 py-2 text-left transition duration-150",
        selected && "bg-[#2ecc71] text-[#072012]",
        !selected && !lost && "bg-[#171e2a] text-white hover:bg-[#1e2736]",
        lost && "bg-[#10151d] text-[#6d7a8f]",
      )}
    >
      <span className="relative inline-flex size-7 shrink-0 items-center justify-center">
        <span
          className={cn(
            "flex size-7 items-center justify-center rounded-md text-[9px] font-black tracking-tight",
            selected ? "ring-1 ring-black/20" : "ring-1 ring-white/10",
            lost && "opacity-55 grayscale",
          )}
          style={{
            backgroundColor: selected ? "#0b1220" : team.color,
            color: isLight(team.color) && !selected ? "#0b1220" : "#fff",
          }}
        >
          {badgeText}
        </span>
        <span
          className={cn(
            "absolute -top-1 -left-1 flex size-3.5 items-center justify-center rounded-full text-[8px] font-bold",
            selected
              ? "bg-[#072012] text-[#2ecc71]"
              : "bg-[#0b1220] text-[#c5cedd] ring-1 ring-[#2c3548]",
          )}
        >
          {team.seed}
        </span>
      </span>

      <span className="min-w-0">
        <span className="block truncate text-[13px] font-bold tracking-wide uppercase">
          {team.short}
        </span>
        <span
          className={cn(
            "block truncate text-[10px] leading-tight",
            selected ? "text-[#072012]/70" : "text-[#7a879c]",
          )}
        >
          {team.name}
        </span>
      </span>

      <span
        className={cn(
          "text-[10px] font-semibold tabular-nums",
          selected ? "text-[#072012]/65" : "text-[#5c6b82]",
        )}
      >
        {progressive != null && progressive > 0 ? `+${progressive}` : ""}
      </span>

      <span
        className={cn(
          "text-center text-base font-black tabular-nums",
          selected ? "text-[#072012]" : "text-[#d7dee9]",
          lost && "text-[#5c6b82]",
        )}
      >
        {score}
      </span>
    </button>
  );
}

function isLight(hex: string): boolean {
  const h = hex.replace("#", "");
  if (h.length !== 6) return false;
  const r = Number.parseInt(h.slice(0, 2), 16);
  const g = Number.parseInt(h.slice(2, 4), 16);
  const b = Number.parseInt(h.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 160;
}
