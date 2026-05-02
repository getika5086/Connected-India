"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { trackEvent } from "@/lib/trackEvent";
import dynamic from "next/dynamic";
import Link from "next/link";

const CompareNightLightChart = dynamic(() => import("@/components/CompareNightLightChart"), { ssr: false });

/* ─── helpers ─── */
function tc(s: string | null) {
  if (!s) return "";
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}
function fmt(n: number | null) {
  if (n == null) return "—";
  return Number(n).toLocaleString("en-IN");
}
function pct(n: number | null) {
  if (n == null) return "—";
  return (Number(n) * 100).toFixed(1) + "%";
}

/* ─── types ─── */
interface Village {
  village_name: string; district_name: string; state_name: string; slug: string;
  road_comp_year: number | null; road_length_km: number | null; road_cost_lakhs: number | null;
  had_road_pre_pmgsy: boolean | null;
  population_2011: number | null; households_2011: number | null;
  literacy_rate: number | null; sc_st_share: number | null; agri_worker_share: number | null;
  est_consumption_monthly: number | null;
  has_primary_school: boolean | null; has_middle_school: boolean | null;
  has_secondary_school: boolean | null; has_phc: boolean | null; has_hospital: boolean | null;
  has_tap_water: boolean | null; has_electricity_dom: boolean | null;
  has_electricity_agr: boolean | null; has_post_office: boolean | null;
  has_mobile_coverage: boolean | null; has_internet: boolean | null; has_bank: boolean | null;
  nl_pre_road_avg: number | null; nl_post_road_avg: number | null;
  nl_growth_pct: number | null; nl_pre_road_years: number | null; nl_post_road_years: number | null;
}
interface NightLight { year: number; luminosity: number | null }
interface VillageData { village: Village; nightLights: NightLight[] }
interface SearchResult {
  village_name: string; district_name: string; state_name: string;
  slug: string; road_comp_year: number | null;
}

