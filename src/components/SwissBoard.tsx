"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { MatchCard } from "@/components/MatchCard";
import { Standings } from "@/components/Standings";
import { groupMatchupsByPool } from "@/lib/brackets";
import {
  buildSwissSnapshot,
  type RoundResults,
} from "@/lib/swiss";
import { MAX_ROUNDS } from "@/data/teams";

const STORAGE_KEY = "emea-masters-swiss-summer-2026";

function loadResults(): RoundResults[] {
  if (typeof window === "undefined") return [];
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
  const [results, setResults] = useState<RoundResults[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setResults(loadResults());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(results));
  }, [results, hydrated]);

  const snapshot = useMemo(() => buildSwissSnapshot(results), [results]);

  function setWinner(roundIndex: number, matchId: string, winnerId: string) {
    setResults((prev) => {
      const next = prev.map((r) => ({ ...r }));
      while (next.length <= roundIndex) next.push({});
      // Changing an earlier round invalidates later results
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
      const next = prev.map((r) => ({ ...r }));
      if (!next[roundIndex]) return prev;
      const trimmed = next.slice(0, roundIndex + 1);
      const copy = { ...trimmed[roundIndex] };
      delete copy[matchId];
      trimmed[roundIndex] = copy;
      return trimmed;
    });
  }

  function resetRound(roundIndex: number) {
    setResults((prev) => prev.slice(0, roundIndex));
  }

  function resetAll() {
    setResults([]);
  }

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
      <header className="relative overflow-hidden rounded-xl border border-white/10 bg-[linear-gradient(135deg,rgba(232,197,71,0.12),transparent_42%),radial-gradient(ellipse_at_top_left,rgba(56,189,248,0.12),transparent_50%),linear-gradient(180deg,#142033,#0b1220)] px-5 py-7 sm:px-8">
        <div className="pointer-events-none absolute inset-0 opacity-40 [background-image:repeating-linear-gradient(90deg,transparent,transparent_47px,rgba(255,255,255,0.03)_48px)]" />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="font-[family-name:var(--font-display)] text-xs tracking-[0.28em] text-[var(--gold)] uppercase">
              EMEA Masters · Summer 2026
            </p>
            <h1 className="mt-2 max-w-2xl font-[family-name:var(--font-display)] text-4xl leading-none tracking-[0.04em] text-white uppercase sm:text-5xl">
              Swiss Matchup Calculator
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-[var(--mist)] sm:text-base">
              Pick winners each round. Next-round pairings use the FIDE Dutch
              System (SwissChess). Same-record advance seeds use Progressive
              Score, then Swiss seed.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={resetAll}
              className="border-white/20 bg-black/20 text-white hover:bg-white/10 hover:text-white"
            >
              Reset all
            </Button>
          </div>
        </div>
      </header>

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex flex-col gap-8">
          {snapshot.rounds.map((matchups, roundIndex) => {
            const pools = groupMatchupsByPool(matchups);
            const decided = matchups.filter(
              (m) => results[roundIndex]?.[m.id],
            ).length;
            return (
              <section
                key={roundIndex}
                className="round-enter rounded-xl border border-white/10 bg-black/20 p-4 sm:p-5"
                style={{ animationDelay: `${roundIndex * 40}ms` }}
              >
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="font-[family-name:var(--font-display)] text-2xl tracking-[0.08em] text-white uppercase">
                      Round {roundIndex + 1}
                    </h2>
                    <p className="text-xs text-[var(--mist)]">
                      {decided}/{matchups.length} decided
                      {roundIndex === 0
                        ? " · official Pool 0-0 pairings"
                        : " · FIDE Dutch pairings"}
                      {roundIndex + 1 <= MAX_ROUNDS
                        ? ""
                        : ""}
                    </p>
                  </div>
                  {roundIndex > 0 || decided > 0 ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => resetRound(roundIndex)}
                      className="text-[var(--mist)] hover:bg-white/10 hover:text-white"
                    >
                      Clear round {roundIndex + 1}+
                    </Button>
                  ) : null}
                </div>

                <div className="flex flex-col gap-5">
                  {pools.map((pool) => (
                    <div key={pool.pool}>
                      <h3 className="mb-2 font-[family-name:var(--font-display)] text-xs tracking-[0.2em] text-[var(--gold)] uppercase">
                        {pool.label}
                      </h3>
                      <div className="grid gap-2 md:grid-cols-2">
                        {pool.matches.map((match) => (
                          <MatchCard
                            key={match.id}
                            match={match}
                            result={results[roundIndex]?.[match.id]}
                            onPick={(winnerId) =>
                              setWinner(roundIndex, match.id, winnerId)
                            }
                            onClear={() => clearWinner(roundIndex, match.id)}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </div>

        <Standings
          standings={snapshot.standings}
          advanced={snapshot.advanced}
          eliminated={snapshot.eliminated}
        />
      </div>
    </div>
  );
}
