import { cloneOfficialRounds } from "@/lib/official";
import {
  emptyPostSwissState,
  type KoPairing,
  type PostSwissState,
  type Ro16Assignments,
} from "@/lib/playoffs";
import type { MatchResult, RoundResults } from "@/lib/swiss";

export const BOARD_STORAGE_KEY = "emea-masters-swiss-summer-2026-v4";
const LEGACY_SWISS_KEY = "emea-masters-swiss-summer-2026-v3";
const LEGACY_POST_KEY = "emea-masters-post-swiss-summer-2026-v1";

export type StoredBoard = {
  swiss: RoundResults[];
  post: PostSwissState;
};

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

function sanitizeResults(v: unknown): Record<string, MatchResult> {
  if (!isPlainObject(v)) return {};
  const out: Record<string, MatchResult> = {};
  for (const [k, val] of Object.entries(v)) {
    if (!isPlainObject(val)) continue;
    const winnerId = val.winnerId;
    if (typeof winnerId === "string" && winnerId.length > 0) {
      out[k] = { winnerId };
    }
  }
  return out;
}

function sanitizeAssignments(v: unknown): Ro16Assignments {
  if (!isPlainObject(v)) return {};
  const out: Ro16Assignments = {};
  for (const [k, val] of Object.entries(v)) {
    if (typeof val === "string" && val.length > 0) out[k] = val;
  }
  return out;
}

function sanitizeKoPairings(v: unknown): KoPairing[] {
  if (!Array.isArray(v)) return [];
  const out: KoPairing[] = [];
  for (const item of v) {
    if (!isPlainObject(item)) continue;
    const matchId = item.matchId;
    const label = item.label;
    const swissTeamId = item.swissTeamId;
    if (
      typeof matchId !== "string" ||
      typeof label !== "string" ||
      typeof swissTeamId !== "string"
    ) {
      continue;
    }
    const invite =
      item.inviteTeamId == null
        ? null
        : typeof item.inviteTeamId === "string"
          ? item.inviteTeamId
          : null;
    out.push({
      matchId,
      label,
      swissTeamId,
      inviteTeamId: invite,
    });
  }
  return out;
}

/** Coerce unknown localStorage post into a safe PostSwissState. */
export function sanitizePost(raw: unknown): PostSwissState {
  const empty = emptyPostSwissState();
  if (!isPlainObject(raw)) return empty;
  return {
    koPairings: sanitizeKoPairings(raw.koPairings),
    koResults: sanitizeResults(raw.koResults),
    ro16Assignments: sanitizeAssignments(raw.ro16Assignments),
    ro16Results: sanitizeResults(raw.ro16Results),
    qfResults: sanitizeResults(raw.qfResults),
    sfResults: sanitizeResults(raw.sfResults),
    finalResults: sanitizeResults(raw.finalResults),
  };
}

function sanitizeSwiss(raw: unknown): RoundResults[] | null {
  if (!Array.isArray(raw)) return null;
  return raw.map((round) => sanitizeResults(round));
}

export function loadBoard(): StoredBoard {
  if (typeof window === "undefined") {
    return { swiss: [], post: emptyPostSwissState() };
  }
  try {
    const raw = window.localStorage.getItem(BOARD_STORAGE_KEY);
    if (raw != null) {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) {
        const swiss = sanitizeSwiss(parsed) ?? [];
        return { swiss, post: emptyPostSwissState() };
      }
      if (isPlainObject(parsed) && Array.isArray(parsed.swiss)) {
        return {
          swiss: sanitizeSwiss(parsed.swiss) ?? [],
          post: sanitizePost(parsed.post),
        };
      }
    }
    const legacy = window.localStorage.getItem(LEGACY_SWISS_KEY);
    if (legacy) {
      const swiss = sanitizeSwiss(JSON.parse(legacy));
      if (swiss) return { swiss, post: emptyPostSwissState() };
    }
  } catch {
    /* fall through */
  }
  return { swiss: cloneOfficialRounds(), post: emptyPostSwissState() };
}

export function saveBoard(board: StoredBoard) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    BOARD_STORAGE_KEY,
    JSON.stringify({
      swiss: board.swiss,
      post: sanitizePost(board.post),
    } satisfies StoredBoard),
  );
  window.localStorage.removeItem(LEGACY_POST_KEY);
}
