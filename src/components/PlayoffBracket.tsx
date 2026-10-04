"use client";

import { BracketMatch } from "@/components/BracketMatch";
import { TeamLogo } from "@/components/MatchCard";
import { TEAM_BY_ID } from "@/data/teams";
import type { OfficialGame } from "@/lib/official";
import { officialWinnerFor, playoffGames } from "@/lib/official";
import {
  FINAL_MATCHES,
  QF_MATCHES,
  RO16_MATCHES,
  SF_MATCHES,
  bracketMatchups,
  poolForRo16Slot,
  slotKey,
  type PostSwissState,
  type Ro16Assignments,
} from "@/lib/playoffs";
import type { PoolDragPayload, Ro16DragPayload, SwapDragPayload } from "@/lib/dragSwap";
import { cn } from "@/lib/utils";

type PlayoffBracketProps = {
  post: PostSwissState;
  officialGames: OfficialGame[];
  dragging: SwapDragPayload | null;
  onRo16DragStart: (slot: string) => void;
  onRo16DragEnd: () => void;
  onRo16Drop: (
    targetKey: string,
    payload: Ro16DragPayload | PoolDragPayload,
  ) => void;
  onRo16Pick: (matchId: string, winnerId: string) => void;
  onRo16Clear: (matchId: string) => void;
  onRo16ClearResults: () => void;
  onQfPick: (matchId: string, winnerId: string) => void;
  onQfClear: (matchId: string) => void;
  onQfClearResults: () => void;
  onSfPick: (matchId: string, winnerId: string) => void;
  onSfClear: (matchId: string) => void;
  onSfClearResults: () => void;
  onFinalPick: (matchId: string, winnerId: string) => void;
  onFinalClear: (matchId: string) => void;
  onFinalClearResults: () => void;
};

function teamAt(
  assignments: Ro16Assignments,
  matchId: string,
  side: "a" | "b",
) {
  return assignments[slotKey(matchId, side)] ?? "";
}

