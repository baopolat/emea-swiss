"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { KnockoutColumn } from "@/components/KnockoutColumn";
import { PlayoffBracket } from "@/components/PlayoffBracket";
import { PoolsPanel } from "@/components/PoolsPanel";
import { SiteNav } from "@/components/SiteNav";
import { loadBoard, saveBoard } from "@/lib/boardStorage";
import type { SwapDragPayload } from "@/lib/dragSwap";
import {
  OFFICIAL_GAMES,
  OFFICIAL_POLL_MS,
  fillOfficialBracketPostSwiss,
  fillOfficialKnockoutPostSwiss,
  hasOfficialBracket,
  mergeOfficialPostSwiss,
  type OfficialGame,
  type OfficialResultsFile,
} from "@/lib/official";
import {
  allKoDecided,
  buildPlayoffPools,
  canSwapRo16Slots,
  clearFromQf,
  clearFromRo16,
  clearFromSf,
  koWinners,
  knockoutSwissTeams,
  placePoolTeamInSlot,
  poolForRo16Slot,
  randomizeRo16Draw,
  swapRo16Slots,
  syncKoPairingsToSwiss,
  unseatRo16Slot,
  type PlayoffPoolId,
  type PostSwissState,
} from "@/lib/playoffs";
import { buildSwissSnapshot, type RoundResults } from "@/lib/swiss";

