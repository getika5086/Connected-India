import { track } from "@/lib/telemetry";
import { NextRequest } from "next/server";

// Allowlist of events clients are permitted to send
const ALLOWED_EVENTS = new Set([
  "village_view",
  "search_query",
  "search_click",
  "surprise_me",
  "curated_click",
  "compare_view",
  "share_click",
  "district_view",
  "state_view",
  "leaderboard_view",
]);

export async function POST(req: NextRequest) {
  try {
    const { event, properties = {}, session_id } = await req.json();
    if (!event || !ALLOWED_EVENTS.has(event)) return Response.json({ ok: true });
    await track(event, properties, session_id);
  } catch {
    // silent
  }
  return Response.json({ ok: true });
}
