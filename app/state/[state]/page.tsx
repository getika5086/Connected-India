import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { track } from "@/lib/telemetry";

function tc(s: string) {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}
function fmt(n: number | null) {
  if (n == null) return "—";
  return Number(n).toLocaleString("en-IN");
}
function districtSlug(stateName: string, districtName: string) {
  return `${stateName.replace(/ /g, "-")}/${districtName.replace(/ /g, "-")}`;
}

interface DistrictRow {
  district_name: string;
  total_villages: number;
  connected: number;
  avg_light_growth: number | null;
  median_road_year: number | null;
  total_pop: number | null;
}

interface StateSummary {
  state_name: string;
  total_villages: number;
  connected: number;
  avg_light_growth: number | null;
  median_road_year: number | null;
  total_pop: number | null;
}

async function getStateData(stateSlug: string): Promise<{
  summary: StateSummary;
  districts: DistrictRow[];
} | null> {
  const stateName = stateSlug.replace(/-/g, " ");

  const [summaryRes, districtRes] = await Promise.all([
    db.query<StateSummary>(`
      SELECT
        state_name,
        COUNT(*)                                                                       AS total_villages,
        SUM(CASE WHEN road_comp_year IS NOT NULL THEN 1 ELSE 0 END)                   AS connected,
        ROUND(AVG(CASE WHEN nl_growth_pct IS NOT NULL
                        AND nl_post_road_years >= 3 THEN nl_growth_pct END)::numeric, 1)
                                                                                       AS avg_light_growth,
        ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY road_comp_year)::numeric)   AS median_road_year,
        SUM(population_2011)                                                           AS total_pop
      FROM villages
      WHERE LOWER(state_name) = LOWER($1)
      GROUP BY state_name
    `, [stateName]),
    db.query<DistrictRow>(`
      SELECT
        district_name,
        COUNT(*)                                                                       AS total_villages,
        SUM(CASE WHEN road_comp_year IS NOT NULL THEN 1 ELSE 0 END)                   AS connected,
        ROUND(AVG(CASE WHEN nl_growth_pct IS NOT NULL
                        AND nl_post_road_years >= 3 THEN nl_growth_pct END)::numeric, 1)
                                                                                       AS avg_light_growth,
        ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY road_comp_year)::numeric)   AS median_road_year,
        SUM(population_2011)                                                           AS total_pop
      FROM villages
      WHERE LOWER(state_name) = LOWER($1)
      GROUP BY district_name
      ORDER BY connected DESC
    `, [stateName]),
  ]);

  if (summaryRes.rows.length === 0) return null;
  return { summary: summaryRes.rows[0], districts: districtRes.rows };
}

function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden shrink-0">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span>{value}</span>
    </div>
  );
}

