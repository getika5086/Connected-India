import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const result = await db.query(
      `SELECT slug FROM villages
       WHERE slug IS NOT NULL
         AND road_comp_year IS NOT NULL
         AND population_2011 IS NOT NULL
       ORDER BY RANDOM()
       LIMIT 1`
    );
    if (result.rows.length === 0) {
      return NextResponse.json({ error: "No villages found" }, { status: 404 });
    }
    return NextResponse.json({ slug: result.rows[0].slug });
  } catch (err) {
    console.error("Random village error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
