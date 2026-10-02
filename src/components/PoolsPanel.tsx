"use client";

import { TeamLogo } from "@/components/MatchCard";
import { TEAM_BY_ID } from "@/data/teams";
import { useCoarsePointer } from "@/hooks/usePointerMove";
import {
  writeDragPayload,
  readDragPayload,
  type SwapDragPayload,
} from "@/lib/dragSwap";
import type {
  PlayoffPoolId,
  PlayoffPools,
  Ro16Assignments,
} from "@/lib/playoffs";
import { EXPECTED_POOL_SIZES, findRo16SlotForTeam } from "@/lib/playoffs";
import { cn } from "@/lib/utils";

const POOL_META: {
  id: PlayoffPoolId;
  title: string;
  blurb: string;
}[] = [
  { id: 1, title: "Pool 1", blurb: "Knockout winners" },
  { id: 2, title: "Pool 2", blurb: "Swiss 4-0" },
  { id: 3, title: "Pool 3", blurb: "Swiss 4-1" },
  { id: 4, title: "Pool 4", blurb: "Swiss 4-2" },
  { id: 5, title: "Pool 5", blurb: "Swiss 4-3 (direct)" },
];

type PoolsPanelProps = {
  pools: PlayoffPools;
  assignments: Ro16Assignments;
  dragging: SwapDragPayload | null;
  onDragStart: (teamId: string, pool: PlayoffPoolId) => void;
  onDragEnd: () => void;
  /** Drop / tap a Ro16 team back into its pool to unseat. */
  onUnseatFromRo16: (slotKey: string) => void;
};

export function PoolsPanel({
  pools,
  assignments,
  dragging,
  onDragStart,
  onDragEnd,
  onUnseatFromRo16,
}: PoolsPanelProps) {
  const coarse = useCoarsePointer();

  return (
    <section className="rounded-xl border border-[#2a3548] bg-[#0a1018]/80 p-3 sm:p-4">
      <div className="mb-3">
        <h2 className="font-[family-name:var(--font-display)] text-xl tracking-[0.06em] text-white uppercase">
          Draw Pools
        </h2>
        <p className="mt-0.5 text-[11px] text-[#8b97ab]">
          {coarse
            ? "Tap a team, then tap a matching Ro16 slot · tap pool again to cancel · drag Ro16 team here to unseat"
            : "Drag onto matching Ro16 slots · drag a seated Ro16 team back here to unseat"}
        </p>
        {!pools.sizesOk && pools.mismatch && (
          <p className="mt-1 text-[11px] text-[#f07178]">
            Pool sizes: {pools.mismatch}
          </p>
        )}
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5">
        {POOL_META.map((meta) => {
          const key = `pool${meta.id}` as const;
          const teams = pools[key];
          const expected = EXPECTED_POOL_SIZES[meta.id];
          const ok = teams.length === expected;
          const acceptsUnseat =
            dragging?.kind === "ro16" && dragging.pool === meta.id;
          const poolHighlighted =
            ((dragging?.kind === "pool" || dragging?.kind === "ro16") &&
              dragging.pool === meta.id) ||
            acceptsUnseat;

          return (
            <div
              key={meta.id}
              onDragOver={(e) => {
                if (!acceptsUnseat) return;
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
              }}
              onDrop={(e) => {
                e.preventDefault();
                const payload = readDragPayload(e);
                if (payload?.kind === "ro16" && payload.pool === meta.id) {
                  onUnseatFromRo16(payload.slotKey);
                }
              }}
              onClick={() => {
                if (
                  acceptsUnseat &&
                  dragging?.kind === "ro16" &&
                  dragging.pool === meta.id
                ) {
                  onUnseatFromRo16(dragging.slotKey);
                }
              }}
              className={cn(
                "flex flex-col gap-1.5 rounded-lg border bg-[#0e1522]/90 p-2 transition",
                ok ? "border-[#2a3448]" : "border-[#f07178]/35",
                poolHighlighted &&
                  "border-[#60a5fa]/50 ring-1 ring-[#60a5fa]/25",
                acceptsUnseat && "bg-[#1e3a5f]/20",
              )}
            >
              <div className="flex items-baseline justify-between gap-1">
                <div>
                  <p className="text-[11px] font-bold tracking-[0.1em] text-[#d4a84b] uppercase">
                    {meta.title}
                  </p>
                  <p className="text-[9px] text-[#5c6b82]">
                    {acceptsUnseat ? "Drop here to unseat" : meta.blurb}
                  </p>
                </div>
                <span
                  className={cn(
                    "text-[9px] font-bold tabular-nums",
                    ok ? "text-[#8b97ab]" : "text-[#f07178]",
                  )}
                >
                  {teams.length}/{expected}
                </span>
              </div>
              <ul className="flex flex-col gap-0.5">
                {teams.length === 0 && (
                  <li className="rounded border border-dashed border-[#2a3448] px-1.5 py-1.5 text-[10px] text-[#5c6b82]">
                    Empty
                  </li>
                )}
                {teams.map((id) => {
                  const team = TEAM_BY_ID[id];
                  if (!team) return null;
                  const seated = !!findRo16SlotForTeam(assignments, id);
                  const isDragging =
                    dragging?.kind === "pool" && dragging.teamId === id;
                  return (
                    <li key={id}>
                      <button
                        type="button"
                        draggable={!coarse}
                        title={`${team.name} · ${coarse ? "tap then tap a Pool " + meta.id + " Ro16 slot" : "drag onto a Pool " + meta.id + " Ro16 slot"}`}
                        onDragStart={(e) => {
                          writeDragPayload(e, {
                            kind: "pool",
                            teamId: id,
                            pool: meta.id,
                          });
                          onDragStart(id, meta.id);
                        }}
                        onDragEnd={onDragEnd}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (
                            dragging?.kind === "pool" &&
                            dragging.teamId === id
                          ) {
                            onDragEnd();
                            return;
                          }
                          onDragStart(id, meta.id);
                        }}
                        className={cn(
                          "flex w-full items-center gap-1.5 rounded-md border px-1.5 py-1 text-left touch-manipulation",
                          !coarse && "cursor-grab active:cursor-grabbing",
                          seated
                            ? "border-[#1e2838] bg-[#0c121c] text-[#65748a]"
                            : "border-[#243044] bg-[#141c2a] text-white hover:border-[#3d4d66]",
                          isDragging &&
                            "opacity-100 ring-1 ring-[#60a5fa]/70 border-[#60a5fa]/50",
                        )}
                      >
                        <TeamLogo team={team} size={16} lost={seated} />
                        <span className="min-w-0 truncate text-[11px] font-extrabold tracking-wide uppercase">
                          {team.short}
                        </span>
                        {seated && (
                          <span className="ml-auto text-[8px] font-semibold tracking-wide text-[#5c6b82] uppercase">
                            In
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}
