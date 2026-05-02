import { db } from "@/lib/db";

/**
 * Server-side event tracker.
 * Inserts directly into analytics_events — never throws.
 */
export async function track(
  event: string,
  properties: Record<string, unknown> = {},
  sessionId?: string | null
) {
  try {
    await db.query(
      `INSERT INTO analytics_events (event, session_id, properties)
       VALUES ($1, $2, $3)`,
      [event, sessionId ?? null, JSON.stringify(properties)]
    );
  } catch {
    // telemetry is fire-and-forget — never break the UX
  }
}
