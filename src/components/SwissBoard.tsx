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

const STORAGE_KEY = "emea-masters-swiss-summer-2026";

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
      <header className="sticky top-0 z-20 border-b border-[#2a3344] bg-[#0b1220]/92 backdrop-blur">
        <div className="mx-auto flex w-full max-w-[1600px] flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div>
            <p className="text-[10px] font-semibold tracking-[0.22em] text-[#e8c547] uppercase">
              EMEA Masters · Summer 2026
            </p>
            <h1 className="font-[family-name:var(--font-display)] text-2xl tracking-[0.06em] text-white uppercase sm:text-3xl">
              Swiss Matchup Calculator
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <p className="hidden text-xs text-[#8b97ab] md:block">
              FIDE Dutch pairing · next stage unlocks when the round is complete
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={resetAll}
              className="border-[#3a4558] bg-[#151b27] text-white hover:bg-[#222b3c] hover:text-white"
            >
              Reset all
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-[1600px] flex-1 overflow-x-auto px-4 py-5 sm:px-6">
        <div className="flex min-w-max items-start gap-4 pb-8">
          {snapshot.rounds.map((matchups, roundIndex) => {
            const pools = groupMatchupsByPool(matchups);
            const decided = matchups.filter(
              (m) => results[roundIndex]?.[m.id],
            ).length;
            const complete = isRoundComplete(
              matchups,
              results[roundIndex],
            );
            const isLatest = roundIndex === snapshot.rounds.length - 1;

            return (
              <section
                key={roundIndex}
                className="flex w-[240px] shrink-0 flex-col gap-3"
              >
                <div className="sticky top-[57px] z-10 border-b border-[#2a3344] bg-[#0b1220]/95 px-1 pb-2 backdrop-blur">
                  <div className="flex items-baseline justify-between gap-2">
                    <h2 className="text-sm font-bold tracking-wide text-white uppercase">
                      Round {roundIndex + 1}
                    </h2>
                    <span
                      className={
                        complete
                          ? "text-[10px] font-semibold text-[#2ecc71]"
                          : "text-[10px] text-[#8b97ab]"
                      }
                    >
                      {decided}/{matchups.length}
                    </span>
                  </div>
                  <p className="text-[10px] text-[#8b97ab]">
                    {roundIndex === 0
                      ? "Official 0-0 seeds"
                      : complete
                        ? "Complete · next stage ready"
                        : isLatest
                          ? "Set all results to unlock next"
                          : "FIDE Dutch"}
                  </p>
                  {(roundIndex > 0 || decided > 0) && (
                    <button
                      type="button"
                      onClick={() => resetRound(roundIndex)}
                      className="mt-1 text-[10px] text-[#6b778c] underline-offset-2 hover:text-white hover:underline"
                    >
                      Clear from here
                    </button>
                  )}
                </div>

                {pools.map((pool) => (
                  <div key={pool.pool} className="flex flex-col gap-1.5">
                    <h3 className="px-1 text-[11px] font-semibold tracking-wide text-[#c5a035] uppercase">
                      {pool.label}
                    </h3>
                    <div className="flex flex-col gap-1.5">
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
                          onClear={() =>
                            clearWinner(roundIndex, match.id)
                          }
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

      <footer className="border-t border-[#2a3344] px-4 py-3 text-[11px] text-[#6b778c] sm:px-6">
        Click a team to set the winner. Advancement seeding uses Progressive
        Score (R1 win = 7 … R7 win = 1), then Swiss seed. Qual/elim pools are
        Bo3; others Bo1.
      </footer>
    </div>
  );
}
