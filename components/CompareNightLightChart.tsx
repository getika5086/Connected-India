"use client";

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer, Legend,
} from "recharts";

interface NightLight { year: number; luminosity: number | null }

interface Props {
  dataA: NightLight[];
  dataB: NightLight[];
  nameA: string;
  nameB: string;
  roadYearA: number | null;
  roadYearB: number | null;
}

export default function CompareNightLightChart({ dataA, dataB, nameA, nameB, roadYearA, roadYearB }: Props) {
  // Merge both datasets by year
  const allYears = Array.from(
    new Set([...dataA.map((d) => d.year), ...dataB.map((d) => d.year)])
  ).sort((a, b) => a - b);

  const mapA = new Map(dataA.map((d) => [d.year, d.luminosity]));
  const mapB = new Map(dataB.map((d) => [d.year, d.luminosity]));

  const merged = allYears.map((year) => ({
    year,
    a: mapA.has(year) ? (mapA.get(year) != null ? Number(mapA.get(year)) : null) : null,
    b: mapB.has(year) ? (mapB.get(year) != null ? Number(mapB.get(year)) : null) : null,
  }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={merged} margin={{ top: 28, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="year" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} width={36} />
        <Tooltip
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          formatter={((v: any, name: any) => [Number(v).toFixed(3), name === "a" ? nameA : nameB]) as any}
          labelFormatter={(l) => `Year ${l}`}
        />
        <Legend
          formatter={(value) => (value === "a" ? nameA : nameB)}
        />
        {roadYearA && (
          <ReferenceLine
            x={roadYearA}
            stroke="#1d4ed8"
            strokeDasharray="4 2"
            strokeWidth={1.5}
            label={{ value: `${nameA} road`, position: "insideTopLeft", fontSize: 10, fill: "#1d4ed8" }}
          />
        )}
        {roadYearB && roadYearB !== roadYearA && (
          <ReferenceLine
            x={roadYearB}
            stroke="#b45309"
            strokeDasharray="4 2"
            strokeWidth={1.5}
            label={{ value: `${nameB} road`, position: "insideTopRight", fontSize: 10, fill: "#b45309" }}
          />
        )}
        <Line type="monotone" dataKey="a" name="a" stroke="#1d4ed8" strokeWidth={2} dot={false} connectNulls />
        <Line type="monotone" dataKey="b" name="b" stroke="#b45309" strokeWidth={2} dot={false} connectNulls />
      </LineChart>
    </ResponsiveContainer>
  );
}
