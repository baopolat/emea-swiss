"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { MatchCard } from "@/components/MatchCard";
import { FinalResultsColumn } from "@/components/FinalResultsColumn";
import { groupMatchupsByPool } from "@/lib/brackets";
import {
  buildSwissSnapshot,
  isRoundComplete,
  type RoundResults,
} from "@/lib/swiss";

const STORAGE_KEY = "emea-masters-swiss-summer-2026-v2";

function loadResults(): RoundResults[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as RoundResults[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function SwissBoard() {
  const [results, setResults] = useState<RoundResults[] | null>(null);

  useEffect(() => {
    setResults(loadResults());
  }, []);

  useEffect(() => {
    if (results === null) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(results));
  }, [results]);

  const snapshot = useMemo(() => {
    if (results === null) return null;
    try {
      return buildSwissSnapshot(results);
    } catch (error) {
      console.error("Swiss pairing failed", error);
      return buildSwissSnapshot(
        results.slice(0, Math.max(0, results.length - 1)),
      );
    }
  }, [results]);

  const progressiveById = useMemo(() => {
    if (!snapshot) return {} as Record<string, number>;
    return Object.fromEntries(
      snapshot.standings.map((s) => [s.team.id, s.progressive]),
    );
  }, [snapshot]);

  function setWinner(roundIndex: number, matchId: string, winnerId: string) {
    setResults((prev) => {
      const base = prev ?? [];
      const next = base.map((r) => ({ ...r }));
      while (next.length <= roundIndex) next.push({});
      const trimmed = next.slice(0, roundIndex + 1);
      trimmed[roundIndex] = {
        ...trimmed[roundIndex],
        [matchId]: { winnerId },
      };
      return trimmed;
    });
  }

  function clearWinner(roundIndex: number, matchId: string) {
    setResults((prev) => {
      const base = prev ?? [];
      if (!base[roundIndex]) return base;
      const trimmed = base.slice(0, roundIndex + 1).map((r) => ({ ...r }));
      const copy = { ...trimmed[roundIndex] };
      delete copy[matchId];
      trimmed[roundIndex] = copy;
      return trimmed;
    });
  }

  function resetRound(roundIndex: number) {
    setResults((prev) => (prev ?? []).slice(0, roundIndex));
  }

  function resetAll() {
    setResults([]);
  }

  if (results === null || snapshot === null) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-[#8b97ab]">
        Loading Swiss board…
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-20 border-b border-[#243044] bg-[#0a101a]/95 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-[1700px] flex-wrap items-center justify-between gap-3 px-4 py-3.5 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="hidden size-9 items-center justify-center rounded-lg bg-[#2ecc71] text-sm font-black text-[#072012] sm:flex">
              EM
            </div>
            <div>
              <p className="text-[10px] font-semibold tracking-[0.24em] text-[#2ecc71] uppercase">
                EMEA Masters · Summer 2026
              </p>
              <h1 className="font-[family-name:var(--font-display)] text-2xl leading-none tracking-[0.05em] text-white uppercase sm:text-[1.75rem]">
                Swiss Stage
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <p className="hidden max-w-xs text-right text-[11px] leading-snug text-[#7a879c] lg:block">
              Click a shortcode to pick the winner. Next column unlocks when the
              round is fully decided · FIDE Dutch
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={resetAll}
              className="border-[#334155] bg-[#151b27] text-white hover:bg-[#222b3c] hover:text-white"
            >
              Reset all
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-[1700px] flex-1 overflow-x-auto px-4 py-5 sm:px-6">
        <div className="flex min-w-max items-start gap-5 pb-10">
          {snapshot.rounds.map((matchups, roundIndex) => {
            const pools = groupMatchupsByPool(matchups);
            const decided = matchups.filter(
              (m) => results[roundIndex]?.[m.id],
            ).length;
            const complete = isRoundComplete(matchups, results[roundIndex]);
            const isLatest = roundIndex === snapshot.rounds.length - 1;

            return (
              <section
                key={roundIndex}
                className="round-enter flex w-[268px] shrink-0 flex-col gap-3"
                style={{ animationDelay: `${roundIndex * 45}ms` }}
              >
                <div className="sticky top-[61px] z-10 rounded-lg border border-[#243044] bg-[#101722]/95 px-3 py-2.5 backdrop-blur">
                  <div className="flex items-baseline justify-between gap-2">
                    <h2 className="text-[13px] font-bold tracking-[0.14em] text-white uppercase">
                      Round {roundIndex + 1}
                    </h2>
                    <span
                      className={
                        complete
                          ? "rounded-full bg-[#2ecc71]/15 px-2 py-0.5 text-[10px] font-bold text-[#2ecc71]"
                          : "rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-semibold text-[#8b97ab]"
                      }
                    >
                      {decided}/{matchups.length}
                    </span>
                  </div>
                  <p className="mt-1 text-[10px] text-[#7a879c]">
                    {roundIndex === 0
                      ? "Official 0-0 seed pairings"
                      : complete
                        ? "Complete · next stage unlocked"
                        : isLatest
                          ? "Finish all matches to unlock next"
                          : "FIDE Dutch pairings"}
                  </p>
                  {(roundIndex > 0 || decided > 0) && (
                    <button
                      type="button"
                      onClick={() => resetRound(roundIndex)}
                      className="mt-1.5 text-[10px] text-[#5c6b82] underline-offset-2 hover:text-white hover:underline"
                    >
                      Clear from here
                    </button>
                  )}
                </div>

                {pools.map((pool) => (
                  <div key={pool.pool} className="flex flex-col gap-2">
                    <h3 className="px-1 text-[11px] font-bold tracking-[0.16em] text-[#c5a035] uppercase">
                      {pool.label}
                    </h3>
                    <div className="flex flex-col gap-2">
                      {pool.matches.map((match) => (
                        <MatchCard
                          key={match.id}
                          match={match}
                          result={results[roundIndex]?.[match.id]}
                          progressiveA={progressiveById[match.teamA]}
                          progressiveB={progressiveById[match.teamB]}
                          onPick={(winnerId) =>
                            setWinner(roundIndex, match.id, winnerId)
                          }
                          onClear={() => clearWinner(roundIndex, match.id)}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </section>
            );
          })}

          <FinalResultsColumn standings={snapshot.standings} />
        </div>
      </div>

      <footer className="border-t border-[#243044] px-4 py-3 text-[11px] text-[#5c6b82] sm:px-6">
        Official shortcodes · Progressive Score (R1=7 … R7=1) then Swiss seed ·
        Qual/elim pools Bo3, otherwise Bo1
      </footer>
    </div>
  );
}
