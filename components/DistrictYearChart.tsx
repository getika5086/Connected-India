"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";

interface YearEntry { year: number; count: number }

interface Props {
  data: YearEntry[];
  selectedYear: number | null;
  onYearClick: (year: number) => void;
}

export default function DistrictYearChart({ data, selectedYear, onYearClick }: Props) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onClick={(e: any) => { if (e?.activePayload?.[0]) onYearClick(e.activePayload[0].payload.year); }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
        <XAxis dataKey="year" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} width={32} />
        <Tooltip
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          formatter={(v: any) => [v, "Villages connected"]}
          labelFormatter={(l) => `Year ${l}`}
          cursor={{ fill: "#f0fdf4" }}
        />
        <Bar dataKey="count" radius={[3, 3, 0, 0]}>
          {data.map((entry) => (
            <Cell
              key={entry.year}
              fill={entry.year === selectedYear ? "#15803d" : "#86efac"}
              cursor="pointer"
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