export default async function StatePage({
  params,
}: {
  params: Promise<{ state: string }>;
}) {
  const { state: stateSlug } = await params;
  const data = await getStateData(stateSlug);
  if (!data) notFound();

  track("state_view", { state: stateSlug });

  const { summary: s, districts } = data;
  const stateName = tc(s.state_name);

  const maxConnected    = Math.max(...districts.map((d) => Number(d.connected)));
  const maxLightGrowth  = Math.max(...districts.map((d) => d.avg_light_growth != null ? Number(d.avg_light_growth) : 0));

  // Top performers for spotlight cards
  const byLight   = [...districts].filter((d) => d.avg_light_growth != null).sort((a, b) => Number(b.avg_light_growth) - Number(a.avg_light_growth));
  const byEarliest = [...districts].filter((d) => d.median_road_year != null).sort((a, b) => Number(a.median_road_year) - Number(b.median_road_year));

  return (
    <div className="min-h-screen bg-white">

      {/* Nav */}
      <nav className="border-b border-gray-100 px-4 py-3 flex items-center gap-2 text-sm text-gray-500">
        <Link href="/" className="hover:text-gray-800">Connected India</Link>
        <span>/</span>
        <Link href="/leaderboard" className="hover:text-gray-800">State Rankings</Link>
        <span>/</span>
        <span className="text-gray-900 font-medium">{stateName}</span>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-10 space-y-10">

        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{stateName}</h1>
          <p className="text-gray-500 mt-1 text-sm">
            District-by-district breakdown of the rural roads programme
          </p>

          {/* State totals */}
          <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-stone-50 rounded-xl p-4">
              <div className="text-xl font-bold text-gray-900">{fmt(Number(s.connected))}</div>
              <div className="text-xs text-gray-500 mt-1">villages connected</div>
            </div>
            <div className="bg-stone-50 rounded-xl p-4">
              <div className="text-xl font-bold text-gray-900">{districts.length}</div>
              <div className="text-xs text-gray-500 mt-1">districts</div>
            </div>
            <div className="bg-stone-50 rounded-xl p-4">
              <div className="text-xl font-bold text-gray-900">
                {s.avg_light_growth != null ? `+${Number(s.avg_light_growth).toFixed(0)}%` : "—"}
              </div>
              <div className="text-xs text-gray-500 mt-1">avg night light growth</div>
            </div>
            <div className="bg-stone-50 rounded-xl p-4">
              <div className="text-xl font-bold text-gray-900">
                {s.median_road_year != null ? Math.round(Number(s.median_road_year)) : "—"}
              </div>
              <div className="text-xs text-gray-500 mt-1">median road year</div>
            </div>
          </div>
        </div>

        {/* Spotlight cards */}
        {(byLight.length > 0 || byEarliest.length > 0) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {byLight[0] && (
              <Link
                href={`/district/${districtSlug(s.state_name, byLight[0].district_name)}`}
                className="group border border-gray-100 hover:border-green-200 hover:bg-green-50 rounded-xl p-4 transition-all"
              >
                <div className="text-xs font-semibold text-green-600 uppercase tracking-widest mb-2">
                  Biggest light jump
                </div>
                <div className="font-semibold text-gray-900 group-hover:text-green-700">
                  {tc(byLight[0].district_name)}
                </div>
                <div className="text-sm text-gray-500 mt-0.5">
                  +{Number(byLight[0].avg_light_growth).toFixed(0)}% avg night light growth
                </div>
              </Link>
            )}
            {byEarliest[0] && (
              <Link
                href={`/district/${districtSlug(s.state_name, byEarliest[0].district_name)}`}
                className="group border border-gray-100 hover:border-amber-200 hover:bg-amber-50 rounded-xl p-4 transition-all"
              >
                <div className="text-xs font-semibold text-amber-600 uppercase tracking-widest mb-2">
                  Earliest connected
                </div>
                <div className="font-semibold text-gray-900 group-hover:text-amber-700">
                  {tc(byEarliest[0].district_name)}
                </div>
                <div className="text-sm text-gray-500 mt-0.5">
                  Median road year: {Math.round(Number(byEarliest[0].median_road_year))}
                </div>
              </Link>
            )}
          </div>
        )}

        {/* District table */}
        <div>
          <h2 className="text-base font-semibold text-gray-800 mb-4">All Districts</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 pr-4 text-xs font-semibold text-gray-400 uppercase tracking-wide">District</th>
                  <th className="text-right py-2 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wide">Connected</th>
                  <th className="text-right py-2 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wide hidden sm:table-cell">Population</th>
                  <th className="text-right py-2 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wide">Light Growth</th>
                  <th className="text-right py-2 pl-4 text-xs font-semibold text-gray-400 uppercase tracking-wide hidden sm:table-cell">Median Year</th>
                </tr>
              </thead>
              <tbody>
                {districts.map((d, i) => (
                  <tr key={d.district_name} className={i % 2 === 0 ? "bg-white" : "bg-stone-50"}>
                    <td className="py-2.5 pr-4">
                      <Link
                        href={`/district/${districtSlug(s.state_name, d.district_name)}`}
                        className="font-medium text-gray-800 hover:text-blue-600 transition-colors"
                      >
                        {tc(d.district_name)}
                      </Link>
                    </td>
                    <td className="py-2.5 px-4 text-right text-gray-600">
                      <MiniBar value={Number(d.connected)} max={maxConnected} color="bg-blue-400" />
                    </td>
                    <td className="py-2.5 px-4 text-right text-gray-500 hidden sm:table-cell">
                      {d.total_pop ? `${(Number(d.total_pop) / 1e5).toFixed(1)}L` : "—"}
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      {d.avg_light_growth != null ? (
                        <span className={Number(d.avg_light_growth) > 0 ? "text-green-600 font-medium" : "text-gray-400"}>
                          +{Number(d.avg_light_growth).toFixed(0)}%
                        </span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="py-2.5 pl-4 text-right text-gray-500 hidden sm:table-cell">
                      {d.median_road_year != null ? Math.round(Number(d.median_road_year)) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      <footer className="border-t border-gray-100 py-4 px-4 text-center text-xs text-gray-400 mt-10">
        Data: SHRUG (devdatalab.org) · PMGSY OMMS · Census 2011 · DMSP/NOAA 1994–2013
      </footer>
    </div>
  );
}
