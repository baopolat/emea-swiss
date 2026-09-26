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

  const boardStats = useMemo(() => {
    if (!snapshot || results === null) return null;
    const decidedMatches = results.reduce(
      (sum, round) => sum + Object.keys(round).length,
      0,
    );
    const advanced = snapshot.standings.filter(
      (s) => s.status === "advanced",
    ).length;
    const eliminated = snapshot.standings.filter(
      (s) => s.status === "eliminated",
    ).length;
    return {
      rounds: snapshot.rounds.length,
      decidedMatches,
      advanced,
      eliminated,
    };
  }, [snapshot, results]);

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
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-[#8b97ab]">
        <div className="size-8 animate-pulse rounded-lg bg-[#2ecc71]/20" />
        <p className="text-sm tracking-wide">Loading Swiss board…</p>
      </div>
    );
  }

  return (
    <div className="flex h-dvh flex-col">
      <header className="relative z-20 shrink-0 border-b border-[#1e2838] bg-[#070b12]/90 backdrop-blur-xl">
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[#2ecc71]/35 to-transparent" />
        <div className="mx-auto flex w-full max-w-[1700px] items-center justify-between gap-3 px-4 py-3 sm:gap-4 sm:px-6 sm:py-3.5">
          <div className="flex min-w-0 items-center gap-3 sm:gap-3.5">
            <div className="relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#2ecc71] shadow-[0_0_24px_-4px_rgba(46,204,113,0.55)] sm:size-11">
              <span className="font-[family-name:var(--font-display)] text-[1.2rem] leading-none tracking-[0.04em] text-[#04150c] sm:text-[1.35rem]">
                EM
              </span>
              <span className="absolute inset-x-0 bottom-0 h-px bg-white/30" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-[9px] font-bold tracking-[0.22em] text-[#2ecc71] uppercase sm:text-[10px] sm:tracking-[0.28em]">
                EMEA Masters · Summer 2026
              </p>
              <h1 className="font-[family-name:var(--font-display)] text-[1.55rem] leading-none tracking-[0.06em] text-white uppercase sm:text-[2.1rem]">
                Swiss Stage
              </h1>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-3 sm:gap-4">
            {boardStats && (
              <div className="hidden items-center gap-3 rounded-xl border border-[#243044] bg-[#0e141d]/80 px-3 py-2 md:flex">
                <Stat label="Round" value={`${boardStats.rounds}`} />
                <span className="h-6 w-px bg-[#243044]" />
                <Stat label="Decided" value={`${boardStats.decidedMatches}`} />
                <span className="h-6 w-px bg-[#243044]" />
                <Stat
                  label="Adv / Out"
                  value={`${boardStats.advanced}/${boardStats.eliminated}`}
                  accent
                />
              </div>
            )}
            <p className="hidden max-w-[13rem] text-right text-[11px] leading-snug text-[#6b7a91] xl:block">
              Tap a shortcode to pick. Next round unlocks when all matches are
              set · same-record pools
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={resetAll}
              className="h-9 border-[#334155] bg-[#121820] px-3 text-white hover:border-[#475569] hover:bg-[#1a2331] hover:text-white sm:h-8"
            >
              Reset all
            </Button>
          </div>
        </div>

        {boardStats && (
          <div className="mx-auto flex w-full max-w-[1700px] items-center justify-between gap-2 border-t border-[#1e2838]/80 px-4 py-2 md:hidden sm:px-6">
            <Stat label="Round" value={`${boardStats.rounds}`} />
            <span className="h-6 w-px bg-[#243044]" />
            <Stat label="Decided" value={`${boardStats.decidedMatches}`} />
            <span className="h-6 w-px bg-[#243044]" />
            <Stat
              label="Adv / Out"
              value={`${boardStats.advanced}/${boardStats.eliminated}`}
              accent
            />
          </div>
        )}
      </header>

      <div className="mx-auto w-full max-w-[1700px] min-h-0 flex-1 overflow-auto px-4 py-4 sm:px-6 sm:py-6">
        <div className="flex flex-col items-stretch gap-6 pb-10 lg:min-w-max lg:flex-row lg:items-start lg:gap-5">
          {snapshot.rounds.map((matchups, roundIndex) => {
            const pools = groupMatchupsByPool(matchups);
            const decided = matchups.filter(
              (m) => results[roundIndex]?.[m.id],
            ).length;
            const complete = isRoundComplete(matchups, results[roundIndex]);
            const isLatest = roundIndex === snapshot.rounds.length - 1;
            const progress = matchups.length
              ? decided / matchups.length
              : 0;

            return (
              <section
                key={roundIndex}
                className="round-enter flex w-full flex-col gap-3.5 lg:w-[280px] lg:shrink-0"
                style={{ animationDelay: `${roundIndex * 50}ms` }}
              >
                <div className="sticky top-0 z-10 overflow-hidden rounded-xl border border-[#2a3548] bg-[#0e141d] px-3.5 py-3 shadow-[0_12px_24px_-12px_rgba(0,0,0,0.85)]">
                  <div className="flex items-baseline justify-between gap-2">
                    <h2 className="font-[family-name:var(--font-display)] text-[1.15rem] leading-none tracking-[0.08em] text-white uppercase">
                      Round {roundIndex + 1}
                    </h2>
                    <span
                      className={
                        complete
                          ? "rounded-md bg-[#2ecc71]/15 px-2 py-0.5 text-[10px] font-bold text-[#2ecc71]"
                          : "rounded-md bg-white/5 px-2 py-0.5 text-[10px] font-semibold tabular-nums text-[#8b97ab]"
                      }
                    >
                      {decided}/{matchups.length}
                    </span>
                  </div>

                  <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-[#1a2230]">
                    <div
                      key={`${roundIndex}-${decided}`}
                      className={
                        complete
                          ? "progress-fill h-full rounded-full bg-[#2ecc71]"
                          : "progress-fill h-full rounded-full bg-[#d4a84b]"
                      }
                      style={{ width: `${Math.max(progress * 100, 4)}%` }}
                    />
                  </div>

                  <p className="mt-2 text-[10px] leading-snug text-[#6b7a91]">
                    {roundIndex === 0
                      ? "Official 0-0 seed pairings"
                      : complete
                        ? "Complete · next stage unlocked"
                        : isLatest
                          ? "Finish all matches to unlock next"
                          : "Same-record pool pairings"}
                  </p>
                  {(roundIndex > 0 || decided > 0) && (
                    <button
                      type="button"
                      onClick={() => resetRound(roundIndex)}
                      className="mt-1.5 min-h-8 text-[10px] text-[#5c6b82] underline-offset-2 transition-colors hover:text-white hover:underline"
                    >
                      Clear from here
                    </button>
                  )}
                </div>

                {pools.map((pool) => (
                  <div key={pool.pool} className="flex flex-col gap-2">
                    <h3 className="flex items-center gap-2 px-1 text-[11px] font-bold tracking-[0.18em] text-[#d4a84b] uppercase">
                      <span className="h-px flex-1 bg-gradient-to-r from-[#d4a84b]/35 to-transparent" />
                      <span>{pool.label}</span>
                      <span className="h-px flex-1 bg-gradient-to-l from-[#d4a84b]/35 to-transparent" />
                    </h3>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-1">
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

      <footer className="shrink-0 border-t border-[#1e2838] px-4 py-3 text-[11px] text-[#5c6b82] sm:px-6 sm:py-3.5">
        <div className="mx-auto flex w-full max-w-[1700px] flex-col gap-1 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-2">
          <span className="leading-snug">
            Official shortcodes · Logos from Leaguepedia · Progressive Score
            (R1=7 … R7=1) then Swiss seed
          </span>
          <span className="text-[#4a5568]">
            Qual/elim pools Bo3 · otherwise Bo1
          </span>
        </div>
      </footer>
    </div>
  );
}

function Stat({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="min-w-[3.25rem]">
      <p className="text-[9px] font-semibold tracking-[0.14em] text-[#6b7a91] uppercase">
        {label}
      </p>
      <p
        className={
          accent
            ? "mt-0.5 text-sm font-bold tabular-nums text-[#2ecc71]"
            : "mt-0.5 text-sm font-bold tabular-nums text-white"
        }
      >
        {value}
      </p>
    </div>
  );
}
