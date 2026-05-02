import { db } from "@/lib/db";
import { NextRequest } from "next/server";

function unslugify(s: string) {
  return s.replace(/-/g, " ");
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  const { slug } = await params;
  if (slug.length < 2) return Response.json({ error: "Invalid slug" }, { status: 400 });

  const stateName   = unslugify(slug[0]);
  const districtName = unslugify(slug[1]);

  try {
    // All villages in this district with the fields we need
    const { rows: villages } = await db.query(
      `SELECT
         shrid, village_name, slug,
         road_comp_year, population_2011,
         nl_growth_pct, nl_pre_road_avg, nl_post_road_avg,
         has_primary_school, has_electricity_dom,
         literacy_rate, est_consumption_monthly,
         state_name, district_name
       FROM villages
       WHERE LOWER(district_name) = LOWER($1)
         AND LOWER(state_name)   = LOWER($2)
       ORDER BY road_comp_year ASC NULLS LAST, village_name ASC`,
      [districtName, stateName]
    );

    if (!villages.length) {
      return Response.json({ error: "District not found" }, { status: 404 });
    }

    // Group by year
    const byYear: Record<number, typeof villages> = {};
    let noYearVillages: typeof villages = [];

    for (const v of villages) {
      if (v.road_comp_year == null) {
        noYearVillages.push(v);
      } else {
        const yr = Number(v.road_comp_year);
        if (!byYear[yr]) byYear[yr] = [];
        byYear[yr].push(v);
      }
    }

    const yearBreakdown = Object.entries(byYear)
      .map(([year, vs]) => ({ year: Number(year), count: vs.length, villages: vs }))
      .sort((a, b) => a.year - b.year);

    // Summary stats
    const total = villages.length;
    const withSchool = villages.filter((v) => v.has_primary_school).length;
    const withElec   = villages.filter((v) => v.has_electricity_dom).length;
    const growths    = villages
      .map((v) => Number(v.nl_growth_pct))
      .filter((n) => !isNaN(n) && isFinite(n));
    const medianGrowth = growths.length
      ? growths.sort((a, b) => a - b)[Math.floor(growths.length / 2)]
      : null;
    const years = yearBreakdown.map((y) => y.year);

    const summary = {
      district_name: villages[0].district_name,
      state_name:    villages[0].state_name,
      total_villages: total,
      year_range: years.length ? { from: years[0], to: years[years.length - 1] } : null,
      pct_with_school: total ? Math.round((withSchool / total) * 100) : null,
      pct_with_electricity: total ? Math.round((withElec / total) * 100) : null,
      median_nl_growth_pct: medianGrowth != null ? Number(medianGrowth.toFixed(1)) : null,
      villages_no_year: noYearVillages.length,
    };

    return Response.json({ summary, yearBreakdown });
  } catch (err) {
    console.error("District fetch error:", err);
    return Response.json({ error: "Data unavailable" }, { status: 503 });
  }
}
