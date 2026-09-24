import { MAX_ROUNDS } from "@/data/teams";

/** Progressive Score: round R win awards (MAX_ROUNDS + 1 - R) points. */
export function pointsForRoundWin(round: number): number {
  if (round < 1 || round > MAX_ROUNDS) return 0;
  return MAX_ROUNDS + 1 - round;
}

/** Sum Progressive Score from 1-indexed rounds where the team won. */
export function progressiveScore(winRounds: number[]): number {
  return winRounds.reduce((sum, round) => sum + pointsForRoundWin(round), 0);
}
