"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { trackEvent } from "@/lib/trackEvent";

interface SearchResult {
  village_name: string;
  district_name: string;
  state_name: string;
  slug: string;
  population_2011: number | null;
  road_comp_year: number | null;
}

export default function SearchBox() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        const results = data.results ?? [];
        setResults(results);
        setOpen(true);
        trackEvent("search_query", { query, results_count: results.length });
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
  }, [query]);

  function go(slug: string, position?: number) {
    trackEvent("search_click", { slug, query, position: position ?? 0 });
    setOpen(false);
    setQuery("");
    router.push(`/village/${slug}`);
  }

  function titleCase(s: string) {
    return s.replace(/\b\w/g, (c) => c.toUpperCase());
  }

  return (
    <div className="relative w-full max-w-xl">
      <div className="flex items-center border-2 border-gray-800 rounded-lg overflow-hidden bg-white shadow-md">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Type your village name..."
          className="flex-1 px-4 py-3 text-base outline-none"
          autoComplete="off"
          onKeyDown={(e) => {
            if (e.key === "Enter" && results.length > 0) go(results[0].slug, 0);
            if (e.key === "Escape") setOpen(false);
          }}
        />
        {loading && (
          <span className="px-3 text-gray-400 text-sm">...</span>
        )}
      </div>

      {open && results.length === 0 && query.length >= 2 && !loading && (
        <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg p-4 text-sm text-gray-500">
          No villages found for &ldquo;{query}&rdquo;. Try a district name like{" "}
          <button className="underline" onClick={() => setQuery("Varanasi")}>Varanasi</button> or{" "}
          <button className="underline" onClick={() => setQuery("Mysuru")}>Mysuru</button>.
        </div>
      )}

      {open && results.length > 0 && (
        <ul className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
          {results.map((r) => (
            <li key={r.slug} className="border-b border-gray-50 last:border-0">
              <button
                className="w-full text-left px-4 py-3 hover:bg-gray-50 flex justify-between items-start"
                onClick={() => go(r.slug, results.indexOf(r))}
              >
                <div>
                  <span className="font-medium">{titleCase(r.village_name)}</span>
                  <span className="text-gray-500 text-sm ml-2">
                    {titleCase(r.district_name)}, {titleCase(r.state_name)}
                  </span>
                </div>
                {r.road_comp_year && (
                  <span className="text-xs text-gray-400 mt-0.5 shrink-0">
                    Connected {r.road_comp_year}
                  </span>
                )}
              </button>
              <button
                className="w-full text-left px-4 pb-2 text-xs text-blue-500 hover:text-blue-700"
                onClick={() => {
                  setOpen(false);
                  router.push(`/district/${r.state_name.replace(/ /g, "-")}/${r.district_name.replace(/ /g, "-")}`);
                }}
              >
                View all villages in {titleCase(r.district_name)} district →
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
