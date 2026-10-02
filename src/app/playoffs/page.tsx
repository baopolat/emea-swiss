import { PlayoffsBoard } from "@/components/PlayoffsBoard";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "EMEA Masters Playoffs",
  description:
    "Knockout matches and single-elimination playoff bracket for EMEA Masters Summer 2026.",
};

export default function PlayoffsPage() {
  return <PlayoffsBoard />;
}
