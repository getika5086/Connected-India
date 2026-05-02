import Link from "next/link";
import SearchBox from "@/components/SearchBox";
import SurpriseButton from "@/components/SurpriseButton";
import { db } from "@/lib/db";

function tc(s: string) {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

interface FeaturedVillage {
  slug: string;
  village_name: string;
  district_name: string;
  state_name: string;
  road_comp_year: number | null;
  nl_growth_pct: number | null;
  nl_pre_road_avg: number | null;
  nl_post_road_avg: number | null;
  population_2011: number | null;
}

async function queryOne(sql: string): Promise<FeaturedVillage | null> {
  try {
    const res = await db.query<FeaturedVillage>(sql);
    return res.rows[0] ?? null;
  } catch (err) {
    console.error("Curated query failed:", err);
    return null;
  }
}

async function getCurated(): Promise<{
  fastest: FeaturedVillage | null;
  lastConnected: FeaturedVillage | null;
  darkToLight: FeaturedVillage | null;
}> {
  const [fastest, lastConnected, darkToLight] = await Promise.all([
    // Fastest night-light growth — random from top 50 so card rotates
    queryOne(`
      SELECT slug, village_name, district_name, state_name,
             road_comp_year, nl_growth_pct, nl_pre_road_avg, nl_post_road_avg, population_2011
      FROM (
        SELECT slug, village_name, district_name, state_name,
               road_comp_year, nl_growth_pct, nl_pre_road_avg, nl_post_road_avg, population_2011
        FROM villages
        WHERE nl_growth_pct IS NOT NULL
          AND nl_post_road_years >= 3
          AND nl_growth_pct > 100
        ORDER BY nl_growth_pct DESC
        LIMIT 50
      ) sub
      ORDER BY RANDOM()
      LIMIT 1
    `),
    // Among the last villages to be connected
    queryOne(`
      SELECT slug, village_name, district_name, state_name,
             road_comp_year, nl_growth_pct, nl_pre_road_avg, nl_post_road_avg, population_2011
      FROM (
        SELECT slug, village_name, district_name, state_name,
               road_comp_year, nl_growth_pct, nl_pre_road_avg, nl_post_road_avg, population_2011
        FROM villages
        WHERE road_comp_year >= 2012
          AND population_2011 IS NOT NULL
        ORDER BY road_comp_year DESC
        LIMIT 50
      ) sub
      ORDER BY RANDOM()
      LIMIT 1
    `),
    // From darkness to light — random from top 50 by brightness jump
    queryOne(`
      SELECT slug, village_name, district_name, state_name,
             road_comp_year, nl_growth_pct, nl_pre_road_avg, nl_post_road_avg, population_2011
      FROM (
        SELECT slug, village_name, district_name, state_name,
               road_comp_year, nl_growth_pct, nl_pre_road_avg, nl_post_road_avg, population_2011
        FROM villages
        WHERE nl_pre_road_avg IS NOT NULL
          AND nl_post_road_avg IS NOT NULL
          AND nl_pre_road_avg < 0.5
          AND nl_post_road_avg > 1.0
          AND nl_post_road_years >= 3
        ORDER BY (nl_post_road_avg - nl_pre_road_avg) DESC
        LIMIT 50
      ) sub
      ORDER BY RANDOM()
      LIMIT 1
    `),
  ]);

  return { fastest, lastConnected, darkToLight };
}

export default async function Home() {
  const { fastest, lastConnected, darkToLight } = await getCurated();

  const cards = [
    fastest && {
      tag: "Fastest to light up",
      tagColor: "bg-green-100 text-green-700",
      village: fastest,
      hook: fastest.nl_growth_pct != null
        ? `Night light grew +${Number(fastest.nl_growth_pct).toFixed(0)}% after the road arrived`
        : `Connected in ${fastest.road_comp_year}`,
    },
    lastConnected && {
      tag: "Among the last connected",
      tagColor: "bg-rose-100 text-rose-700",
      village: lastConnected,
      hook: `Waited until ${lastConnected.road_comp_year} for its first all-weather road`,
    },
    darkToLight && {
      tag: "From darkness to light",
      tagColor: "bg-blue-100 text-blue-700",
      village: darkToLight,
      hook: darkToLight.nl_pre_road_avg != null && darkToLight.nl_post_road_avg != null
        ? `Brightness rose from ${Number(darkToLight.nl_pre_road_avg).toFixed(2)} to ${Number(darkToLight.nl_post_road_avg).toFixed(2)} after the road`
        : `Connected in ${darkToLight.road_comp_year}`,
    },
  ].filter(Boolean) as { tag: string; tagColor: string; village: FeaturedVillage; hook: string }[];

  return (
    <main className="min-h-screen flex flex-col">

      {/* Top nav */}
      <nav className="border-b border-gray-100 bg-white px-4 py-3 flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-700">Connected India</span>
        <div className="flex items-center gap-8">
          <Link href="/compare" className="text-sm font-semibold text-gray-700 hover:text-gray-900 transition-colors">
            Compare Villages
          </Link>
          <Link href="/leaderboard" className="text-sm font-semibold text-gray-700 hover:text-gray-900 transition-colors">
            State Rankings
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-20 bg-stone-50">
        <div className="max-w-2xl w-full text-center space-y-7">

          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-gray-900 leading-tight">
            Find the village<br />your family came from
          </h1>

          <p className="text-gray-600 text-base leading-relaxed max-w-lg mx-auto">
            Every Indian family has a village somewhere. Search for yours and discover the year
            it got its first all-weather road, what it looked like from space before and after,
            and how life changed when it finally connected to the rest of India.
          </p>

          <div className="flex justify-center w-full">
            <SearchBox />
          </div>

          {/* Surprise me */}
          <div className="flex flex-col items-center gap-2 pt-1">
            <p className="text-xs text-gray-400">Don&apos;t have a village in mind?</p>
            <SurpriseButton />
          </div>

        </div>
      </div>

      {/* Curated stories */}
      {cards.length > 0 && (
        <div className="border-t border-gray-100 bg-white py-12 px-4">
          <div className="max-w-3xl mx-auto">
            <p className="text-center text-xs font-semibold text-gray-400 uppercase tracking-widest mb-8">
              Or explore a curated story
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {cards.map(({ tag, tagColor, village, hook }) => (
                <Link
                  key={village.slug}
                  href={`/village/${village.slug}?ref=curated`}
                  className="group flex flex-col gap-3 p-4 rounded-xl border border-gray-100 hover:border-gray-300 hover:shadow-sm transition-all bg-white"
                >
                  <span className={`self-start text-xs font-semibold px-2 py-0.5 rounded-full ${tagColor}`}>
                    {tag}
                  </span>
                  <div>
                    <div className="font-semibold text-gray-900 group-hover:text-blue-700 transition-colors">
                      {tc(village.village_name)}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {tc(village.district_name)}, {tc(village.state_name)}
                    </div>
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed flex-1">{hook}</p>
                  <span className="text-xs text-blue-500 group-hover:text-blue-700 font-medium">
                    Explore this village →
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* What you'll discover */}
      <div className="border-t border-gray-100 bg-stone-50 py-12 px-4">
        <div className="max-w-3xl mx-auto">
          <p className="text-center text-xs font-semibold text-gray-400 uppercase tracking-widest mb-8">
            What you&apos;ll discover
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 text-center">
            <div className="space-y-2">
              <div className="text-3xl mb-3">📅</div>
              <div className="text-sm font-semibold text-gray-800">The year the road arrived</div>
              <div className="text-xs text-gray-500 leading-relaxed">
                See exactly when PMGSY connected your village to an all-weather road — and how long it waited.
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-3xl mb-3">🛰️</div>
              <div className="text-sm font-semibold text-gray-800">Lights from space</div>
              <div className="text-xs text-gray-500 leading-relaxed">
                NOAA satellite data captures how brightness changed in the years before and after the road came.
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-3xl mb-3">🏘️</div>
              <div className="text-sm font-semibold text-gray-800">Village life in 2011</div>
              <div className="text-xs text-gray-500 leading-relaxed">
                Schools, hospitals, banks, electricity — a snapshot of what the village had when the road arrived.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Scale strip */}
      <div className="border-t border-gray-100 bg-white py-8 px-4">
        <div className="max-w-3xl mx-auto">
          <p className="text-center text-xs font-semibold text-gray-400 uppercase tracking-widest mb-6">
            The scale of the programme
          </p>
          <div className="grid grid-cols-3 gap-6 text-center">
            <div>
              <div className="text-2xl font-bold text-gray-900">1.7 lakh</div>
              <div className="text-sm text-gray-500 mt-1">villages connected</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">7.4 lakh km</div>
              <div className="text-sm text-gray-500 mt-1">of rural roads built</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">25 years</div>
              <div className="text-sm text-gray-500 mt-1">of India getting connected</div>
            </div>
          </div>
        </div>
      </div>

      <footer className="border-t border-gray-100 py-4 px-4 text-center text-xs text-gray-400">
        Data: SHRUG (devdatalab.org) · PMGSY OMMS · Census of India 2011
      </footer>

    </main>
  );
}
