import { unstable_cache } from "next/cache";
import { NextResponse } from "next/server";
import staticOfficial from "@/data/official-results.json";
import { fetchLeaguepediaGames, OVERVIEW_PAGE } from "@/lib/leaguepedia";
import {
  mergeOfficialGameLists,
  type OfficialResultsFile,
} from "@/lib/official";

export const runtime = "nodejs";

const POLL_SECONDS = 300;
const staticFile = staticOfficial as OfficialResultsFile;

const getCachedLeaguepedia = unstable_cache(
  async () => fetchLeaguepediaGames(),
  ["leaguepedia-official-results", OVERVIEW_PAGE],
  { revalidate: POLL_SECONDS },
);

export async function GET() {
  try {
    const live = await getCachedLeaguepedia();
    const games = mergeOfficialGameLists(live.games, staticFile.games ?? []);
    const body: OfficialResultsFile & { source: string } = {
      fetchedAt: new Date().toISOString(),
      overviewPage: live.overviewPage,
      games,
      rounds: [],
      source: "leaguepedia",
    };
    return NextResponse.json(body, {
      headers: {
        "Cache-Control": `public, s-maxage=${POLL_SECONDS}, stale-while-revalidate=60`,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "fetch failed";
    console.error("official-results API:", message);
    return NextResponse.json(
      {
        ...staticFile,
        source: "static",
        error: message,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=30",
        },
      },
    );
  }
}
