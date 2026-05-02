"use client";

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ReferenceArea, ResponsiveContainer, Legend,
} from "recharts";

interface NightLight { year: number; luminosity: number | null }

interface Props {
  data: NightLight[];
  roadYear: number | null;
  villageName: string;
  districtName: string;
}

export default function NightLightChart({ data, roadYear, villageName }: Props) {
  const formatted = data.map((d) => ({
    year: d.year,
    brightness: d.luminosity != null ? Number(d.luminosity) : null,
  }));

  return (
    <div className="space-y-3">
      {/* Extra top margin so the "Road connected" label isn't clipped */}
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={formatted} margin={{ top: 32, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="year" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} width={36} />
          <Tooltip
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          formatter={((v: any) => [Number(v).toFixed(3), "Brightness"]) as any}
            labelFormatter={(l) => `Year ${l}`}
          />
          <Legend />
          {roadYear && (
            <ReferenceLine
              x={roadYear}
              stroke="#16a34a"
              strokeWidth={2}
              label={{
                value: "Road connected",
                position: "insideTopRight",
                fontSize: 11,
                fill: "#16a34a",
                offset: 6,
              }}
            />
          )}
          {roadYear && (
            <ReferenceArea
              x1={roadYear + 1}
              x2={Math.min(roadYear + 5, 2013)}
              fill="#bbf7d0"
              fillOpacity={0.3}
            />
          )}
          <Line
            type="monotone"
            dataKey="brightness"
            name={villageName}
            stroke="#1d4ed8"
            strokeWidth={2}
            dot={false}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>

      {/* Plain-English explanation of the metric */}
      <div className="text-xs text-gray-500 leading-relaxed space-y-1">
        <p>
          <span className="font-medium text-gray-700">What is night light brightness?</span>{" "}
          NOAA satellites capture how much artificial light is visible from space each year.
          The number on the Y-axis (0–63 scale) measures the intensity of that light over
          the village — 0 means no detectable light, 63 is the brightest possible reading.
          It is used by researchers as a proxy for electricity access and economic activity,
          since more lit-up areas generally have more power use, commerce, and nightlife.
        </p>
        <p>
          The green shaded area marks the 5 years after the road arrived. Every village&apos;s
          story is different — some grew quickly, others are still on their way.
          Data source: DMSP/NOAA, 1994–2013.
        </p>
      </div>
    </div>
  );
}
