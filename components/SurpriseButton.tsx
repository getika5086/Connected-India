"use client";

import { useState } from "react";
import { trackEvent } from "@/lib/trackEvent";

export default function SurpriseButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  async function handleClick() {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch("/api/random");
      if (!res.ok) throw new Error("API error");
      const data = await res.json();
      if (!data.slug) throw new Error("No slug");
      trackEvent("surprise_me", { result_slug: data.slug });
      window.location.href = `/village/${data.slug}`;
    } catch {
      setError(true);
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <button
        onClick={handleClick}
        disabled={loading}
        className="inline-flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white font-semibold rounded-xl shadow-sm transition-colors text-base"
      >
        {loading ? (
          <>
            <span className="animate-spin inline-block">◌</span>
            Finding a village…
          </>
        ) : (
          <>
            <span>✦</span>
            Surprise me
          </>
        )}
      </button>
      {error && (
        <p className="text-xs text-red-500">Something went wrong — try again</p>
      )}
    </div>
  );
}