export function PlayoffsBoard() {
  const [swiss, setSwiss] = useState<RoundResults[] | null>(null);
  const [post, setPost] = useState<PostSwissState | null>(null);
  const [officialGames, setOfficialGames] =
    useState<OfficialGame[]>(OFFICIAL_GAMES);
  const [dragging, setDragging] = useState<SwapDragPayload | null>(null);

  useEffect(() => {
    const board = loadBoard();
    setSwiss(board.swiss);
    setPost(board.post);
  }, []);

  useEffect(() => {
    if (swiss === null || post === null) return;
    saveBoard({ swiss, post });
  }, [swiss, post]);

  useEffect(() => {
    let cancelled = false;
    async function refreshOfficial() {
      try {
        const res = await fetch("/api/official-results", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as OfficialResultsFile;
        if (cancelled || !Array.isArray(data.games)) return;
        setOfficialGames(data.games);
      } catch (error) {
        console.warn("official results poll failed", error);
      }
    }
    void refreshOfficial();
    const id = window.setInterval(refreshOfficial, OFFICIAL_POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  const snapshot = useMemo(() => {
    if (!swiss) return null;
    try {
      return buildSwissSnapshot(swiss);
    } catch {
      return null;
    }
  }, [swiss]);

  // Re-apply official KO/playoff winners whenever pairings or live games change.
  // Pairings sync can reset post-Swiss state; merge must run after that.
  useEffect(() => {
    if (!snapshot) return;
    setPost((prev) => {
      if (!prev) return prev;
      const synced = syncKoPairingsToSwiss(prev, snapshot.advanced);
      return mergeOfficialPostSwiss(synced, officialGames);
    });
  }, [snapshot, officialGames]);

  const koReady =
    !!snapshot && knockoutSwissTeams(snapshot.advanced).length >= 3;

  const playoffPools = useMemo(() => {
    if (!snapshot || !post || !allKoDecided(post)) return null;
    return buildPlayoffPools(snapshot.advanced, koWinners(post));
  }, [snapshot, post]);

  function updatePost(updater: (prev: PostSwissState) => PostSwissState) {
    setPost((prev) => (prev ? updater(prev) : prev));
  }

  if (swiss === null || post === null) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-[#8b97ab]">
        <div className="size-8 animate-pulse rounded-lg bg-[#2ecc71]/20" />
        <p className="text-sm tracking-wide">Loading playoffs…</p>
      </div>
    );
  }

  if (!koReady) {
    return (
      <div className="flex h-dvh flex-col overflow-hidden">
        <PlayoffsHeader />
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 text-center">
          <p className="font-[family-name:var(--font-display)] text-2xl tracking-[0.06em] text-white uppercase">
            Waiting on Swiss
          </p>
          <p className="max-w-md text-sm text-[#8b97ab]">
            Finish the Swiss Stage so seeds 14–16 are set. Knockout and the
            playoff bracket unlock from there.
          </p>
          <Link
            href="/"
            className="rounded-md border border-[#2ecc71]/35 bg-[#0f1a14] px-3 py-1.5 text-xs font-bold tracking-wide text-[#2ecc71] uppercase hover:border-[#2ecc71]/55"
          >
            Open Swiss Stage
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <PlayoffsHeader />

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6 px-3 py-4 sm:px-4">
          {/* Knockout play-in */}
          <section className="rounded-xl border border-[#2a3548] bg-[#0a1018]/80 p-3 sm:p-4">
            <div className="mb-3">
              <h2 className="font-[family-name:var(--font-display)] text-xl tracking-[0.06em] text-white uppercase">
                Knockout Matches
              </h2>
              <p className="mt-0.5 text-[11px] text-[#8b97ab]">
                Fixed seats: WSCI #1–3 vs Swiss #16–14 · winners enter Pool 1
              </p>
            </div>
            <KnockoutColumn
              horizontal
              pairings={post.koPairings}
              results={post.koResults}
              officialGames={officialGames}
              onPick={(matchId, winnerId) => {
                updatePost((prev) =>
                  clearFromRo16({
                    ...prev,
                    koResults: {
                      ...prev.koResults,
                      [matchId]: { winnerId },
                    },
                  }),
                );
              }}
              onClear={(matchId) => {
                updatePost((prev) => {
                  const koResults = { ...prev.koResults };
                  delete koResults[matchId];
                  return clearFromRo16({ ...prev, koResults });
                });
              }}
              onClearResults={() => {
                updatePost((prev) =>
                  clearFromRo16({ ...prev, koResults: {} }),
                );
              }}
              onFillOfficial={() => {
                updatePost((prev) =>
                  fillOfficialKnockoutPostSwiss(prev, officialGames),
                );
              }}
            />
          </section>

          {/* Pools between KO and bracket */}
          {playoffPools && (
            <PoolsPanel
              pools={playoffPools}
              assignments={post.ro16Assignments}
              dragging={dragging}
              onDragStart={(teamId, pool) =>
                setDragging({ kind: "pool", teamId, pool })
              }
              onDragEnd={() => setDragging(null)}
              onUnseatFromRo16={(slotKey) => {
                updatePost((prev) =>
                  clearFromQf({
                    ...prev,
                    ro16Assignments: unseatRo16Slot(
                      prev.ro16Assignments,
                      slotKey,
                    ),
                    ro16Results: {},
                  }),
                );
                setDragging(null);
              }}
            />
          )}

          {!allKoDecided(post) && (
            <div className="rounded-xl border border-dashed border-[#2a3448] px-4 py-8 text-center text-sm text-[#5c6b82]">
              Decide all three Knockout matches to reveal draw pools and the
              bracket.
            </div>
          )}

          {/* Bracket */}
          {allKoDecided(post) && (
            <section className="rounded-xl border border-[#2a3548] bg-[#0a1018]/80 p-3 sm:p-4">
              <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
                <div>
                  <h2 className="font-[family-name:var(--font-display)] text-xl tracking-[0.06em] text-white uppercase">
                    Playoffs Bracket
                  </h2>
                  <p className="mt-0.5 text-[11px] text-[#8b97ab]">
                    Drag or long-press to move · blue = valid drop · drop back
                    on Draw Pools to unseat
                  </p>
                </div>
                {playoffPools && (
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      disabled={!playoffPools.sizesOk}
                      onClick={() => {
                        updatePost((prev) =>
                          clearFromQf({
                            ...prev,
                            ro16Assignments: randomizeRo16Draw(
                              playoffPools,
                              prev.ro16Assignments,
                            ),
                            ro16Results: {},
                          }),
                        );
                        setDragging(null);
                      }}
                      className="rounded border border-[#2a3548] bg-[#121820] px-2.5 py-1 text-[10px] font-semibold text-[#c5cedd] transition-colors hover:border-[#3d4d66] hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Randomize rest
                    </button>
                    {hasOfficialBracket(post, officialGames) && (
                      <button
                        type="button"
                        onClick={() => {
                          updatePost((prev) =>
                            fillOfficialBracketPostSwiss(prev, officialGames),
                          );
                        }}
                        className="rounded border border-[#2ecc71]/30 bg-[#121820] px-2.5 py-1 text-[10px] font-semibold text-[#2ecc71] transition-colors hover:border-[#2ecc71]/55 hover:bg-[#0f1a14] hover:text-[#3dd68c]"
                      >
                        Official
                      </button>
                    )}
                    {Object.keys(post.ro16Assignments).length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          updatePost((prev) => clearFromRo16(prev));
                          setDragging(null);
                        }}
                        className="rounded border border-[#f07178]/30 bg-[#121820] px-2.5 py-1 text-[10px] font-semibold text-[#f07178] transition-colors hover:border-[#f07178]/55 hover:bg-[#1a1216]"
                      >
                        Clear draw
                      </button>
                    )}
                    {Object.keys(post.ro16Results).length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          updatePost((prev) =>
                            clearFromQf({ ...prev, ro16Results: {} }),
                          );
                        }}
                        className="rounded px-2 py-1 text-[10px] text-[#5c6b82] underline-offset-2 hover:text-white hover:underline"
                      >
                        Clear Ro16 results
                      </button>
                    )}
                  </div>
                )}
              </div>

              <PlayoffBracket
                post={post}
                officialGames={officialGames}
                dragging={dragging}
                onRo16DragStart={(slot) => {
                  const [matchId, side] = slot.split(":");
                  if (!matchId || (side !== "a" && side !== "b")) return;
                  const pool = poolForRo16Slot(matchId, side);
                  if (pool == null) return;
                  setDragging({
                    kind: "ro16",
                    slotKey: slot,
                    pool,
                  });
                }}
                onRo16DragEnd={() => setDragging(null)}
                onRo16Drop={(targetKey, payload) => {
                  if (payload.kind === "pool") {
                    updatePost((prev) =>
                      clearFromQf({
                        ...prev,
                        ro16Assignments: placePoolTeamInSlot(
                          prev.ro16Assignments,
                          payload.teamId,
                          payload.pool as PlayoffPoolId,
                          targetKey,
                        ),
                        ro16Results: {},
                      }),
                    );
                    setDragging(null);
                    return;
                  }
                  if (!canSwapRo16Slots(payload.slotKey, targetKey)) {
                    setDragging(null);
                    return;
                  }
                  updatePost((prev) =>
                    clearFromQf({
                      ...prev,
                      ro16Assignments: swapRo16Slots(
                        prev.ro16Assignments,
                        payload.slotKey,
                        targetKey,
                      ),
                      ro16Results: {},
                    }),
                  );
                  setDragging(null);
                }}
                onRo16Pick={(matchId, winnerId) => {
                  updatePost((prev) =>
                    clearFromQf({
                      ...prev,
                      ro16Results: {
                        ...prev.ro16Results,
                        [matchId]: { winnerId },
                      },
                    }),
                  );
                }}
                onRo16Clear={(matchId) => {
                  updatePost((prev) => {
                    const ro16Results = { ...prev.ro16Results };
                    delete ro16Results[matchId];
                    return clearFromQf({ ...prev, ro16Results });
                  });
                }}
                onQfPick={(matchId, winnerId) => {
                  updatePost((prev) =>
                    clearFromSf({
                      ...prev,
                      qfResults: {
                        ...prev.qfResults,
                        [matchId]: { winnerId },
                      },
                    }),
                  );
                }}
                onQfClear={(matchId) => {
                  updatePost((prev) => {
                    const qfResults = { ...prev.qfResults };
                    delete qfResults[matchId];
                    return clearFromSf({ ...prev, qfResults });
                  });
                }}
                onSfPick={(matchId, winnerId) => {
                  updatePost((prev) => ({
                    ...prev,
                    sfResults: {
                      ...prev.sfResults,
                      [matchId]: { winnerId },
                    },
                    finalResults: {},
                  }));
                }}
                onSfClear={(matchId) => {
                  updatePost((prev) => {
                    const sfResults = { ...prev.sfResults };
                    delete sfResults[matchId];
                    return { ...prev, sfResults, finalResults: {} };
                  });
                }}
                onFinalPick={(matchId, winnerId) => {
                  updatePost((prev) => ({
                    ...prev,
                    finalResults: {
                      ...prev.finalResults,
                      [matchId]: { winnerId },
                    },
                  }));
                }}
                onFinalClear={(matchId) => {
                  updatePost((prev) => {
                    const finalResults = { ...prev.finalResults };
                    delete finalResults[matchId];
                    return { ...prev, finalResults };
                  });
                }}
              />
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

function PlayoffsHeader() {
  return (
    <header className="relative z-20 shrink-0 border-b border-[#1e2838] bg-[#070b12]/90 backdrop-blur-xl">
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[#d4a84b]/35 to-transparent" />
      <div className="mx-auto flex w-full max-w-[1400px] items-center justify-between gap-2 px-3 py-2 sm:px-4">
        <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logos/emea-masters.png"
            alt="EMEA Masters"
            className="h-8 w-auto shrink-0 object-contain sm:h-9"
          />
          <div className="min-w-0">
            <p className="truncate text-[8px] font-bold tracking-[0.2em] text-[#d4a84b] uppercase sm:text-[9px]">
              Summer 2026
            </p>
            <h1 className="font-[family-name:var(--font-display)] text-[1.2rem] leading-none tracking-[0.06em] text-white uppercase sm:text-[1.35rem]">
              Playoffs
            </h1>
          </div>
        </div>
        <SiteNav />
      </div>
    </header>
  );
}
