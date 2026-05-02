"use client";

import { useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";

const DistrictYearChart = dynamic(() => import("./DistrictYearChart"), { ssr: false });

function tc(s: string) {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

interface Village {
  shrid: string;
  village_name: string;
  slug: string;
  road_comp_year: number | null;
  population_2011: number | null;
  nl_growth_pct: number | null;
}

interface YearEntry {
  year: number;
  count: number;
  villages: Village[];
}

interface Summary {
  district_name: string;
  state_name: string;
  total_villages: number;
  year_range: { from: number; to: number } | null;
  pct_with_school: number | null;
  pct_with_electricity: number | null;
  median_nl_growth_pct: number | null;
  villages_no_year: number;
}

export default function DistrictClient({
  summary,
  yearBreakdown,
}: {
  summary: Summary;
  yearBreakdown: YearEntry[];
}) {
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [showAll, setShowAll] = useState(false);

  const selectedEntry = yearBreakdown.find((y) => y.year === selectedYear);

  function handleYearClick(year: number) {
    setSelectedYear((prev) => (prev === year ? null : year));
    setShowAll(false);
  }

  const stateName  = summary.state_name.replace(/ /g, "-");
  const distSlug   = summary.district_name.replace(/ /g, "-");

  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="border-b border-gray-100 px-4 py-3 flex items-center gap-2 text-sm text-gray-500">
        <Link href="/" className="hover:text-gray-800">Connected India</Link>
        <span>/</span>
        <span>{tc(summary.state_name)}</span>
        <span>/</span>
        <span className="text-gray-900 font-medium">{tc(summary.district_name)}</span>
      </nav>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">

        {/* Header */}
        <section>
          <div className="text-sm text-gray-500 mb-1">{tc(summary.state_name)}</div>
          <h1 className="text-3xl font-bold text-gray-900">{tc(summary.district_name)} District</h1>
          <p className="text-gray-500 mt-2">
            {summary.total_villages.toLocaleString("en-IN")} villages connected under PMGSY
            {summary.year_range ? ` · ${summary.year_range.from}–${summary.year_range.to}` : ""}
          </p>
        </section>

        {/* Summary stat cards */}
        <section className="grid grid-cols-3 gap-3">
          <div className="bg-stone-50 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-gray-900">
              {summary.total_villages.toLocaleString("en-IN")}
            </div>
            <div className="text-xs text-gray-500 mt-1">villages connected</div>
          </div>
          <div className="bg-stone-50 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-gray-900">
              {summary.median_nl_growth_pct != null
                ? `${summary.median_nl_growth_pct > 0 ? "+" : ""}${summary.median_nl_growth_pct}%`
                : "—"}
            </div>
            <div className="text-xs text-gray-500 mt-1">median light growth after road</div>
          </div>
          <div className="bg-stone-50 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-gray-900">
              {summary.pct_with_electricity != null ? `${summary.pct_with_electricity}%` : "—"}
            </div>
            <div className="text-xs text-gray-500 mt-1">had electricity at connection</div>
          </div>
        </section>

        {/* Year chart */}
        <section>
          <h2 className="text-lg font-semibold text-gray-800 mb-1">
            Roads completed per year
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            Click a bar to see which villages were connected that year.
          </p>
          <DistrictYearChart
            data={yearBreakdown.map((y) => ({ year: y.year, count: y.count }))}
            selectedYear={selectedYear}
            onYearClick={handleYearClick}
          />
        </section>

        {/* Year detail — expandable village list */}
        {selectedEntry && (
          <section className="border border-green-200 rounded-xl p-5 bg-green-50 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-lg font-semibold text-gray-900">
                  {selectedEntry.year}
                </span>
                <span className="ml-2 text-gray-500 text-sm">
                  — {selectedEntry.count} villages connected
                </span>
              </div>
              <button
                onClick={() => setSelectedYear(null)}
                className="text-sm text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            {/* Village chips */}
            <div className="flex flex-wrap gap-2">
              {(showAll ? selectedEntry.villages : selectedEntry.villages.slice(0, 30)).map((v) => (
                <Link
                  key={v.shrid}
                  href={`/village/${v.slug}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-green-200 rounded-full text-sm text-gray-800 hover:border-green-500 hover:text-green-800 transition-colors"
                >
                  <span>{tc(v.village_name)}</span>
                  {v.population_2011 && (
                    <span className="text-gray-400 text-xs">
                      {Number(v.population_2011).toLocaleString("en-IN")}
                    </span>
                  )}
                </Link>
              ))}
            </div>

            {selectedEntry.villages.length > 30 && !showAll && (
              <button
                onClick={() => setShowAll(true)}
                className="text-sm text-green-700 underline"
              >
                Show all {selectedEntry.villages.length} villages
              </button>
            )}
          </section>
        )}

        {/* All years table — collapsed by default */}
        <section>
          <h2 className="text-lg font-semibold text-gray-800 mb-3">All years</h2>
          <div className="divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden">
            {yearBreakdown.map((entry) => (
              <button
                key={entry.year}
                className={`w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition-colors ${
                  selectedYear === entry.year ? "bg-green-50" : ""
                }`}
                onClick={() => handleYearClick(entry.year)}
              >
                <div className="flex items-center gap-4">
                  <span className="font-medium text-gray-900 w-10">{entry.year}</span>
                  <div className="h-2 bg-green-200 rounded-full" style={{ width: `${Math.max(16, (entry.count / Math.max(...yearBreakdown.map(y => y.count))) * 160)}px` }}>
                    <div className="h-full bg-green-500 rounded-full" style={{ width: "100%" }} />
                  </div>
                  <span className="text-sm text-gray-600">{entry.count} villages</span>
                </div>
                <span className="text-xs text-gray-400">
                  {selectedYear === entry.year ? "▲ selected" : "view ▼"}
                </span>
              </button>
            ))}
          </div>
        </section>

        <footer className="border-t border-gray-100 pt-4 text-xs text-gray-400">
          Data: SHRUG (devdatalab.org) · PMGSY OMMS · Census of India 2011
        </footer>
      </div>
    </div>
  );
}