/* ─── inline search slot ─── */
function SearchSlot({
  label, color, selected, onSelect,
}: {
  label: string; color: "blue" | "amber";
  selected: Village | null; onSelect: (slug: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ring = color === "blue" ? "border-blue-500 ring-blue-100" : "border-amber-500 ring-amber-100";
  const tag  = color === "blue" ? "bg-blue-600 text-white" : "bg-amber-500 text-white";

  useEffect(() => {
    if (query.length < 2) { setResults([]); setOpen(false); return; }
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setResults(data.results ?? []);
        setOpen(true);
      } finally { setLoading(false); }
    }, 300);
  }, [query]);

  if (selected) {
    return (
      <div className={`flex-1 rounded-xl border-2 p-4 ${ring}`}>
        <div className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full mb-2 ${tag}`}>
          {label}
        </div>
        <div className="font-semibold text-gray-900 text-base">{tc(selected.village_name)}</div>
        <div className="text-xs text-gray-500 mt-0.5">
          {tc(selected.district_name)}, {tc(selected.state_name)}
        </div>
        {selected.road_comp_year && (
          <div className="text-xs text-gray-400 mt-1">Connected {selected.road_comp_year}</div>
        )}
        <button
          onClick={() => onSelect("")}
          className="mt-3 text-xs text-gray-400 hover:text-red-500 transition-colors"
        >
          ✕ Change village
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 relative">
      <div className={`rounded-xl border-2 border-dashed p-1 ${ring}`}>
        <div className="px-3 py-1">
          <div className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full mb-2 ${tag}`}>
            {label}
          </div>
        </div>
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for a village…"
            className="w-full px-3 py-2.5 text-sm outline-none bg-transparent"
            onKeyDown={(e) => {
              if (e.key === "Enter" && results[0]) { onSelect(results[0].slug); setOpen(false); setQuery(""); }
              if (e.key === "Escape") setOpen(false);
            }}
          />
          {loading && <span className="absolute right-3 top-2.5 text-gray-300 text-sm">…</span>}
        </div>
      </div>
      {open && results.length > 0 && (
        <ul className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
          {results.map((r) => (
            <li key={r.slug}>
              <button
                className="w-full text-left px-4 py-2.5 hover:bg-gray-50 text-sm flex justify-between items-center"
                onClick={() => { onSelect(r.slug); setOpen(false); setQuery(""); }}
              >
                <span>
                  <span className="font-medium">{tc(r.village_name)}</span>
                  <span className="text-gray-400 ml-2">{tc(r.district_name)}, {tc(r.state_name)}</span>
                </span>
                {r.road_comp_year && (
                  <span className="text-xs text-gray-400 shrink-0 ml-2">{r.road_comp_year}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ─── metric row ─── */
function MetricRow({
  label, valA, valB, numA, numB, higherIsBetter = true,
}: {
  label: string; valA: string; valB: string;
  numA: number | null; numB: number | null; higherIsBetter?: boolean;
}) {
  const aWins = numA != null && numB != null && (higherIsBetter ? numA > numB : numA < numB);
  const bWins = numA != null && numB != null && (higherIsBetter ? numB > numA : numB < numA);
  return (
    <tr className="border-b border-gray-50">
      <td className="py-2.5 pr-4 text-xs text-gray-500">{label}</td>
      <td className={`py-2.5 px-3 text-sm font-medium text-center rounded ${aWins ? "text-blue-700 bg-blue-50" : "text-gray-700"}`}>
        {valA} {aWins && <span className="text-blue-400 text-xs">✓</span>}
      </td>
      <td className={`py-2.5 px-3 text-sm font-medium text-center rounded ${bWins ? "text-amber-700 bg-amber-50" : "text-gray-700"}`}>
        {valB} {bWins && <span className="text-amber-400 text-xs">✓</span>}
      </td>
    </tr>
  );
}

/* ─── amenity row ─── */
function AmenityRow({ label, a, b }: { label: string; a: boolean | null; b: boolean | null }) {
  if (a === null && b === null) return null;
  return (
    <tr className="border-b border-gray-50">
      <td className="py-2 pr-4 text-xs text-gray-500">{label}</td>
      <td className="py-2 px-3 text-center text-sm">
        {a == null ? "—" : a ? <span className="text-green-600">✓</span> : <span className="text-gray-300">✗</span>}
      </td>
      <td className="py-2 px-3 text-center text-sm">
        {b == null ? "—" : b ? <span className="text-green-600">✓</span> : <span className="text-gray-300">✗</span>}
      </td>
    </tr>
  );
}

/* ─── main component ─── */
export default function CompareClient() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const slugA = searchParams.get("a") ?? "";
  const slugB = searchParams.get("b") ?? "";

  const [dataA, setDataA] = useState<VillageData | null>(null);
  const [dataB, setDataB] = useState<VillageData | null>(null);
  const [loadingA, setLoadingA] = useState(false);
  const [loadingB, setLoadingB] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchVillage = useCallback(async (slug: string, setter: (d: VillageData | null) => void, setLoad: (b: boolean) => void) => {
    if (!slug) { setter(null); return; }
    setLoad(true);
    try {
      const res = await fetch(`/api/village/${slug}`);
      if (!res.ok) { setter(null); return; }
      const d = await res.json();
      setter(d);
    } catch { setter(null); }
    finally { setLoad(false); }
  }, []);

  useEffect(() => { fetchVillage(slugA, setDataA, setLoadingA); }, [slugA, fetchVillage]);
  useEffect(() => { fetchVillage(slugB, setDataB, setLoadingB); }, [slugB, fetchVillage]);

  function setSlug(which: "a" | "b", slug: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (slug) params.set(which, slug);
    else params.delete(which);
    router.push(`/compare?${params.toString()}`);
  }

  function copyLink() {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    trackEvent("share_click", { page: "compare", slug_a: slugA, slug_b: slugB });
  }

  const vA = dataA?.village ?? null;
  const vB = dataB?.village ?? null;
  const bothLoaded = vA && vB;

  // Fire compare_view once when both villages are loaded
  useEffect(() => {
    if (vA && vB) {
      trackEvent("compare_view", { slug_a: vA.slug, slug_b: vB.slug,
        village_a: vA.village_name, village_b: vB.village_name });
    }
  }, [vA?.slug, vB?.slug]); // eslint-disable-line react-hooks/exhaustive-deps

  const nlGrowthA = vA?.nl_growth_pct != null ? Number(vA.nl_growth_pct) : null;
  const nlGrowthB = vB?.nl_growth_pct != null ? Number(vB.nl_growth_pct) : null;

  // Road year race
  let raceLabel = "";
  if (vA?.road_comp_year && vB?.road_comp_year) {
    const diff = Math.abs(Number(vA.road_comp_year) - Number(vB.road_comp_year));
    if (diff === 0) raceLabel = "Both connected the same year";
    else {
      const earlier = Number(vA.road_comp_year) < Number(vB.road_comp_year) ? tc(vA.village_name) : tc(vB.village_name);
      raceLabel = `${earlier} connected ${diff} year${diff > 1 ? "s" : ""} earlier`;
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">

      {/* Page title */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Compare Two Villages</h1>
        <p className="text-sm text-gray-500 mt-1">
          See how two villages compare on roads, satellite brightness, and Census 2011 data.
        </p>
      </div>

      {/* Search slots */}
      <div className="flex flex-col sm:flex-row gap-4">
        <SearchSlot
          label="Village A"
          color="blue"
          selected={vA}
          onSelect={(slug) => setSlug("a", slug)}
        />
        <div className="hidden sm:flex items-center text-gray-300 font-bold text-lg">vs</div>
        <SearchSlot
          label="Village B"
          color="amber"
          selected={vB}
          onSelect={(slug) => setSlug("b", slug)}
        />
      </div>

      {/* Loading states */}
      {(loadingA || loadingB) && (
        <p className="text-sm text-gray-400 text-center animate-pulse">Loading village data…</p>
      )}

      {/* Empty / partial state prompt */}
      {!loadingA && !loadingB && !bothLoaded && (
        <div className="text-center py-12 text-gray-400 border border-dashed border-gray-200 rounded-xl">
          {!slugA && !slugB
            ? "Search for two villages above to start comparing"
            : "Search for the second village to see the comparison"}
        </div>
      )}

      {/* ── COMPARISON ── */}
      {bothLoaded && (
        <div className="space-y-8">

          {/* Share button */}
          <div className="flex justify-end">
            <button
              onClick={copyLink}
              className="text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-3 py-1.5 transition-colors"
            >
              {copied ? "✓ Link copied!" : "↗ Share this comparison"}
            </button>
          </div>

          {/* Road year race */}
          {vA.road_comp_year && vB.road_comp_year && (
            <div className="bg-stone-50 rounded-2xl p-5">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-4">Road Connection</h2>
              <div className="flex items-center gap-4">
                <div className="flex-1 text-center">
                  <div className={`text-3xl font-bold ${Number(vA.road_comp_year) <= Number(vB.road_comp_year) ? "text-blue-700" : "text-gray-400"}`}>
                    {vA.road_comp_year}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">{tc(vA.village_name)}</div>
                </div>
                <div className="flex flex-col items-center text-center px-2">
                  <div className="text-xs text-gray-400 font-medium">{raceLabel}</div>
                  <div className="mt-2 w-px h-8 bg-gray-200" />
                </div>
                <div className="flex-1 text-center">
                  <div className={`text-3xl font-bold ${Number(vB.road_comp_year) <= Number(vA.road_comp_year) ? "text-amber-600" : "text-gray-400"}`}>
                    {vB.road_comp_year}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">{tc(vB.village_name)}</div>
                </div>
              </div>
            </div>
          )}

          {/* Night light before/after */}
          {(vA.nl_pre_road_avg != null || vB.nl_pre_road_avg != null) && (
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-4">Night Light · Seen from Space</h2>
              <div className="grid grid-cols-2 gap-4 mb-5">
                {[{ v: vA, color: "blue", growth: nlGrowthA }, { v: vB, color: "amber", growth: nlGrowthB }].map(({ v, color, growth }) => (
                  <div key={v.village_name} className={`rounded-xl border-2 p-4 ${color === "blue" ? "border-blue-100" : "border-amber-100"}`}>
                    <div className={`text-xs font-semibold mb-3 ${color === "blue" ? "text-blue-600" : "text-amber-600"}`}>
                      {tc(v.village_name)}
                    </div>
                    <div className="flex gap-4 text-center">
                      <div className="flex-1">
                        <div className="text-xs text-gray-400 mb-1">Before</div>
                        <div className="text-xl font-bold text-gray-700">
                          {v.nl_pre_road_avg != null ? Number(v.nl_pre_road_avg).toFixed(2) : "—"}
                        </div>
                      </div>
                      <div className="flex items-center text-gray-300">→</div>
                      <div className="flex-1">
                        <div className="text-xs text-gray-400 mb-1">After</div>
                        <div className={`text-xl font-bold ${v.nl_post_road_avg != null && Number(v.nl_post_road_avg) > Number(v.nl_pre_road_avg) ? (color === "blue" ? "text-blue-700" : "text-amber-700") : "text-gray-700"}`}>
                          {v.nl_post_road_avg != null ? Number(v.nl_post_road_avg).toFixed(2) : "—"}
                        </div>
                      </div>
                    </div>
                    {growth != null && v.nl_post_road_years != null && v.nl_post_road_years >= 3 && (
                      <div className={`mt-3 text-center text-sm font-semibold ${growth > 0 ? "text-green-600" : "text-red-500"}`}>
                        {growth > 0 ? "+" : ""}{growth.toFixed(0)}%
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Chart */}
              <CompareNightLightChart
                dataA={dataA?.nightLights ?? []}
                dataB={dataB?.nightLights ?? []}
                nameA={tc(vA.village_name)}
                nameB={tc(vB.village_name)}
                roadYearA={vA.road_comp_year}
                roadYearB={vB.road_comp_year}
              />
            </div>
          )}

          {/* Key metrics */}
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-4">Key Metrics · Census 2011</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-2 pr-4 text-xs text-gray-400 font-semibold uppercase tracking-wide w-40">Metric</th>
                    <th className={`text-center py-2 px-3 text-xs font-bold text-blue-600`}>{tc(vA.village_name)}</th>
                    <th className={`text-center py-2 px-3 text-xs font-bold text-amber-600`}>{tc(vB.village_name)}</th>
                  </tr>
                </thead>
                <tbody>
                  <MetricRow label="Population"
                    valA={fmt(vA.population_2011)} valB={fmt(vB.population_2011)}
                    numA={vA.population_2011 ? Number(vA.population_2011) : null}
                    numB={vB.population_2011 ? Number(vB.population_2011) : null}
                    higherIsBetter={false}
                  />
                  <MetricRow label="Households"
                    valA={fmt(vA.households_2011)} valB={fmt(vB.households_2011)}
                    numA={vA.households_2011 ? Number(vA.households_2011) : null}
                    numB={vB.households_2011 ? Number(vB.households_2011) : null}
                    higherIsBetter={false}
                  />
                  <MetricRow label="Literacy rate"
                    valA={pct(vA.literacy_rate)} valB={pct(vB.literacy_rate)}
                    numA={vA.literacy_rate ? Number(vA.literacy_rate) : null}
                    numB={vB.literacy_rate ? Number(vB.literacy_rate) : null}
                  />
                  <MetricRow label="Est. monthly consumption"
                    valA={vA.est_consumption_monthly ? `₹${Math.round(Number(vA.est_consumption_monthly)).toLocaleString("en-IN")}` : "—"}
                    valB={vB.est_consumption_monthly ? `₹${Math.round(Number(vB.est_consumption_monthly)).toLocaleString("en-IN")}` : "—"}
                    numA={vA.est_consumption_monthly ? Number(vA.est_consumption_monthly) : null}
                    numB={vB.est_consumption_monthly ? Number(vB.est_consumption_monthly) : null}
                  />
                  <MetricRow label="Agri worker share"
                    valA={pct(vA.agri_worker_share)} valB={pct(vB.agri_worker_share)}
                    numA={vA.agri_worker_share ? Number(vA.agri_worker_share) : null}
                    numB={vB.agri_worker_share ? Number(vB.agri_worker_share) : null}
                    higherIsBetter={false}
                  />
                  <MetricRow label="Night light growth"
                    valA={nlGrowthA != null && vA.nl_post_road_years != null && vA.nl_post_road_years >= 3 ? `${nlGrowthA > 0 ? "+" : ""}${nlGrowthA.toFixed(0)}%` : "—"}
                    valB={nlGrowthB != null && vB.nl_post_road_years != null && vB.nl_post_road_years >= 3 ? `${nlGrowthB > 0 ? "+" : ""}${nlGrowthB.toFixed(0)}%` : "—"}
                    numA={vA.nl_post_road_years != null && vA.nl_post_road_years >= 3 ? nlGrowthA : null}
                    numB={vB.nl_post_road_years != null && vB.nl_post_road_years >= 3 ? nlGrowthB : null}
                  />
                </tbody>
              </table>
            </div>
          </div>

          {/* Amenities */}
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-4">Infrastructure · Census 2011</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-2 pr-4 text-xs text-gray-400 font-semibold uppercase tracking-wide w-40" />
                    <th className="text-center py-2 px-3 text-xs font-bold text-blue-600">{tc(vA.village_name)}</th>
                    <th className="text-center py-2 px-3 text-xs font-bold text-amber-600">{tc(vB.village_name)}</th>
                  </tr>
                </thead>
                <tbody>
                  <AmenityRow label="Primary school"        a={vA.has_primary_school}   b={vB.has_primary_school} />
                  <AmenityRow label="Middle school"         a={vA.has_middle_school}    b={vB.has_middle_school} />
                  <AmenityRow label="Secondary school"      a={vA.has_secondary_school} b={vB.has_secondary_school} />
                  <AmenityRow label="PHC / Sub-centre"      a={vA.has_phc}              b={vB.has_phc} />
                  <AmenityRow label="Hospital"              a={vA.has_hospital}         b={vB.has_hospital} />
                  <AmenityRow label="Commercial bank"       a={vA.has_bank}             b={vB.has_bank} />
                  <AmenityRow label="Post office"           a={vA.has_post_office}      b={vB.has_post_office} />
                  <AmenityRow label="Mobile coverage"       a={vA.has_mobile_coverage}  b={vB.has_mobile_coverage} />
                  <AmenityRow label="Internet access"       a={vA.has_internet}         b={vB.has_internet} />
                  <AmenityRow label="Tap water"             a={vA.has_tap_water}        b={vB.has_tap_water} />
                  <AmenityRow label="Domestic electricity"  a={vA.has_electricity_dom}  b={vB.has_electricity_dom} />
                </tbody>
              </table>
            </div>
          </div>

          {/* Links to individual village pages */}
          <div className="flex gap-3 pt-2 border-t border-gray-100">
            <Link href={`/village/${vA.slug}`} className="flex-1 text-center text-xs text-blue-600 hover:text-blue-800 py-2 border border-blue-100 rounded-lg hover:bg-blue-50 transition-colors">
              Full profile: {tc(vA.village_name)} →
            </Link>
            <Link href={`/village/${vB.slug}`} className="flex-1 text-center text-xs text-amber-600 hover:text-amber-800 py-2 border border-amber-100 rounded-lg hover:bg-amber-50 transition-colors">
              Full profile: {tc(vB.village_name)} →
            </Link>
          </div>

        </div>
      )}
    </div>
  );
}
