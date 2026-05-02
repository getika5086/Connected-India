import Link from "next/link";
import { db } from "@/lib/db";
import { track } from "@/lib/telemetry";

function tc(s: string) {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}
function stateSlug(s: string) {
  return s.toLowerCase().replace(/ /g, "-");
}
function fmt(n: number | null) {
  if (n == null) return "—";
  return Number(n).toLocaleString("en-IN");
}

interface StateRow {
  state_name: string;
  total_villages: number;
  connected: number;
  avg_light_growth: number | null;
  median_road_year: number | null;
  total_pop: number | null;
}

async function getStateStats(): Promise<StateRow[]> {
  const res = await db.query<StateRow>(`
    SELECT
      state_name,
      COUNT(*)                                                                      AS total_villages,
      SUM(CASE WHEN road_comp_year IS NOT NULL THEN 1 ELSE 0 END)                  AS connected,
      ROUND(AVG(CASE WHEN nl_growth_pct IS NOT NULL
                      AND nl_post_road_years >= 3 THEN nl_growth_pct END)::numeric, 1)
                                                                                   AS avg_light_growth,
      ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY road_comp_year)::numeric)  AS median_road_year,
      SUM(population_2011)                                                          AS total_pop
    FROM villages
    GROUP BY state_name
    ORDER BY connected DESC
  `);
  return res.rows;
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <span className="text-lg">🥇</span>;
  if (rank === 2) return <span className="text-lg">🥈</span>;
  if (rank === 3) return <span className="text-lg">🥉</span>;
  return <span className="text-sm text-gray-400 font-mono w-5 text-right">{rank}</span>;
}

function RankedList({
  title,
  subtitle,
  rows,
  getValue,
  formatValue,
  barColor,
  ascending = false,
}: {
  title: string;
  subtitle: string;
  rows: StateRow[];
  getValue: (r: StateRow) => number | null;
  formatValue: (v: number) => string;
  barColor: string;
  ascending?: boolean;
}) {
  const valid = rows
    .map((r) => ({ row: r, val: getValue(r) }))
    .filter((x): x is { row: StateRow; val: number } => x.val != null)
    .sort((a, b) => ascending ? a.val - b.val : b.val - a.val)
    .slice(0, 20);

  const max = Math.max(...valid.map((x) => (ascending ? 1 / x.val : x.val)));

  return (
    <div>
      <h2 className="text-base font-semibold text-gray-800">{title}</h2>
      <p className="text-xs text-gray-400 mb-4 mt-0.5">{subtitle}</p>
      <div className="space-y-2">
        {valid.map(({ row, val }, i) => {
          const barWidth = ascending
            ? ((1 / val) / max) * 100
            : (val / Math.max(...valid.map((x) => x.val))) * 100;
          return (
            <Link
              key={row.state_name}
              href={`/state/${stateSlug(row.state_name)}`}
              className="flex items-center gap-3 group"
            >
              <div className="w-6 flex justify-center shrink-0">
                <RankBadge rank={i + 1} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between mb-1">
                  <span className="text-sm font-medium text-gray-800 group-hover:text-blue-600 transition-colors truncate">
                    {tc(row.state_name)}
                  </span>
                  <span className="text-xs text-gray-500 ml-2 shrink-0">{formatValue(val)}</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${barColor}`}
                    style={{ width: `${barWidth}%` }}
                  />
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export default async function LeaderboardPage() {
  const rows = await getStateStats();
  track("leaderboard_view", {});

  const totalVillages = rows.reduce((s, r) => s + Number(r.connected), 0);
  const totalPop = rows.reduce((s, r) => s + (r.total_pop ? Number(r.total_pop) : 0), 0);

  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="border-b border-gray-100 px-4 py-3 flex items-center gap-2 text-sm text-gray-500">
        <Link href="/" className="hover:text-gray-800">Connected India</Link>
        <span>/</span>
        <span className="text-gray-900 font-medium">State Rankings</span>
      </nav>

      <div className="max-w-5xl mx-auto px-4 py-10">

        {/* Hero */}
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-gray-900">State Rankings</h1>
          <p className="text-gray-500 mt-2 text-base">
            How every Indian state performed on the PMGSY rural roads programme —
            villages connected, economic impact, and speed of delivery.
          </p>

          {/* National totals */}
          <div className="mt-6 grid grid-cols-3 gap-4">
            <div className="bg-stone-50 rounded-xl p-4">
              <div className="text-2xl font-bold text-gray-900">{fmt(totalVillages)}</div>
              <div className="text-xs text-gray-500 mt-1">villages connected across India</div>
            </div>
            <div className="bg-stone-50 rounded-xl p-4">
              <div className="text-2xl font-bold text-gray-900">{rows.length}</div>
              <div className="text-xs text-gray-500 mt-1">states &amp; union territories</div>
            </div>
            <div className="bg-stone-50 rounded-xl p-4">
              <div className="text-2xl font-bold text-gray-900">
                {(totalPop / 1e7).toFixed(1)} cr
              </div>
              <div className="text-xs text-gray-500 mt-1">people in connected villages</div>
            </div>
          </div>
        </div>

        {/* Three ranked lists */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">

          <RankedList
            title="Villages Connected"
            subtitle="Total PMGSY villages per state"
            rows={rows}
            getValue={(r) => Number(r.connected)}
            formatValue={(v) => fmt(v)}
            barColor="bg-blue-500"
          />

          <RankedList
            title="Night Light Growth"
            subtitle="Avg % brightness increase after road"
            rows={rows}
            getValue={(r) => r.avg_light_growth != null ? Number(r.avg_light_growth) : null}
            formatValue={(v) => `+${v.toFixed(0)}%`}
            barColor="bg-green-500"
          />

          <RankedList
            title="Earliest Movers"
            subtitle="Median year villages got connected"
            rows={rows}
            getValue={(r) => r.median_road_year != null ? Number(r.median_road_year) : null}
            formatValue={(v) => String(Math.round(v))}
            barColor="bg-amber-500"
            ascending={true}
          />

        </div>

        <p className="mt-12 text-xs text-gray-400 text-center">
          Data: SHRUG (devdatalab.org) · PMGSY OMMS · Census 2011 · DMSP/NOAA satellite data 1994–2013
        </p>
      </div>
    </div>
  );
}
