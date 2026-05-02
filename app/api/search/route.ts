import { db } from "@/lib/db";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const q = (new URL(req.url).searchParams.get("q") ?? "").trim().slice(0, 100);
  if (q.length < 2) return Response.json({ results: [] });

  try {
    const { rows } = await db.query(
      `SELECT village_name, district_name, state_name, slug,
              population_2011, road_comp_year,
              similarity(village_name, $1) AS sim
       FROM villages
       WHERE village_name % $1 OR district_name % $1
       ORDER BY sim DESC
       LIMIT 10`,
      [q]
    );
    return Response.json({ results: rows });
  } catch (err) {
    console.error("Search error:", err);
    return Response.json({ error: "Search unavailable" }, { status: 503 });
  }
}
