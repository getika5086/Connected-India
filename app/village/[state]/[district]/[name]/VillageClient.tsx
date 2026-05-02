"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";

const NightLightChart = dynamic(() => import("@/components/NightLightChart"), { ssr: false });

function tc(s: string | null) {
  if (!s) return "";
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

function pct(n: number | null) {
  if (n == null) return "—";
  return (n * 100).toFixed(1) + "%";
}

function fmt(n: number | null) {
  if (n == null) return "—";
  return Number(n).toLocaleString("en-IN");
}

function tick(val: boolean | null) {
  if (val === null || val === undefined) return null;
  return val ? "✓" : "✗";
}

function ordinal(n: number) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function generateNarrative(v: Village, shortPostWindow: boolean): string {
  const pre  = v.nl_pre_road_avg  != null ? Number(v.nl_pre_road_avg)  : null;
  const post = v.nl_post_road_avg != null ? Number(v.nl_post_road_avg) : null;
  const growth = v.nl_growth_pct  != null ? Number(v.nl_growth_pct)   : null;
  const year = v.road_comp_year;
  const name = tc(v.village_name);

  if (!year) {
    return `Satellite data traces the brightness of ${name} from space across two decades — a proxy for electricity, commerce, and activity on the ground.`;
  }
  if (pre == null || post == null) {
    return `The road reached ${name} in ${year}. The satellite record above traces the village's brightness from space across the years around that moment.`;
  }

  const preDesc = pre < 0.1 ? "almost no detectable light"
    : pre < 0.5 ? "barely any detectable light"
    : pre < 2   ? "only faint light"
    : "some light";

  if (shortPostWindow) {
    return `Before the road arrived in ${year}, ${name} showed ${preDesc} from space — a satellite brightness of ${pre.toFixed(2)}. The DMSP programme ended in 2013, leaving too short a window after the road to measure what changed.`;
  }
  if (growth != null && growth > 100) {
    return `Before the road arrived in ${year}, ${name} registered ${preDesc} from space — a brightness of just ${pre.toFixed(2)}. In the years that followed, night light climbed to ${post.toFixed(2)}. The road lit something up.`;
  }
  if (growth != null && growth > 20) {
    return `Before the road arrived in ${year}, ${name} had a satellite brightness of ${pre.toFixed(2)}. The years after show a steady rise to ${post.toFixed(2)} — a brightening that suggests growing activity on the ground.`;
  }
  if (growth != null && growth < -10) {
    return `Before the road arrived in ${year}, ${name} registered a brightness of ${pre.toFixed(2)} from space. In the years after, readings shifted to ${post.toFixed(2)}. Roads alone don't determine a village's trajectory — other forces shape the story too.`;
  }
  return `Before the road arrived in ${year}, ${name} had a satellite brightness of ${pre.toFixed(2)}. The years after show ${post.toFixed(2)} — a subtle shift. Development takes time, and a road is only the beginning.`;
}

interface Village {
  shrid: string;
  village_name: string;
  district_name: string;
  state_name: string;
  slug: string;
  road_comp_year: number | null;
  road_length_km: number | null;
  road_cost_lakhs: number | null;
  road_name: string | null;
  had_road_pre_pmgsy: boolean | null;
  population_2011: number | null;
  households_2011: number | null;
  literacy_rate: number | null;
  sc_st_share: number | null;
  agri_worker_share: number | null;
  est_consumption_monthly: number | null;
  has_primary_school: boolean | null;
  has_middle_school: boolean | null;
  has_secondary_school: boolean | null;
  has_phc: boolean | null;
  has_hospital: boolean | null;
  has_tap_water: boolean | null;
  has_electricity_dom: boolean | null;
  has_electricity_agr: boolean | null;
  has_post_office: boolean | null;
  has_mobile_coverage: boolean | null;
  has_internet: boolean | null;
  has_bank: boolean | null;
  nl_pre_road_avg: number | null;
  nl_post_road_avg: number | null;
  nl_growth_pct: number | null;
  nl_pre_road_years: number | null;
  nl_post_road_years: number | null;
  pct_literacy_in_district: number | null;
  pct_consumption_in_district: number | null;
  pct_agri_share_in_district: number | null;
  pct_light_growth_in_district: number | null;
}

interface NightLight { year: number; luminosity: number | null }
interface EcRow { ec_year: number; total_establishments: number }
interface DistrictSummary {
  median_light_growth_pct: number | null;
  median_literacy_rate: number | null;
  median_consumption: number | null;
}

interface Props {
  data: {
    village: Village;
    nightLights: NightLight[];
    economicCensus: EcRow[];
    districtSummary: DistrictSummary | null;
  };
}

function getSessionId() {
  if (typeof window === "undefined") return "";
  let id = sessionStorage.getItem("sid");
  if (!id) { id = crypto.randomUUID(); sessionStorage.setItem("sid", id); }
  return id;
}

function ShareButton({ label, className }: { label: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  function handleCopy() {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <button
      onClick={handleCopy}
      className={className}
    >
      {copied ? "✓ Link copied!" : `↗ ${label}`}
    </button>
  );
}

export default function VillageClient({ data }: Props) {
  const { village: v, nightLights, economicCensus, districtSummary } = data;

  useEffect(() => {
    fetch("/api/analytics/view", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_id: getSessionId(),
        shrid: v.shrid,
        village_name: v.village_name,
        district_name: v.district_name,
        referrer: document.referrer || null,
      }),
    }).catch(() => {});
  }, [v.shrid, v.village_name, v.district_name]);

  const nlGrowth = v.nl_growth_pct != null ? Number(v.nl_growth_pct) : null;
  const nlGrowthDir = nlGrowth != null
    ? nlGrowth > 0 ? `+${nlGrowth.toFixed(1)}%` : `${nlGrowth.toFixed(1)}%`
    : null;

  const shortPostWindow = v.nl_post_road_years != null && v.nl_post_road_years < 3;

  const amenityRows = [
    { section: "Education", items: [
      { label: "Primary school", val: v.has_primary_school },
      { label: "Middle school", val: v.has_middle_school },
      { label: "Secondary school", val: v.has_secondary_school },
    ]},
    { section: "Health", items: [
      { label: "PHC or Sub-centre", val: v.has_phc },
      { label: "Hospital", val: v.has_hospital },
    ]},
    { section: "Connectivity", items: [
      { label: "Post office", val: v.has_post_office },
      { label: "Mobile coverage", val: v.has_mobile_coverage },
      { label: "Internet access", val: v.has_internet },
    ]},
    { section: "Finance", items: [
      { label: "Commercial bank", val: v.has_bank },
    ]},
    { section: "Water & Power", items: [
      { label: "Tap water", val: v.has_tap_water },
      { label: "Domestic electricity", val: v.has_electricity_dom },
      { label: "Agricultural electricity", val: v.has_electricity_agr },
    ]},
  ];

  const districtSlug = `${v.state_name.replace(/ /g, "-")}/${v.district_name.replace(/ /g, "-")}`;

  return (
    <div className="min-h-screen bg-white">

      {/* Nav + top share button */}
      <nav className="border-b border-gray-100 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Link href="/" className="hover:text-gray-800">Connected India</Link>
          <span>/</span>
          <Link href={`/state/${v.state_name.replace(/ /g, "-")}`} className="hover:text-gray-800">
            {tc(v.state_name)}
          </Link>
          <span>/</span>
          <Link href={`/district/${districtSlug}`} className="hover:text-gray-800">
            {tc(v.district_name)}
          </Link>
          <span>/</span>
          <span className="text-gray-900 font-medium">{tc(v.village_name)}</span>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/compare?a=${v.slug}`}
            className="text-sm font-medium text-gray-500 hover:text-gray-800 border border-gray-200 rounded-lg px-3 py-1.5 transition-colors"
          >
            Compare
          </Link>
          <ShareButton
            label="Share"
            className="text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-3 py-1.5 transition-colors"
          />
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-10">

        {/* 3.1 Header */}
        <section>
          <div className="text-sm text-gray-500 mb-1">
            {tc(v.state_name)} · {tc(v.district_name)}
          </div>
          <h1 className="text-3xl font-bold text-gray-900">{tc(v.village_name)}</h1>
          <div className="flex flex-wrap gap-3 mt-2 text-sm text-gray-500">
            {v.population_2011 && (
              <span>Population {Number(v.population_2011).toLocaleString("en-IN")}</span>
            )}
            {v.road_comp_year && (
              <>
                <span className="text-gray-300">·</span>
                <span>
                  {v.had_road_pre_pmgsy
                    ? `Road upgraded ${v.road_comp_year}`
                    : `First road ${v.road_comp_year}`}
                  {v.road_length_km ? ` · ${Number(v.road_length_km).toFixed(1)} km` : ""}
                  {v.road_cost_lakhs ? ` · ₹${Number(v.road_cost_lakhs).toFixed(1)}L` : ""}
                </span>
              </>
            )}
          </div>
        </section>

        {/* 3.2 Night Light Hero */}
        <section className="space-y-5">
          <div>
            <h2 className="text-lg font-semibold text-gray-800 mb-2">Seen from Space</h2>
            <p className="text-gray-600 leading-relaxed">
              {generateNarrative(v, shortPostWindow)}
            </p>
          </div>

          {/* Before / After hero card */}
          {v.nl_pre_road_avg != null && v.nl_post_road_avg != null && (
            <div className="rounded-2xl overflow-hidden bg-gray-950 text-white">
              <div className="flex items-stretch divide-x divide-gray-800">

                {/* Before */}
                <div className="flex-1 px-6 py-5 text-center">
                  <div className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-3">
                    Before the road
                  </div>
                  <div className="text-5xl font-bold text-gray-200 tabular-nums">
                    {Number(v.nl_pre_road_avg).toFixed(2)}
                  </div>
                  <div className="text-xs text-gray-500 mt-2">
                    {v.nl_pre_road_years}-year avg
                  </div>
                </div>

                {/* Centre — road year + growth */}
                <div className="flex flex-col items-center justify-center px-6 py-5 text-center min-w-[96px]">
                  {v.road_comp_year && (
                    <div className="text-xs font-semibold text-amber-400 mb-1">
                      {v.road_comp_year}
                    </div>
                  )}
                  <div className="text-amber-400 text-xl leading-none">↓</div>
                  <div className="text-[10px] text-gray-500 mt-1 uppercase tracking-widest">
                    Road arrives
                  </div>
                  {nlGrowthDir && !shortPostWindow && (
                    <div className={`text-sm font-bold mt-3 ${nlGrowth! > 0 ? "text-green-400" : "text-red-400"}`}>
                      {nlGrowthDir}
                    </div>
                  )}
                </div>

                {/* After */}
                <div className="flex-1 px-6 py-5 text-center">
                  <div className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-3">
                    After the road
                  </div>
                  <div className={`text-5xl font-bold tabular-nums ${
                    Number(v.nl_post_road_avg) > Number(v.nl_pre_road_avg)
                      ? "text-green-400" : "text-gray-200"
                  }`}>
                    {Number(v.nl_post_road_avg).toFixed(2)}
                  </div>
                  <div className="text-xs text-gray-500 mt-2">
                    {v.nl_post_road_years}-year avg
                  </div>
                </div>

              </div>

              {/* District comparison row */}
              {districtSummary?.median_light_growth_pct != null && !shortPostWindow && (
                <div className="border-t border-gray-800 px-6 py-3 text-center text-xs text-gray-500">
                  District median change:{" "}
                  <span className="font-semibold text-gray-300">
                    {Number(districtSummary.median_light_growth_pct) > 0 ? "+" : ""}
                    {Number(districtSummary.median_light_growth_pct).toFixed(1)}%
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Amber warning */}
          {shortPostWindow && (
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 text-sm text-amber-800">
              <span className="mt-0.5">⚠</span>
              <span>
                The road arrived in {v.road_comp_year}, leaving only {v.nl_post_road_years} year
                {v.nl_post_road_years !== 1 ? "s" : ""} of satellite data before DMSP ended in 2013.
                The before/after growth figure is not shown — too few years to be reliable.
              </span>
            </div>
          )}

          {/* Chart */}
          {nightLights.length > 0 ? (
            <NightLightChart
              data={nightLights}
              roadYear={v.road_comp_year}
              villageName={tc(v.village_name)}
              districtName={tc(v.district_name)}
            />
          ) : (
            <div className="py-6 text-center text-gray-400 text-sm border border-dashed border-gray-200 rounded-lg">
              Satellite brightness data not available for this village.
            </div>
          )}
        </section>

        {/* 3.3 Village Snapshot */}
        <section>
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Village Snapshot · Census 2011</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { label: "Population", val: fmt(v.population_2011) },
              { label: "Households", val: fmt(v.households_2011) },
              { label: "Literacy rate", val: pct(v.literacy_rate) },
              { label: "Agricultural workers", val: pct(v.agri_worker_share) },
              { label: "SC/ST share", val: pct(v.sc_st_share) },
              {
                label: "Est. monthly consumption",
                val: v.est_consumption_monthly
                  ? `₹${Math.round(Number(v.est_consumption_monthly)).toLocaleString("en-IN")}`
                  : "—",
              },
            ].map(({ label, val }) => (
              <div key={label} className="bg-stone-50 rounded-lg p-3">
                <div className="text-xs text-gray-500 mb-1">{label}</div>
                <div className="text-lg font-semibold text-gray-900">{val}</div>
              </div>
            ))}
          </div>
        </section>

        {/* 3.4 Infrastructure checklist */}
        <section>
          <h2 className="text-lg font-semibold text-gray-800 mb-2">
            Infrastructure at time of Census (2011)
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            Road connectivity is one piece of a larger picture. This is what else the village had when it got connected.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {amenityRows.map(({ section, items }) => (
              <div key={section}>
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">{section}</div>
                <ul className="space-y-1">
                  {items.map(({ label, val }) => {
                    const t = tick(val);
                    if (t === null) return null;
                    return (
                      <li key={label} className="flex items-center gap-2 text-sm">
                        <span className={val ? "text-green-600" : "text-gray-300"}>{t}</span>
                        <span className={val ? "text-gray-800" : "text-gray-400"}>{label}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* 3.5 District comparison — Option B */}
        {(v.pct_literacy_in_district != null || v.pct_consumption_in_district != null) && (
          <section>
            <h2 className="text-lg font-semibold text-gray-800 mb-1">
              How {tc(v.village_name)} Compares Within {tc(v.district_name)} District
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              Each bar shows where this village sits among all PMGSY villages in the district.
              The <span className="font-semibold">first number</span>{" "}is this village&apos;s
              actual value. The <span className="font-semibold">percentile</span>{" "}tells you
              what share of other villages in {tc(v.district_name)} score lower — so 75th percentile
              means this village does better than 75% of its district peers on that measure.
            </p>
            <div className="space-y-4">
              {[
                { label: "Literacy rate", rank: v.pct_literacy_in_district, val: pct(v.literacy_rate) },
                { label: "Night light growth after road", rank: v.pct_light_growth_in_district, val: nlGrowthDir ?? "—" },
                { label: "Agricultural worker share", rank: v.pct_agri_share_in_district, val: pct(v.agri_worker_share) },
                {
                  label: "Est. monthly consumption",
                  rank: v.pct_consumption_in_district,
                  val: v.est_consumption_monthly
                    ? `₹${Math.round(Number(v.est_consumption_monthly)).toLocaleString("en-IN")}`
                    : "—",
                },
              ].map(({ label, rank, val }) =>
                rank != null ? (
                  <div key={label}>
                    <div className="flex justify-between items-baseline text-sm mb-1.5">
                      <span className="text-gray-700 font-medium">{label}</span>
                      <span className="text-gray-500 text-xs">
                        {val} &nbsp;·&nbsp;{" "}
                        <span className="font-semibold text-gray-700">
                          {ordinal(Math.round(Number(rank)))} percentile
                        </span>
                      </span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full"
                        style={{ width: `${Math.min(100, Number(rank))}%` }}
                      />
                    </div>
                  </div>
                ) : null
              )}
            </div>
          </section>
        )}

        {/* 3.6 Economic Census */}
        {economicCensus.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-gray-800 mb-1">Non-Farm Enterprise Growth</h2>
            <p className="text-sm text-gray-500 mb-4">
              Every 7–8 years, the Government of India conducts an{" "}
              <span className="font-medium text-gray-700">Economic Census</span> — a count of every
              non-farm establishment in every village: shops, workshops, repair services, eateries,
              small factories. The numbers below show how many such businesses existed in{" "}
              {tc(v.village_name)} in each census year. Growth after the road arrived suggests the
              village was integrating into a wider economy.
            </p>
            <div className="flex items-start gap-6 bg-stone-50 rounded-xl px-5 py-4">
              {economicCensus.map((ec) => {
                const isAfterRoad = v.road_comp_year != null && ec.ec_year > v.road_comp_year;
                return (
                  <div key={ec.ec_year} className="text-center">
                    <div className={`text-xl font-bold ${isAfterRoad ? "text-green-700" : "text-gray-700"}`}>
                      {Math.round(Number(ec.total_establishments))}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">{ec.ec_year}</div>
                    {isAfterRoad && <div className="text-xs text-green-600 mt-0.5">after road</div>}
                  </div>
                );
              })}
              {v.road_comp_year && (
                <div className="ml-2 pl-4 border-l border-gray-200 text-xs text-gray-400 leading-relaxed">
                  Road connected<br />{v.road_comp_year}
                </div>
              )}
            </div>
          </section>
        )}

        {/* 3.7 India Story */}
        <section className="bg-stone-50 rounded-xl p-6 space-y-3">
          <h2 className="text-base font-semibold text-gray-800">The India Story</h2>
          <p className="text-sm text-gray-700 leading-relaxed">
            Between 2000 and 2024, India built 7.4 lakh kilometres of rural roads under PMGSY —
            enough to circle the Earth 18 times. School enrolment rose. Travel costs fell. Markets
            became reachable. Each of the 1.7 lakh villages connected has its own story of what came
            before and what came after.
          </p>
          <div className="flex gap-4 text-sm">
            <a
              href="https://voxdev.org/topic/infrastructure-urbanisation/rural-roads-and-local-economic-development-india"
              className="text-blue-600 underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Research on PMGSY impact
            </a>
            <a
              href="https://pmgsy.nic.in"
              className="text-blue-600 underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Ministry of Rural Development
            </a>
          </div>
        </section>

        {/* 3.8 Bottom share bar */}
        <section className="border-t border-gray-100 pt-6 flex items-center justify-between">
          <ShareButton
            label="Share this village"
            className="text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 transition-colors"
          />
          <span className="text-xs text-gray-400">
            Data: SHRUG (devdatalab.org) · PMGSY OMMS · Census of India 2011
          </span>
        </section>

      </div>
    </div>
  );
}
