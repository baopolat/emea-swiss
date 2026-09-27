"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { MatchCard } from "@/components/MatchCard";
import { FinalResultsColumn } from "@/components/FinalResultsColumn";
import { groupMatchupsByPool } from "@/lib/brackets";
import {
  OFFICIAL_GAMES,
  OFFICIAL_POLL_MS,
  cloneOfficialRounds,
  higherSeedWinner,
  mergeOfficialIntoUserResults,
  officialWinnerForMatch,
  randomWinner,
  type OfficialGame,
  type OfficialResultsFile,
} from "@/lib/official";
import {
  buildSwissSnapshot,
  isRoundComplete,
  type Matchup,
  type RoundResults,
} from "@/lib/swiss";

const STORAGE_KEY = "emea-masters-swiss-summer-2026-v3";

function loadResults(): RoundResults[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw == null) return cloneOfficialRounds();
    const parsed = JSON.parse(raw) as RoundResults[];
    return Array.isArray(parsed) ? parsed : cloneOfficialRounds();
  } catch {
    return cloneOfficialRounds();
  }
}

export function SwissBoard() {
  const [results, setResults] = useState<RoundResults[] | null>(null);
  const [officialGames, setOfficialGames] =
    useState<OfficialGame[]>(OFFICIAL_GAMES);
  const [officialSyncedAt, setOfficialSyncedAt] = useState<string | null>(
    null,
  );

  useEffect(() => {
    setResults(loadResults());
  }, []);

  useEffect(() => {
    if (results === null) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(results));
  }, [results]);

  useEffect(() => {
    let cancelled = false;

    async function refreshOfficial() {
      try {
        const res = await fetch("/api/official-results", {
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = (await res.json()) as OfficialResultsFile & {
          source?: string;
        };
        if (cancelled || !Array.isArray(data.games)) return;

        setOfficialGames(data.games);
        setOfficialSyncedAt(data.fetchedAt ?? new Date().toISOString());
        setResults((prev) => {
          const base = prev ?? [];
          // First visit / empty board → full official snapshot
          if (base.length === 0 && data.games.length > 0) {
            return cloneOfficialRounds(data.games);
          }
          return mergeOfficialIntoUserResults(base, data.games);
        });
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
    setResults(cloneOfficialRounds(officialGames));
  }

  function fillRound(
    roundIndex: number,
    matchups: Matchup[],
    pick: (match: Matchup) => string,
  ) {
    setResults((prev) => {
      const base = prev ?? [];
      const next = base.map((r) => ({ ...r }));
      while (next.length <= roundIndex) next.push({});
      const existing = { ...next[roundIndex] };
      let changed = false;
      for (const match of matchups) {
        if (existing[match.id]) continue;
        existing[match.id] = { winnerId: pick(match) };
        changed = true;
      }
      if (!changed) return base;
      // Keep prior rounds; drop later ones so pairings rebuild from this fill
      const trimmed = next.slice(0, roundIndex + 1);
      trimmed[roundIndex] = existing;
      return trimmed;
    });
  }

  /** Restore Leaguepedia winners for matches that have official results. */
  function fillOfficialRound(roundIndex: number, matchups: Matchup[]) {
    setResults((prev) => {
      const base = prev ?? [];
      const next = base.map((r) => ({ ...r }));
      while (next.length <= roundIndex) next.push({});
      const existing = { ...next[roundIndex] };
      let changed = false;
      for (const match of matchups) {
        const official = officialWinnerForMatch(match, officialGames);
        if (!official) continue;
        if (existing[match.id]?.winnerId === official) continue;
        existing[match.id] = { winnerId: official };
        changed = true;
      }
      if (!changed) return base;
      const trimmed = next.slice(0, roundIndex + 1);
      trimmed[roundIndex] = existing;
      return trimmed;
    });
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
    <div className="flex h-dvh flex-col overflow-hidden">
      <header className="relative z-20 shrink-0 border-b border-[#1e2838] bg-[#070b12]/90 backdrop-blur-xl">
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[#2ecc71]/35 to-transparent" />
        <div className="mx-auto flex w-full max-w-[1920px] items-center justify-between gap-2 px-3 py-2 sm:px-4">
          <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logos/emea-masters.png"
              alt="EMEA Masters"
              className="h-8 w-auto shrink-0 object-contain sm:h-9"
            />
            <div className="min-w-0">
              <p className="truncate text-[8px] font-bold tracking-[0.2em] text-[#2ecc71] uppercase sm:text-[9px]">
                Summer 2026
              </p>
              <h1 className="font-[family-name:var(--font-display)] text-[1.2rem] leading-none tracking-[0.06em] text-white uppercase sm:text-[1.35rem]">
                Swiss Stage
              </h1>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            {boardStats && (
              <div className="hidden items-center gap-2.5 rounded-lg border border-[#243044] bg-[#0e141d]/80 px-2.5 py-1.5 md:flex">
                <Stat label="Round" value={`${boardStats.rounds}`} />
                <span className="h-5 w-px bg-[#243044]" />
                <Stat label="Decided" value={`${boardStats.decidedMatches}`} />
                <span className="h-5 w-px bg-[#243044]" />
                <Stat
                  label="Adv / Out"
                  value={`${boardStats.advanced}/${boardStats.eliminated}`}
                  accent
                />
              </div>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={resetAll}
              className="h-7 border-[#334155] bg-[#121820] px-2.5 text-xs text-white hover:border-[#475569] hover:bg-[#1a2331] hover:text-white"
            >
              Reset all
            </Button>
          </div>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-x-auto overflow-y-hidden px-2 py-2 sm:px-3">
        <div className="flex h-full min-h-0 w-max min-w-full items-stretch gap-2">
          {snapshot.rounds.map((matchups, roundIndex) => {
            const pools = groupMatchupsByPool(matchups);
            const decided = matchups.filter(
              (m) => results[roundIndex]?.[m.id],
            ).length;
            const complete = isRoundComplete(matchups, results[roundIndex]);
            const progress = matchups.length
              ? decided / matchups.length
              : 0;
            // Wide 2-col layout for dense early rounds; keep width stable when R4+ appears
            const dense = matchups.length >= 10;
            const colWidth = dense ? "w-[340px]" : "w-[200px]";

            return (
              <section
                key={roundIndex}
                className={`round-enter flex h-full min-h-0 shrink-0 flex-col gap-1 ${colWidth}`}
                style={{ animationDelay: `${roundIndex * 40}ms` }}
              >
                <div className="shrink-0 overflow-hidden rounded-lg border border-[#2a3548] bg-[#0e141d] px-2 py-1.5">
                  <div className="flex items-center justify-between gap-1">
                    <h2 className="font-[family-name:var(--font-display)] text-[0.85rem] leading-none tracking-[0.06em] text-white uppercase">
                      R{roundIndex + 1}
                    </h2>
                    <span
                      className={
                        complete
                          ? "rounded bg-[#2ecc71]/15 px-1.5 py-px text-[9px] font-bold text-[#2ecc71]"
                          : "rounded bg-white/5 px-1.5 py-px text-[9px] font-semibold tabular-nums text-[#8b97ab]"
                      }
                    >
                      {decided}/{matchups.length}
                    </span>
                  </div>

                  <div className="mt-1.5 h-0.5 overflow-hidden rounded-full bg-[#1a2230]">
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

                  <div className="mt-1.5 flex flex-wrap gap-1">
                    <button
                      type="button"
                      onClick={() =>
                        fillRound(roundIndex, matchups, randomWinner)
                      }
                      className="rounded border border-[#2a3548] bg-[#121820] px-1.5 py-0.5 text-[9px] font-semibold text-[#c5cedd] transition-colors hover:border-[#3d4d66] hover:text-white"
                    >
                      Random
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        fillRound(roundIndex, matchups, higherSeedWinner)
                      }
                      className="rounded border border-[#2a3548] bg-[#121820] px-1.5 py-0.5 text-[9px] font-semibold text-[#c5cedd] transition-colors hover:border-[#3d4d66] hover:text-white"
                    >
                      Higher seed
                    </button>
                    {matchups.some(
                      (m) => officialWinnerForMatch(m, officialGames),
                    ) && (
                      <button
                        type="button"
                        onClick={() => fillOfficialRound(roundIndex, matchups)}
                        className="rounded border border-[#2ecc71]/30 bg-[#121820] px-1.5 py-0.5 text-[9px] font-semibold text-[#2ecc71] transition-colors hover:border-[#2ecc71]/55 hover:bg-[#0f1a14] hover:text-[#3dd68c]"
                      >
                        Official
                      </button>
                    )}
                    {(roundIndex > 0 || decided > 0) && (
                      <button
                        type="button"
                        onClick={() => resetRound(roundIndex)}
                        className="rounded px-1 py-0.5 text-[9px] text-[#5c6b82] underline-offset-2 transition-colors hover:text-white hover:underline"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto overflow-x-hidden">
                  {pools.map((pool) => (
                    <div
                      key={pool.pool}
                      className="flex shrink-0 flex-col gap-0.5"
                    >
                      <h3 className="flex shrink-0 items-center gap-1 px-0.5 text-[9px] font-bold tracking-[0.14em] text-[#d4a84b] uppercase">
                        <span className="h-px flex-1 bg-gradient-to-r from-[#d4a84b]/35 to-transparent" />
                        <span>{pool.label}</span>
                        <span className="h-px flex-1 bg-gradient-to-l from-[#d4a84b]/35 to-transparent" />
                      </h3>
                      <div
                        className={
                          dense
                            ? "grid grid-cols-2 gap-0.5"
                            : "grid grid-cols-1 gap-0.5"
                        }
                      >
                        {pool.matches.map((match) => (
                          <MatchCard
                            key={match.id}
                            match={match}
                            result={results[roundIndex]?.[match.id]}
                            officialWinnerId={officialWinnerForMatch(
                              match,
                              officialGames,
                            )}
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
                </div>
              </section>
            );
          })}

          <FinalResultsColumn standings={snapshot.standings} />
        </div>
      </div>

      <footer className="relative z-30 shrink-0 border-t border-[#1e2838] px-3 py-1.5 text-[10px] text-[#5c6b82] sm:px-4">
        <div className="mx-auto flex w-full max-w-[1920px] items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1 leading-snug">
            <span className="truncate">
              Official shortcodes · Leaguepedia sync
              {officialSyncedAt
                ? ` · ${new Date(officialSyncedAt).toLocaleTimeString()}`
                : ""}
            </span>
            <span className="shrink-0">·</span>
            <span className="group relative shrink-0">
              <button
                type="button"
                className="cursor-help border-b border-dotted border-[#5c6b82]/70 text-[#5c6b82] transition-colors hover:border-[#8b97ab] hover:text-[#8b97ab] focus-visible:border-[#8b97ab] focus-visible:text-[#8b97ab] focus-visible:outline-none"
                aria-describedby="tiebreak-rules"
              >
                Tiebreaks
              </button>
              <span
                id="tiebreak-rules"
                role="tooltip"
                className="pointer-events-none absolute bottom-full left-0 z-50 mb-2 w-56 rounded-md border border-[#2a3448] bg-[#0e1522] px-2.5 py-2 text-left text-[10px] leading-relaxed whitespace-normal text-[#8b97ab] opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
              >
                <span className="mb-1 block font-semibold tracking-wide text-white uppercase">
                  Tiebreaker rules
                </span>
                <ol className="list-decimal space-y-0.5 pl-3.5">
                  <li>
                    Progressive Score — earlier wins are worth more (R1 = 7 … R7
                    = 1)
                  </li>
                  <li>Seed — better (lower) seed ranks higher</li>
                </ol>
              </span>
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-0.5">
            <a
              href="https://github.com/baopolat"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="GitHub profile"
              className="inline-flex size-6 items-center justify-center rounded text-[#6b7a91] transition-colors hover:bg-white/5 hover:text-white"
            >
              <svg
                viewBox="0 0 24 24"
                className="size-3.5 fill-current"
                aria-hidden
              >
                <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.385-1.335-1.755-1.335-1.755-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
              </svg>
            </a>
            <a
              href="https://ko-fi.com/baopolat"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Ko-fi"
              className="inline-flex size-6 items-center justify-center rounded text-[#6b7a91] transition-colors hover:bg-white/5 hover:text-white"
            >
              <svg
                viewBox="0 0 24 24"
                className="size-3.5 fill-current"
                aria-hidden
              >
                <path d="M11.351 2.715c-2.7 0-4.986.025-6.83.26C2.078 3.285 0 5.154 0 8.61c0 3.506.182 6.13 1.585 8.493 1.584 2.701 4.233 4.182 7.662 4.182h.83c4.209 0 6.494-2.234 7.637-4a9.5 9.5 0 0 0 1.091-2.338C21.792 14.688 24 12.22 24 9.208v-.415c0-3.247-2.13-5.507-5.792-5.87-1.558-.156-2.65-.208-6.857-.208m0 1.947c4.208 0 5.09.052 6.571.182 2.624.311 4.13 1.584 4.13 4v.39c0 2.156-1.792 3.844-3.87 3.844h-.935l-.156.649c-.208 1.013-.597 1.818-1.039 2.546-.909 1.428-2.545 3.064-5.922 3.064h-.805c-2.571 0-4.831-.883-6.078-3.195-1.09-2-1.298-4.155-1.298-7.506 0-2.181.857-3.402 3.012-3.714 1.533-.233 3.559-.26 6.39-.26m6.547 2.287c-.416 0-.65.234-.65.546v2.935c0 .311.234.545.65.545 1.324 0 2.051-.754 2.051-2s-.727-2.026-2.052-2.026m-10.39.182c-1.818 0-3.013 1.48-3.013 3.142 0 1.533.858 2.857 1.949 3.897.727.701 1.87 1.429 2.649 1.896a1.47 1.47 0 0 0 1.507 0c.78-.467 1.922-1.195 2.623-1.896 1.117-1.039 1.974-2.364 1.974-3.897 0-1.662-1.247-3.142-3.039-3.142-1.065 0-1.792.545-2.338 1.298-.493-.753-1.246-1.298-2.312-1.298" />
              </svg>
            </a>
          </div>
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
    <div className="min-w-[2.75rem]">
      <p className="text-[8px] font-semibold tracking-[0.12em] text-[#6b7a91] uppercase">
        {label}
      </p>
      <p
        className={
          accent
            ? "text-xs font-bold tabular-nums text-[#2ecc71]"
            : "text-xs font-bold tabular-nums text-white"
        }
      >
        {value}
      </p>
    </div>
  );
}
