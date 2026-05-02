import { db } from "@/lib/db";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { session_id, shrid, village_name, district_name, referrer } = body;
    if (!session_id || !shrid) return Response.json({ ok: true });

    await db.query(
      `INSERT INTO village_views (session_id, shrid, village_name, district_name, referrer)
       VALUES ($1, $2, $3, $4, $5)`,
      [session_id, shrid, village_name ?? "", district_name ?? "", referrer ?? null]
    );
  } catch {
    // silent — analytics never breaks the UX
  }
  return Response.json({ ok: true });
}