export function PlayoffBracket({
  post,
  officialGames,
  dragging,
  onRo16DragStart,
  onRo16DragEnd,
  onRo16Drop,
  onRo16Pick,
  onRo16Clear,
  onRo16ClearResults,
  onQfPick,
  onQfClear,
  onQfClearResults,
  onSfPick,
  onSfClear,
  onSfClearResults,
  onFinalPick,
  onFinalClear,
  onFinalClearResults,
}: PlayoffBracketProps) {
  const qf = bracketMatchups(QF_MATCHES, post);
  const sf = bracketMatchups(SF_MATCHES, post);
  const finals = bracketMatchups(FINAL_MATCHES, post);
  const poOfficial = playoffGames(officialGames);
  const championId = finals[0]
    ? post.finalResults[finals[0].id]?.winnerId
    : undefined;

  const dragPool =
    dragging?.kind === "ro16" || dragging?.kind === "pool"
      ? dragging.pool
      : null;
  const dragSlot =
    dragging?.kind === "ro16" ? dragging.slotKey : null;

  function isDropTarget(key: string): boolean {
    if (dragPool == null) return false;
    if (dragSlot && dragSlot === key) return false;
    const parsed = key.split(":");
    const matchId = parsed[0];
    const side = parsed[1] as "a" | "b";
    if (!matchId || (side !== "a" && side !== "b")) return false;
    return poolForRo16Slot(matchId, side) === dragPool;
  }

  return (
    <div className="overflow-x-auto pb-6">
      <div
        className="grid min-w-[1100px] gap-x-2 px-2"
        style={{
          gridTemplateColumns: "188px 24px 188px 24px 188px 24px 188px 16px 180px",
          gridTemplateRows: "auto repeat(8, minmax(64px, 1fr))",
        }}
      >
        <Header
          cell="1"
          label="Round of 16"
          onClear={
            Object.keys(post.ro16Results).length > 0
              ? onRo16ClearResults
              : undefined
          }
        />
        <Header
          cell="3"
          label="Quarterfinals"
          onClear={
            Object.keys(post.qfResults).length > 0
              ? onQfClearResults
              : undefined
          }
        />
        <Header
          cell="5"
          label="Semifinals"
          onClear={
            Object.keys(post.sfResults).length > 0
              ? onSfClearResults
              : undefined
          }
        />
        <Header
          cell="7"
          label="Final"
          onClear={
            Object.keys(post.finalResults).length > 0
              ? onFinalClearResults
              : undefined
          }
        />
        <Header cell="9" label="Champion" />

        {/* Ro16 matches in rows 2-9 */}
        {RO16_MATCHES.map((m, i) => {
          const row = i + 2;
          const keyA = slotKey(m.id, "a");
          const keyB = slotKey(m.id, "b");
          const a = teamAt(post.ro16Assignments, m.id, "a");
          const b = teamAt(post.ro16Assignments, m.id, "b");
          return (
            <div
              key={m.id}
              className="flex items-center"
              style={{ gridColumn: 1, gridRow: row }}
            >
              <BracketMatch
                matchId={m.id}
                label={m.label}
                teamAId={a}
                teamBId={b}
                result={post.ro16Results[m.id]}
                officialWinnerId={officialWinnerFor(a, b, poOfficial)}
                showPools
                dragging={dragging}
                dropHighlightA={isDropTarget(keyA)}
                dropHighlightB={isDropTarget(keyB)}
                onRo16DragStart={(side) =>
                  onRo16DragStart(slotKey(m.id, side))
                }
                onRo16DragEnd={onRo16DragEnd}
                onRo16Drop={(side, payload) =>
                  onRo16Drop(slotKey(m.id, side), payload)
                }
                onPick={(id) => onRo16Pick(m.id, id)}
                onClear={() => onRo16Clear(m.id)}
              />
            </div>
          );
        })}

        {/* Connectors Ro16 → QF */}
        {[0, 1, 2, 3].map((pair) => (
          <VConnector
            key={`c-ro16-${pair}`}
            col={2}
            rowStart={pair * 2 + 2}
            rowSpan={2}
          />
        ))}

        {/* QF */}
        {qf.map((m, i) => (
          <div
            key={m.id}
            className="flex items-center"
            style={{
              gridColumn: 3,
              gridRow: `${i * 2 + 2} / span 2`,
            }}
          >
            <BracketMatch
              matchId={m.id}
              label={m.label}
              teamAId={m.teamA}
              teamBId={m.teamB}
              result={post.qfResults[m.id]}
              officialWinnerId={officialWinnerFor(
                m.teamA,
                m.teamB,
                poOfficial,
              )}
              onPick={(id) => onQfPick(m.id, id)}
              onClear={() => onQfClear(m.id)}
            />
          </div>
        ))}

        {/* Connectors QF → SF */}
        {[0, 1].map((pair) => (
          <VConnector
            key={`c-qf-${pair}`}
            col={4}
            rowStart={pair * 4 + 2}
            rowSpan={4}
          />
        ))}

        {/* SF */}
        {sf.map((m, i) => (
          <div
            key={m.id}
            className="flex items-center"
            style={{
              gridColumn: 5,
              gridRow: `${i * 4 + 2} / span 4`,
            }}
          >
            <BracketMatch
              matchId={m.id}
              label={m.label}
              teamAId={m.teamA}
              teamBId={m.teamB}
              result={post.sfResults[m.id]}
              officialWinnerId={officialWinnerFor(
                m.teamA,
                m.teamB,
                poOfficial,
              )}
              onPick={(id) => onSfPick(m.id, id)}
              onClear={() => onSfClear(m.id)}
            />
          </div>
        ))}

        {/* Connector SF → Final */}
        <VConnector col={6} rowStart={2} rowSpan={8} />

        {/* Final */}
        <div
          className="flex items-center"
          style={{ gridColumn: 7, gridRow: "2 / span 8" }}
        >
          {finals.map((m) => (
            <BracketMatch
              key={m.id}
              matchId={m.id}
              label={m.label}
              teamAId={m.teamA}
              teamBId={m.teamB}
              result={post.finalResults[m.id]}
              officialWinnerId={officialWinnerFor(
                m.teamA,
                m.teamB,
                poOfficial,
              )}
              onPick={(id) => onFinalPick(m.id, id)}
              onClear={() => onFinalClear(m.id)}
            />
          ))}
        </div>

        {/* Connector Final → Champion */}
        <div
          className="relative"
          style={{ gridColumn: 8, gridRow: "2 / span 8" }}
          aria-hidden
        >
          <div className="absolute top-1/2 right-0 left-0 h-px bg-[#2a3448]" />
        </div>

        {/* Champion */}
        <div
          className="flex items-center"
          style={{ gridColumn: 9, gridRow: "2 / span 8" }}
        >
          {championId ? (
            <ChampionBanner teamId={championId} />
          ) : (
            <div className="w-full rounded-lg border border-dashed border-[#2a3448] px-3 py-3 text-[10px] text-[#5c6b82]">
              Winner TBD
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Header({
  cell,
  label,
  onClear,
}: {
  cell: string;
  label: string;
  onClear?: () => void;
}) {
  return (
    <div
      className="flex flex-col items-center gap-0.5 pb-3"
      style={{ gridColumn: cell, gridRow: 1 }}
    >
      <h3 className="text-center text-[10px] font-bold tracking-[0.16em] text-[#d4a84b] uppercase">
        {label}
      </h3>
      {onClear && (
        <button
          type="button"
          onClick={onClear}
          className="rounded px-1 py-0.5 text-[9px] text-[#5c6b82] underline-offset-2 transition-colors hover:text-white hover:underline"
        >
          Clear
        </button>
      )}
    </div>
  );
}

function VConnector({
  col,
  rowStart,
  rowSpan,
}: {
  col: number;
  rowStart: number;
  rowSpan: number;
}) {
  return (
    <div
      className="relative"
      style={{
        gridColumn: col,
        gridRow: `${rowStart} / span ${rowSpan}`,
      }}
      aria-hidden
    >
      {/* vertical spine */}
      <div className="absolute top-[25%] bottom-[25%] left-1/2 w-px -translate-x-1/2 bg-[#2a3448]" />
      {/* horizontal out to next round */}
      <div className="absolute top-1/2 right-0 left-1/2 h-px bg-[#2a3448]" />
      {/* horizontals in from previous */}
      <div
        className={cn(
          "absolute left-0 h-px w-1/2 bg-[#2a3448]",
          rowSpan <= 2 ? "top-[25%]" : "top-[12.5%]",
        )}
      />
      <div
        className={cn(
          "absolute left-0 h-px w-1/2 bg-[#2a3448]",
          rowSpan <= 2 ? "bottom-[25%]" : "bottom-[12.5%]",
        )}
      />
    </div>
  );
}

function ChampionBanner({ teamId }: { teamId: string }) {
  const team = TEAM_BY_ID[teamId];
  if (!team) return null;
  return (
    <div className="flex items-center gap-2 rounded-lg border border-[#d4a84b]/35 bg-[linear-gradient(135deg,#292010_0%,#1a150e_100%)] px-3 py-2">
      <TeamLogo team={team} size={22} />
      <div>
        <p className="text-[8px] font-bold tracking-[0.14em] text-[#d4a84b] uppercase">
          Champion
        </p>
        <p className="text-sm font-extrabold tracking-wide text-[#f5e6c8] uppercase">
          {team.name}
        </p>
      </div>
    </div>
  );
}
