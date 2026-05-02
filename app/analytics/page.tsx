import Link from "next/link";
import { db } from "@/lib/db";

function tc(s: string) {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

async function getStats() {
  const [overview, topVillages, topSearches, featureUsage, dailySessions] = await Promise.all([

    // Overview counts
    db.query(`
      SELECT
        COUNT(*)                                                          AS total_events,
        COUNT(DISTINCT session_id)                                        AS unique_sessions,
        COUNT(*) FILTER (WHERE event = 'village_view')                   AS village_views,
        COUNT(*) FILTER (WHERE event = 'village_view'
          AND created_at > NOW() - INTERVAL '24 hours')                  AS village_views_24h,
        COUNT(*) FILTER (WHERE event = 'search_query')                   AS searches,
        COUNT(*) FILTER (WHERE event = 'surprise_me')                    AS surprise_me_clicks,
        COUNT(*) FILTER (WHERE event = 'compare_view')                   AS compare_views,
        COUNT(*) FILTER (WHERE event = 'share_click')                    AS shares
      FROM analytics_events
      WHERE created_at > NOW() - INTERVAL '30 days'
    `),

    // Top villages last 7 days
    db.query(`
      SELECT
        properties->>'slug'          AS slug,
        properties->>'village_name'  AS village_name,
        properties->>'district_name' AS district_name,
        properties->>'state_name'    AS state_name,
        COUNT(*)                     AS views,
        COUNT(DISTINCT session_id)   AS unique_visitors
      FROM analytics_events
      WHERE event = 'village_view'
        AND created_at > NOW() - INTERVAL '7 days'
      GROUP BY 1,2,3,4
      ORDER BY views DESC
      LIMIT 10
    `),

    // Top searches last 7 days
    db.query(`
      SELECT
        properties->>'query'                                  AS query,
        COUNT(*)                                              AS count,
        ROUND(AVG((properties->>'results_count')::numeric),0) AS avg_results
      FROM analytics_events
      WHERE event = 'search_query'
        AND created_at > NOW() - INTERVAL '7 days'
        AND properties->>'query' IS NOT NULL
      GROUP BY 1
      ORDER BY count DESC
      LIMIT 10
    `),

    // Feature usage last 30 days
    db.query(`
      SELECT event, COUNT(*) AS total, COUNT(DISTINCT session_id) AS unique_sessions
      FROM analytics_events
      WHERE event IN ('surprise_me','compare_view','share_click','curated_click','leaderboard_view','state_view','district_view')
        AND created_at > NOW() - INTERVAL '30 days'
      GROUP BY event
      ORDER BY total DESC
    `),

    // Daily sessions last 14 days
    db.query(`
      SELECT
        TO_CHAR(DATE(created_at), 'Mon DD') AS day,
        COUNT(DISTINCT session_id)           AS sessions,
        COUNT(*)                             AS events
      FROM analytics_events
      WHERE created_at > NOW() - INTERVAL '14 days'
      GROUP BY DATE(created_at)
      ORDER BY DATE(created_at) DESC
      LIMIT 14
    `),
  ]);

  return {
    overview: overview.rows[0],
    topVillages: topVillages.rows,
    topSearches: topSearches.rows,
    featureUsage: featureUsage.rows,
    dailySessions: dailySessions.rows,
  };
}

const featureLabels: Record<string, string> = {
  surprise_me:     "✦ Surprise Me",
  compare_view:    "⇄ Compare",
  share_click:     "↗ Share",
  curated_click:   "★ Curated card",
  leaderboard_view:"▲ State Rankings",
  state_view:      "◎ State page",
  district_view:   "◉ District page",
};

export default async function AnalyticsPage() {
  let stats;
  try {
    stats = await getStats();
  } catch {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center text-gray-400 text-sm">
        Analytics table not yet created. Run <code className="ml-1 bg-gray-100 px-1 rounded">supabase_analytics_schema.sql</code> first.
      </div>
    );
  }

  const { overview: o, topVillages, topSearches, featureUsage, dailySessions } = stats;

  return (
    <div className="min-h-screen bg-white">
      <nav className="border-b border-gray-100 px-4 py-3 flex items-center gap-2 text-sm text-gray-500">
        <Link href="/" className="hover:text-gray-800">Connected India</Link>
        <span>/</span>
        <span className="text-gray-900 font-medium">Analytics</span>
        <span className="ml-auto text-xs text-gray-400">Last 30 days unless noted</span>
      </nav>

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-10">

        {/* Overview */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-5">Dashboard</h1>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Unique visitors", value: Number(o.unique_sessions).toLocaleString("en-IN") },
              { label: "Village views", value: Number(o.village_views).toLocaleString("en-IN") },
              { label: "Views (last 24h)", value: Number(o.village_views_24h).toLocaleString("en-IN") },
              { label: "Searches", value: Number(o.searches).toLocaleString("en-IN") },
              { label: "Surprise Me", value: Number(o.surprise_me_clicks).toLocaleString("en-IN") },
              { label: "Comparisons", value: Number(o.compare_views).toLocaleString("en-IN") },
              { label: "Shares", value: Number(o.shares).toLocaleString("en-IN") },
              { label: "Total events", value: Number(o.total_events).toLocaleString("en-IN") },
            ].map(({ label, value }) => (
              <div key={label} className="bg-stone-50 rounded-xl p-4">
                <div className="text-xl font-bold text-gray-900">{value}</div>
                <div className="text-xs text-gray-500 mt-1">{label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

          {/* Top villages */}
          <div>
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Top Villages · Last 7 Days</h2>
            <div className="space-y-1">
              {topVillages.length === 0 && <p className="text-xs text-gray-400">No data yet</p>}
              {topVillages.map((v: { slug: string; village_name: string; district_name: string; state_name: string; views: number; unique_visitors: number }, i: number) => (
                <div key={v.slug} className="flex items-center gap-3 py-1.5 border-b border-gray-50">
                  <span className="text-xs text-gray-300 w-4 shrink-0">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <Link href={`/village/${v.slug}`} className="text-sm font-medium text-gray-800 hover:text-blue-600 truncate block">
                      {v.village_name ? tc(v.village_name) : v.slug}
                    </Link>
                    <div className="text-xs text-gray-400 truncate">
                      {v.district_name ? tc(v.district_name) : ""}{v.state_name ? `, ${tc(v.state_name)}` : ""}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-semibold text-gray-700">{Number(v.views).toLocaleString()}</div>
                    <div className="text-xs text-gray-400">{Number(v.unique_visitors)} uniq</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top searches */}
          <div>
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Top Searches · Last 7 Days</h2>
            <div className="space-y-1">
              {topSearches.length === 0 && <p className="text-xs text-gray-400">No data yet</p>}
              {topSearches.map((s: { query: string; count: number; avg_results: number }, i: number) => (
                <div key={s.query} className="flex items-center gap-3 py-1.5 border-b border-gray-50">
                  <span className="text-xs text-gray-300 w-4 shrink-0">{i + 1}</span>
                  <div className="flex-1 text-sm text-gray-800">{s.query}</div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-semibold text-gray-700">{Number(s.count)}</div>
                    <div className="text-xs text-gray-400">{Number(s.avg_results)} results</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Feature usage */}
          <div>
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Feature Usage · Last 30 Days</h2>
            <div className="space-y-1">
              {featureUsage.length === 0 && <p className="text-xs text-gray-400">No data yet</p>}
              {featureUsage.map((f: { event: string; total: number; unique_sessions: number }) => (
                <div key={f.event} className="flex items-center gap-3 py-1.5 border-b border-gray-50">
                  <div className="flex-1 text-sm text-gray-700">
                    {featureLabels[f.event] ?? f.event}
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-semibold text-gray-700">{Number(f.total).toLocaleString()}</span>
                    <span className="text-xs text-gray-400 ml-2">{Number(f.unique_sessions)} sessions</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Daily sessions */}
          <div>
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Daily Activity · Last 14 Days</h2>
            <div className="space-y-1">
              {dailySessions.length === 0 && <p className="text-xs text-gray-400">No data yet</p>}
              {dailySessions.map((d: { day: string; sessions: number; events: number }) => (
                <div key={d.day} className="flex items-center gap-3 py-1.5 border-b border-gray-50">
                  <div className="text-xs text-gray-500 w-12 shrink-0">{d.day}</div>
                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-400 rounded-full"
                      style={{ width: `${Math.min(100, (Number(d.sessions) / Math.max(...dailySessions.map((x: { sessions: number }) => Number(x.sessions)))) * 100)}%` }}
                    />
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-sm font-semibold text-gray-700">{Number(d.sessions)}</span>
                    <span className="text-xs text-gray-400 ml-1">sessions</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
