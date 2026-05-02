import { db } from "@/lib/db";
import { NextRequest } from "next/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  const { slug } = await params;
  const fullSlug = Array.isArray(slug) ? slug.join("/") : slug;

  try {
    const { rows: vRows } = await db.query(
      `SELECT * FROM villages WHERE slug = $1 LIMIT 1`,
      [fullSlug]
    );
    if (!vRows.length) return Response.json({ error: "Not found" }, { status: 404 });

    const village = vRows[0];
    const shrid = village.shrid;

    const [nlRes, ecRes, distRes] = await Promise.all([
      db.query(
        `SELECT year, luminosity FROM night_lights WHERE shrid = $1 ORDER BY year`,
        [shrid]
      ),
      db.query(
        `SELECT ec_year, total_establishments FROM economic_census WHERE shrid = $1 ORDER BY ec_year`,
        [shrid]
      ),
      db.query(
        `SELECT median_light_growth_pct, median_literacy_rate, median_consumption
         FROM district_summaries WHERE district_name = $1 AND state_name = $2 LIMIT 1`,
        [village.district_name, village.state_name]
      ),
    ]);

    return Response.json({
      village,
      nightLights: nlRes.rows,
      economicCensus: ecRes.rows,
      districtSummary: distRes.rows[0] ?? null,
    });
  } catch (err) {
    console.error("Village fetch error:", err);
    return Response.json({ error: "Data unavailable" }, { status: 503 });
  }
}
